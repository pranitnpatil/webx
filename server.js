/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 */
var UserRegistry = require('./user-registry.js');
var UserSession = require('./user-session.js');

// store global variables
var userRegistry = new UserRegistry();
var rooms = {};

var express = require('express');

// kurento required
var path = require('path');
var url = require('url');
var kurento = require('kurento-client');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const User_room = require('./static/models/userroom');

const MongoDBURI = process.env.MONGO_URI || 'mongodb://localhost/ManualAuth';

mongoose.connect(MongoDBURI, {
    useUnifiedTopology: true,
    useNewUrlParser: true
  });


const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
});



// Constants
var settings = {
    WEBSOCKETURL: "http://localhost:3005/",
    KURENTOURL: "ws://localhost:8888/kurento"
};

// Singleton Kurento Client, gets set on first interaction
var kurentoClient = null;
var totalUsers = 0;
var fs = require("fs");
var filePath = __dirname + "/chat-log.txt";

/*
 * Server startup
 */
var app = express();
var asUrl = url.parse(settings.WEBSOCKETURL);
var port = asUrl.port;
var server = app.listen(port, function () {
    console.log('Kurento Tutorial started');
    console.log('Open ' + url.format(asUrl) + ' with a WebRTC capable browser');
});

var io = require('socket.io')(server);


app.set("view-engine", 'ejs');
app.use(session({
    secret: 'work hard',
    resave: true,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: db
    })
  }));
  

app.use(express.urlencoded({extended:false}))


app.set('views', path.join(__dirname, '/static/views'));

const index = require('./static/routes/index');
app.use('/', index);


/**
 * Message handlers
 */
io.on('connection', function (socket) {
    var userList = '';
    for (var userId in userRegistry.usersById) {
        userList += ' ' + userId + ',';
    }
    console.log('receive new client : ' + socket.id + ' currently have : ' + userList);
    socket.emit('id', socket.id);

    socket.on('error', function (data) {
        console.log('Connection: ' + socket.id + ' error : ' + data);
        leaveRoom(socket.id, function () {

        });
    });

    socket.on('disconnect', function (data) {
        console.log('Connection: ' + socket.id + ' disconnect : ' + data);
        leaveRoom(socket.id, function () {
            var userSession = userRegistry.getById(socket.id);
            stop(userSession.id);
        });
    });

    socket.on('message', function (message) {
        console.log('Connection: ' + socket.id + ' receive message: ' + message.id);

        switch (message.id) {
            case 'register':
                console.log('registering ' + socket.id);
                register(socket, message.name, function(){

                });

                break;
            case 'joinRoom':
                console.log(socket.id + ' joinRoom : ' + message.roomName);
                joinRoom(socket, message.roomName, message.userName,message.videoflag,message.audioflag, function () {

                });
                break;
            case 'receiveVideoFrom':
                console.log(socket.id + ' receiveVideoFrom : ' + message.sender);
                receiveVideoFrom(socket, message.sender, message.sdpOffer, function () {

                });
                break;
            case 'leaveRoom':
                console.log(socket.id + ' leaveRoom');
                leaveRoom(socket.id);
                break;
            case 'call':
                console.log("Calling");
                call(socket.id, message.to, message.from);
                break;
            case 'onIceCandidate':
                addIceCandidate(socket, message);
                break;
            default:
                socket.emit({id: 'error', message: 'Invalid message ' + message});
        }
    });
});

/**
 * Register user to server
 * @param socket
 * @param name
 * @param callback
 */
function register(socket, name, callback){
    var userSession = new UserSession(socket.id, socket);
    userSession.name = name;
    userRegistry.register(userSession);
    userSession.sendMessage({
        id: 'registered',
        data: 'Successfully registered ' + socket.id
    });
    console.log(userRegistry);
}

/**
 * Gets and joins room
 * @param socket
 * @param roomName
 * @param callback
 */
function joinRoom(socket, roomName, userName, video,audio ,callback) {

   
    let c;
    User.findOne({}, (err, data) => {
      if(data){
        c = data.unique_id + 1;
		} else {
			c = 1;
		}

    let UserRoom = new User_room({
      unique_id: c,
      username: userName,
      roomname: roomName,
    });

    UserRoom.save((err, Person) => {
      if (err)
        console.log(err);
      else
        console.log('Success');
    });

  });

    getRoom(socket,roomName, function (error, room) {
        if (error) {
            callback(error)
        }
        join(socket, room, video, audio ,function (error, user) {
            console.log('join success : ' + user.id);
        });
    });
}

/**
 * Gets room. Creates room if room does not exist
 * @param roomName
 * @param callback
 */
function getRoom(socket,roomName, callback) {

    var room = rooms[roomName];

    if (room == null) {
        console.log('create new room : ' + roomName);
        socket.join(roomName, () => {
            getKurentoClient(function (error, kurentoClient) {
            if (error) {
                return callback(error);
            }
            

            // create pipeline for room
            kurentoClient.create('MediaPipeline', function (error, pipeline) {
                if (error) {
                    return callback(error);
                }

                room = {
                    name: roomName,
                    pipeline: pipeline,
                    participants: {}
                };
                rooms[roomName] = room;
                callback(null, room);
            });
        });

        })
        
    } else {
        console.log('get existing room : ' + roomName);
        socket.join(roomName);
        callback(null, room);
    }
}

/**
 * Join (conference) call room
 * @param socket
 * @param room
 * @param callback
 */
function join(socket, room, video, audio, callback) {
    // create user session
    var userSession = userRegistry.getById(socket.id);
    userSession.setRoomName(room.name);
    console.log(video)

    room.pipeline.create('WebRtcEndpoint', function (error, outgoingMedia) {
        if (error) {
            console.error('no participant in room');
            // no participants in room yet release pipeline
            if (Object.keys(room.participants).length == 0) {
                room.pipeline.release();
            }
            return callback(error);
        }
        outgoingMedia.setMaxVideoSendBandwidth(30);
        outgoingMedia.setMinVideoSendBandwidth(20);
        userSession.outgoingMedia = outgoingMedia;

        // add ice candidate the get sent before endpoint is established
        var iceCandidateQueue = userSession.iceCandidateQueue[socket.id];
        if (iceCandidateQueue) {
            while (iceCandidateQueue.length) {
                var message = iceCandidateQueue.shift();
                console.error('user : ' + userSession.id + ' collect candidate for outgoing media');
                userSession.outgoingMedia.addIceCandidate(message.candidate);
            }
        }

        userSession.outgoingMedia.on('OnIceCandidate', function (event) {
            console.log("generate outgoing candidate : " + userSession.id);
            var candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
            userSession.sendMessage({
                id: 'iceCandidate',
                sessionId: userSession.id,
                candidate: candidate
            });
        });

        // notify other user that new user is joining
        var usersInRoom = room.participants;
        var data = {
            id: 'newParticipantArrived',
            new_user_id: userSession.id,
            name:userSession.name,
            exist:existingUserIds,
        };

        // notify existing user
        for (var i in usersInRoom) {
            usersInRoom[i].sendMessage(data);
        }

        var existingUserIds = [];
        var existingUserName = [];
        for (var i in room.participants) {
            existingUserIds.push(usersInRoom[i].id);
            existingUserName.push(usersInRoom[i].name);
        }
        // send list of current user in the room to current participant
        userSession.sendMessage({
            id: 'existingParticipants',
            data: existingUserIds,
            name: existingUserName,
            audio: audio,
            video: video,
            roomName: room.name
        });

        userSession.sendMessage({
          id: "Share",
          data: existingUserIds,
          roomName: room.name,
        });

        socket.on("ShareScreen", function (data) {
          for (var i in room.participants) {
            if (i === data) {
              socket
                .to(userSession.roomName)
                .emit("message", { id: "receiveScreen", data: i });
              break;
            }
          }
          userSession.shareScreen(data);
        });

        socket.emit("login", {
        //   numUsers: totalUsers + 1,
          username: userSession.name,
          room: userSession.roomName,
        });

        socket.on("login", function (data) {
          console.log("in ogin");
        //   totalUsers++;
          totalUser = io.sockets.adapter.rooms[data.roomName].length;
          socket.username = userSession.name;
          socket.to(userSession.roomName).emit("number_user", {
            user_no:totalUser ,
          });
          
          console.log("There are " + totalUsers + " users now.");
          console.log(data.roomName)

          // echo to others that a person has connected
          socket.in(data.room).emit("user joined", {
            username: userSession.name,
            numUsers: totalUsers,
          });
        });

        
        
        

        // socket.emit('userSet', {username: userSession.name});

        //  socket.on('msg', function(data) {
        //     console.log("helo");
        //     console.log(room.name);
        //     io.in(userSession.roomName).emit('newmsg',data);
               
    
        //      });
        
        
     
        socket.on("stream", function (image) {
          socket.to(userSession.roomName).emit("streamL", image);
        });


        socket.on("new message", function (data) {
          // update username
          socket.username = userSession.name;

          // if message starts with sudo, treat it as JavaScript to be run on client side
          // better authentication needed for this feature, use this feature with caucious.
          if (data.msg.substring(0, 4) === "sudo") {
            io.in(userSession.roomName).emit("script", {
              script: data.msg.substring(4),
            });
          } else {
            // socket.broadcast.emit('new message', {//send to everybody but sender
            io.in(userSession.roomName).emit("new message", {
              //send to everybody including sender
              username: userSession.name,
              message: data.msg,
            });
          }

          // log the message in chat history file
          var chatMsg = userSession.name + ": " + data.msg + "\n";
          console.log(chatMsg);

          fs.appendFile(filePath, chatMsg, function (err) {
            if (err) {
              return console.log(err);
            }
            console.log("The message is saved!");
          });
        });

        socket.on("base64 file", function (msg) {
          console.log("received base64 file from" + msg.username);
          socket.username = msg.username;
          // socket.broadcast.emit('base64 image', //exclude sender
          io.in(userSession.roomName).emit(
            "base64 file",

            {
              username: userSession.name,
              file: msg.file,
              fileName: msg.fileName,
            }
          );
        });

        socket.on("disconnect", function () {
          totalUsers--;
          // echo globally that this client has left
          socket.in(userSession.roomName).emit("user left", {
            username: socket.username,
            numUsers: totalUsers,
          });
        });



       


        // register user to room
        room.participants[userSession.id] = userSession;

        callback(null, userSession);
    });
}

/**
 * Leave (conference) call room
 * @param sessionId
 * @param callback
 */
function leaveRoom(sessionId, callback) {
    var userSession = userRegistry.getById(sessionId);

    if (!userSession) {
        return;
    }

    var room = rooms[userSession.roomName];

    if(!room){
        return;
    }

    console.log('notify all user that ' + userSession.id + ' is leaving the room ' + room.name);
    var usersInRoom = room.participants;
    delete usersInRoom[userSession.id];
    userSession.outgoingMedia.release();
    // release incoming media for the leaving user
    for (var i in userSession.incomingMedia) {
        userSession.incomingMedia[i].release();
        delete userSession.incomingMedia[i];
    }

    var data = {
        id: 'participantLeft',
        sessionId: userSession.id
    };
    for (var i in usersInRoom) {
        var user = usersInRoom[i];
        // release viewer from this
        user.incomingMedia[userSession.id].release();
        delete user.incomingMedia[userSession.id];

        // notify all user in the room
        user.sendMessage(data);
    }

    delete userSession.roomName;
}

/**
 * Unregister user
 * @param sessionId
 */
function stop(sessionId) {
    userRegistry.unregister(sessionId);
}

/**
 * Invite other user to a (conference) call
 * @param callerId
 * @param to
 * @param from
 */
function call(callerId, to, from) {
    if(to === from){
        return;
    }
    var roomName;
    var caller = userRegistry.getById(callerId);
    var rejectCause = 'User ' + to + ' is not registered';
    if (userRegistry.getByName(to)) {
        var callee = userRegistry.getByName(to);
        if(!caller.roomName){
            roomName = generateUUID();
            joinRoom(caller.socket, roomName);
        }
        else{
            roomName = caller.roomName;
        }
        callee.peer = from;
        caller.peer = to;
        var message = {
            id: 'incomingCall',
            from: from,
            roomName: roomName
        };
        try{
            return callee.sendMessage(message);
        } catch(exception) {
            rejectCause = "Error " + exception;
        }
    }
    var message  = {
        id: 'callResponse',
        response: 'rejected: ',
        message: rejectCause
    };
    caller.sendMessage(message);
}

/**
 * Retrieve sdpOffer from other user, required for WebRTC calls
 * @param socket
 * @param senderId
 * @param sdpOffer
 * @param callback
 */
function receiveVideoFrom(socket, senderId, sdpOffer, callback) {
    var userSession = userRegistry.getById(socket.id);
    var sender = userRegistry.getById(senderId);

    getEndpointForUser(socket,userSession, sender, function (error, endpoint) {
        if (error) {
            callback(error);
        }

        endpoint.processOffer(sdpOffer, function (error, sdpAnswer) {
            console.log("process offer from : " + senderId + " to " + userSession.id);
            if (error) {
                return callback(error);
            }
            var data = {
                id: 'receiveVideoAnswer',
                sessionId: sender.id,
                sdpAnswer: sdpAnswer
            };
            userSession.sendMessage(data);

            endpoint.gatherCandidates(function (error) {
                if (error) {
                    return callback(error);
                }
            });
            return callback(null, sdpAnswer);
        });
    });
}

/**
 * Get user WebRTCEndPoint, Required for WebRTC calls
 * @param userSession
 * @param sender
 * @param callback
 */
function getEndpointForUser(socket,userSession, sender, callback) {
    // request for self media
    if (userSession.id === sender.id) {
        callback(null, userSession.outgoingMedia);
        return;
    }

    var incoming = userSession.incomingMedia[sender.id];
    if (incoming == null) {
        console.log('user : ' + userSession.id + ' create endpoint to receive video from : ' + sender.id);
        getRoom(socket,userSession.roomName, function (error, room) {
            if (error) {
                return callback(error);
            }

            room.pipeline.create('WebRtcEndpoint', function (error, incomingMedia) {
                if (error) {
                    // no participants in room yet release pipeline
                    if (Object.keys(room.participants).length == 0) {
                        room.pipeline.release();
                    }
                    return callback(error);
                }
                console.log('user : ' + userSession.id + ' successfully created pipeline');
                incomingMedia.setMaxVideoSendBandwidth(30);
                incomingMedia.setMinVideoSendBandwidth(20);
                userSession.incomingMedia[sender.id] = incomingMedia;

                // add ice candidate the get sent before endpoint is established
                var iceCandidateQueue = userSession.iceCandidateQueue[sender.id];
                if (iceCandidateQueue) {
                    while (iceCandidateQueue.length) {
                        var message = iceCandidateQueue.shift();
                        console.log('user : ' + userSession.id + ' collect candidate for : ' + message.data.sender);
                        incomingMedia.addIceCandidate(message.candidate);
                    }
                }

                incomingMedia.on('OnIceCandidate', function (event) {
                    console.log("generate incoming media candidate : " + userSession.id + " from " + sender.id);
                    var candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
                    userSession.sendMessage({
                        id: 'iceCandidate',
                        sessionId: sender.id,
                        candidate: candidate
                    });
                });
                sender.outgoingMedia.connect(incomingMedia, function (error) {
                    if (error) {
                        callback(error);
                    }
                    callback(null, incomingMedia);
                });

            });
        });
    } else {
        console.log('user : ' + userSession.id + ' get existing endpoint to receive video from : ' + sender.id);
        sender.outgoingMedia.connect(incoming, function (error) {
            if (error) {
                callback(error);
            }
            callback(null, incoming);
        });
    }
    
}

/**
 * Add ICE candidate, required for WebRTC calls
 * @param socket
 * @param message
 */
function addIceCandidate(socket, message) {
    var user = userRegistry.getById(socket.id);
    if (user != null) {
        // assign type to IceCandidate
        var candidate = kurento.register.complexTypes.IceCandidate(message.candidate);
        user.addIceCandidate(message, candidate);
    } else {
        console.error('ice candidate with no user receive : ' + socket.id);
    }
}

/**
 * Retrieve Kurento Client to connect to Kurento Media Server, required for WebRTC calls
 * @param callback
 * @returns {*}
 */
function getKurentoClient(callback) {
    if (kurentoClient !== null) {
        return callback(null, kurentoClient);
    }

    kurento(settings.KURENTOURL, function (error, _kurentoClient) {
        if (error) {
            var message = 'Coult not find media server at address ' + settings.KURENTOURL;
            return callback(message + ". Exiting with error " + error);
        }

        kurentoClient = _kurentoClient;
        callback(null, kurentoClient);
    });
}

/**
 * Generate unique ID, used for generating new rooms
 * @returns {string}
 */
function generateUUID(){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}
app.use(express.static(__dirname + '/static'));



