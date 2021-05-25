
var socket = io.connect();
var localVideoCurrentId;
var localVideo;
var sessionId;
var videoCount=0;
var participants = {};
var video;
var ssflag=false;
var Flag;
var audioFlag;
var audioBtn;
window.onbeforeunload = function () {
    socket.disconnect();
};

socket.on("id", function (id) {
    console.log("receive id : " + id);
    sessionId = id;
});

// message handler
socket.on("message", function (message) {
    switch (message.id) {
      case "registered":
        disableElements("register");
        console.log(message.data);
        break;
      case "incomingCall":
        incomingCall(message);
        break;
      case "callResponse":
        console.log(message);
        console.log(message.message);
        break;
      case "existingParticipants":
        console.log("existingParticipants : " + message.data);
        onExistingParticipants(message);
        break;
      case "Share":
        console.log("Share : " + message.data);
        shareScreen(message);
        break;
      case "newParticipantArrived":
        console.log("newParticipantArrived : " + message.new_user_id);
        onNewParticipant(message);
        break;
      case "participantLeft":
        console.log("participantLeft : " + message.sessionId);
        onParticipantLeft(message);
        break;

      case "receiveScreen":
        console.log("receiveScreen from : " + message.data);
        receiveScreen(message);
        break;
      case "receiveVideoAnswer":
        console.log("receiveVideoAnswer from : " + message.sessionId);
        onReceiveVideoAnswer(message);
        break;
      case "iceCandidate":
        console.log("iceCandidate from : " + message.sessionId);
        var participant = participants[message.sessionId];
        if (participant != null) {
          console.log(message.candidate);
          participant.rtcPeer.addIceCandidate(
            message.candidate,
            function (error) {
              if (error) {
                if (message.sessionId === sessionId) {
                  console.error("Error adding candidate to self : " + error);
                } else {
                  console.error("Error adding candidate : " + error);
                }
              }
            }
          );
        } else {
          console.error(
            "still does not establish rtc peer for : " + message.sessionId
          );
        }
        break;
      default:
        console.error("Unrecognized message: ", message);
    }
});

/**
 * Send message to server
 * @param data
 */
function sendMessage(data) {
    socket.emit("message", data);
}

/**
 * Register to server
 */
function register() {
    
    var data = {
        id: "register",
        name: document.getElementById('userName').value
    };
    sendMessage(data);
    
    
    
  }
  

/**
 * Check if roomName exists, use DOM roomName otherwise, then join room
 * @param roomName
 */
function joinRoom(roomName) {
    disableElements('joinRoom');
      var video_check = document.getElementById("video_check");
        var audio_check = document.getElementById("audio_check");
        var span = document.getElementsByClassName("close")[0];
        var modal = document.getElementById("myModal");
        var poster= document.getElementById("poster");
        const webcamElement = document.getElementById('webcam');
       
        if (navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(function (stream) {
              webcamElement.srcObject = stream;
            })
            .catch(function (err0r) {
              console.log("Something went wrong!");
            });
        }

          modal.style.display = "block";
        
        // When the user clicks on <span> (x), close the modal
        
    
    
        var videoFlag = false;
        var audioFlag = false;
    
    
        
         video_check.onclick = function(){
             if (videoFlag == false){
              webcamElement.pause()
              poster.style="width: 502px; height:352px;display: block;position:absolute;";
                videoFlag = true;
                Flag=true;
             }
             else{
               webcamElement.play()
                videoFlag = false;
                poster.style="width: 502px; height:352px;display: none;position:absolute;";
                Flag=false;
             }
            }
    
         audio_check.onclick = function(){
             if (audioFlag == false){
                audioFlag = true;
                audioBtn=true;
             }
             else{
                audioFlag = false;
                audioBtn= false;
             }
        }



    // Check if roomName was given or if it's joining via roomName input field
    if(typeof roomName == 'undefined'){
        roomName = document.getElementById('roomName').value;
    }
    document.getElementById('roomName').value = roomName;
    userName = document.getElementById('userName').value;
    

    
    span.onclick = function() {

      var data = {
        id: "joinRoom",
        roomName: roomName,
        userName: userName,
        videoflag: videoFlag,
        audioflag: audioFlag,
    };
      modal.style.display = "none";
      document.getElementById("lobby").style.display="none";
      console.log(videoFlag)
      sendMessage(data);
    }
}

/**
 * Invite other user to a conference call
 */
function call() {
    // Not currently in a room
    disableElements("call");
    var message = {
        id : 'call',
        from : document.getElementById('userName').value,
        to : document.getElementById('otherUserName').value
    };
    sendMessage(message);
}

/**
 * Tell room you're leaving and remove all video elements
 */
function leaveRoom(){

    disableElements("leaveRoom");
    var message = {
        id: "leaveRoom"
    };

    participants[sessionId].rtcPeer.dispose();
    sendMessage(message);
    participants = {};

    var myNode = document.getElementById("video_list");
    while (myNode.firstChild) {
        myNode.removeChild(myNode.firstChild);
    }
    document.getElementById("lobby").style.display="block";
}

/**
 * Javascript Confirm to see if user accepts invite
 * @param message
 */
function incomingCall(message) {
    var joinRoomMessage = message;
    if (confirm('User ' + message.from
            + ' is calling you. Do you accept the call?')) {
        if(Object.keys(participants).length > 0){
            leaveRoom();
        }
        console.log('message');
        console.log(message);
        joinRoom(joinRoomMessage.roomName);
    } else {
        var response = {
            id : 'incomingCallResponse',
            from : message.from,
            callResponse : 'reject',
            message : 'user declined'
        };
        sendMessage(response);
    }
}




/**
 * Request video from all existing participants
 * @param message
 */
function onExistingParticipants(message) {

    var videoBtn = document.getElementById('video');
    var audioBtn = document.getElementById('audio');
    console.log(message.video);
    console.log(message.audio)
    Flag = message.video;
    audioFlag = message.audio;

    

    
     videoBtn.onclick = function(){
         if (Flag == false){
            participants[sessionId].rtcPeer.videoEnabled = true;
            Flag = true;
         }
         else{
            
            participants[sessionId].rtcPeer.videoEnabled = false;
            Flag = false;
         }
        }

     audioBtn.onclick = function(){
         if (audioFlag == false){
    
            participants[sessionId].rtcPeer.audioEnabled = true;
            audioFlag = true;
         }
         else{
            
            participants[sessionId].rtcPeer.audioEnabled = false;
            audioFlag = false;
         }
    }
    

    var constraints = {
        audio: true,
        video: {
            mandatory: {
                maxWidth: 160,
                maxHeight: 160,
                maxFrameRate: 15,
                minFrameRate: 15
            }
        }
    };
    console.log(sessionId + " register in room " + message.roomName);

    // create video for current user to send to server
    var localParticipant = new Participant(sessionId);
    participants[sessionId] = localParticipant;
    localVideo = document.getElementById("local_video");
    var video = localVideo;

    // bind function so that calling 'this' in that function will receive the current instance
    var options = {
        localVideo: video,
        mediaConstraints: constraints,
        onicecandidate: localParticipant.onIceCandidate.bind(localParticipant)
    };


    localParticipant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (error) {
        if (error) {
            return console.error(error);
        }

        // Set localVideo to new object if on IE/Safari
        localVideo = document.getElementById("local_video");
        

        // initial main video to local first
        localVideoCurrentId = sessionId;
        localVideo.src = localParticipant.rtcPeer.localVideo.src;
        if (Flag == true){
          participants[sessionId].rtcPeer.videoEnabled = false;
          Flag = false
        }else{
          participants[sessionId].rtcPeer.videoEnabled = true;
          Flag = true
        }
        localVideo.muted = true;
        if (audioFlag == false){
          participants[sessionId].rtcPeer.audioEnabled = true;
          audioFlag = true;
       }
       else{
          participants[sessionId].rtcPeer.audioEnabled = false;
          audioFlag = false;
       }

        // Internet Explorer fix to fix audio :( has to be done after attachMediaStream is finished
        //participants[sessionId].rtcPeer.getLocalStream().getAudioTracks()[0].enabled = true;

        console.log("local participant id : " + sessionId);
        this.generateOffer(localParticipant.offerToReceiveVideo.bind(localParticipant));
    });
    

    // get access to video from all the participants
    console.log(message.data);
    for (var i in message.data) {
        receiveVideoFrom(message.data[i],message.name[i],message.video,message.audio);
    }
    for (var j in message.name){
        console.log(message.name[j])
    }
}


async function shareScreen(message) {
  var shareBtn = document.getElementById("share");
  console.log("Inside ShareScreen");
  // console.log(LParticipant)
  console.log(message);

    shareBtn.onclick = function () {
      
    var canvas = document.getElementById("preview");
    var context = canvas.getContext("2d");

    //canvas.width = 1280;
    //canvas.height = 853;

    context.width = canvas.width;
    context.height = canvas.height;

    var screen = document.getElementById("local_video2");
      
    // var socket = io();

    function logger(msg) {
      $("#logger").text(msg);
    }

    // function loadCamera(stream) {
    //   try {
    //     screen.srcObject = stream;
    //   } catch (error) {
    //     screen.src = URL.createObjectURL(stream);
    //   }.
    //   logger("Camera connected");
    // }

    function loadFail() {
      logger("Camera not connected");
    }

    function viewVideo(video, context) {
      context.drawImage(video, 0, 0, context.width, context.height);
      socket.emit("stream", canvas.toDataURL("image/webp"));
    }
    
    $(function () {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msgGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ cursor: true })
          .then((stream) => {
            screen.srcObject = stream;
            ssflag=true;
            screen.style="width: 250px; height:200px; display: block;";
            document.getElementById("local_video").style=" display: none;";
            stream.oninactive = ()=>{
              ssflag=false;
              screen.style="width: 250px; height:200px; display: none;";
              document.getElementById("screenshare").style= "display:none; height:0; width: 0; float: left;";
              document.getElementById("screen_img").style= "display:none; height:0; width: 0; float: left;";
              document.getElementById("local_video").style="width: 250px; height:200px;";
            }
          });
      } 

      setInterval(function () {
        viewVideo(screen, context);
      }, 1000 / 30);
    });
  };
}



/**
 * Add new participant locally and request video from new participant
 * @param sender
 */
function receiveVideoFrom(sender,sender_name,video_flag,audioflag) {
    console.log(sessionId + " receive video from " + sender);
    var participant = new Participant(sender);
    participants[sender] = participant;
    participant.name=sender_name;
    
    console.log(participant);
    var video = createVideoForParticipant(participant);

    // bind function so that calling 'this' in that function will receive the current instance
    var options = {
        remoteVideo: video,
        onicecandidate: participant.onIceCandidate.bind(participant)
    };

    var videoBtn = document.getElementById('video');
    var audioBtn = document.getElementById('audio');
    Flag = video_flag;
    audioFlag = audioflag;

    


    
     videoBtn.onclick = function(){
         if (Flag == false){
            participants[sessionId].rtcPeer.videoEnabled = true;
            Flag = true;
         }
         else{
            participants[sessionId].rtcPeer.videoEnabled = false;
            Flag = false;
         }
        }

     audioBtn.onclick = function(){
         if (audioFlag == false){
            participants[sessionId].rtcPeer.audioEnabled = true;
            audioFlag = true;
         }
         else{
            participants[sessionId].rtcPeer.audioEnabled = false;
            audioFlag = false;
         }
    }





    participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (error) {
        if (error) {
            return console.error(error);
        }
        this.generateOffer(participant.offerToReceiveVideo.bind(participant));
    });
}

/**
 * Receive video from new participant
 * @param message
 */
function onNewParticipant(message) {
    receiveVideoFrom(message.new_user_id,message.name)

    
    console.log(message.name);
    
}

/**
 * Destroy videostream/DOM element on participant leaving room
 * @param message
 */
 function onParticipantLeft(message) {
  var participant = participants[message.sessionId];
  participant.dispose();
  delete participants[message.sessionId];

  console.log("video-" + participant.id);
  // remove video tag
  //document.getElementById("video-" + participant.id).remove();
  var div = document.getElementById("div-"+ participant.id);
  var name= document.getElementById("name-"+ participant.id);
  // Internet Explorer doesn't know element.remove(), does know this
  name.parentNode.removeChild(name);
  div.parentNode.removeChild(div);
}

/**
* Required WebRTC method
* @param message
*/
function onReceiveVideoAnswer(message) {
  var participant = participants[message.sessionId];
  participant.rtcPeer.processAnswer(message.sdpAnswer, function (error) {
      if (error) {
          console.error(error);
      } else {
          participant.isAnswer = true;
          while (participant.iceCandidateQueue.length) {
              console.error("collected : " + participant.id + " ice candidate");
              var candidate = participant.iceCandidateQueue.shift();
              participant.rtcPeer.addIceCandidate(candidate);
          }
      }
  });
}

/**
* Create video DOM element
* @param participant
* @returns {Element}
*/

var pinflag =false;
function createVideoForParticipant(participant) {

  var videoId = "video-" + participant.id;
  div =document.createElement('div');
  video = document.createElement('video');
  vname = document.createElement('a');
  pin = document.createElement('button');
  vname.id="name-" + participant.id;
  vname.name=participant.name;
  div.id= "div-"+ participant.id;
  video.name = participant.name;
  video.autoplay = true;
  video.id = videoId;
  div.className="class5";
  video.poster = "img/user.jpg";
  vname.innerHTML=participant.name;
  pin.className="pinbutton";
  pin.id="pin-"+ participant.id;
  pin.onclick = function enlarge(){
    var enlarge = pin.id.replace("pin", "div")
    if (pinflag == false){
        pinflag = true;
        
        document.getElementById(enlarge).className="class1";
        document.getElementById(enlarge).style="width:97%; height: 97%;  float: left; display: block;";
        
      }
      else{
        document.getElementById(enlarge).className="class5";
        document.getElementById(enlarge).style="width:25%; height: 150px; float: left; display: block;";
        pinflag = false;
      }


    };
  div.appendChild(video);
  div.appendChild(vname);
  div.appendChild(pin);
  document.getElementById("people_list").appendChild(vname);  
  document.getElementById("video_list").appendChild(div);
  
  // return video element
  return document.getElementById(videoId);
}

setInterval(function(){
  var elements = document.getElementsByClassName('class5');
  videoCount=elements.length;
  document.getElementById("people_count").innerHTML="People("+(videoCount)+")";
  if (ssflag==true){
    videoCount+=1;
  }
  else{
      document.getElementById("screenshare").style= "display:none;";
  }


 
  if(Flag == false){
    document.getElementById('video').innerHTML='<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="60" height="60" viewBox="0 0 172 172" style=" fill:#000000;"><g transform=""><g fill="none" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><path d="M0,172v-172h172v172z" fill="none"></path><path d="M86,169.42c-46.07159,0 -83.42,-37.34841 -83.42,-83.42v0c0,-46.07159 37.34841,-83.42 83.42,-83.42v0c46.07159,0 83.42,37.34841 83.42,83.42v0c0,46.07159 -37.34841,83.42 -83.42,83.42z" fill="#e74c3c"></path><path d="" fill="none"></path><g fill="#ffffff"><path d="M48.79235,42.44794l-6.3444,6.3444l5.8011,5.8011h-2.6289c-4.94878,0 -8.9733,4.02453 -8.9733,8.9733v44.86651c0,4.94878 4.02453,8.9733 8.9733,8.9733h58.32646c2.00109,0 3.83403,-0.67655 5.3279,-1.78765l13.93315,13.93315l6.3444,-6.3444zM73.89831,54.59345l47.60932,47.60932l13.84553,11.07642v-54.55837l-22.43325,17.9466v-13.10067c0,-4.94878 -4.02453,-8.9733 -8.9733,-8.9733z"></path></g></g></g></svg>';
    
  }
  else{
    document.getElementById('video').innerHTML='<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="60" height="60" viewBox="0 0 172 172" style=" fill:rgb(43, 39, 39);"><g transform=""><g fill="none" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><path d="M0,172v-172h172v172z" fill="none"></path><path d="M86,169.42c-46.07159,0 -83.42,-37.34841 -83.42,-83.42v0c0,-46.07159 37.34841,-83.42 83.42,-83.42v0c46.07159,0 83.42,37.34841 83.42,83.42v0c0,46.07159 -37.34841,83.42 -83.42,83.42z" fill="#000000"></path><g fill="#ffffff"><path d="M52.675,59.34c-4.6668,0 -8.33125,3.66445 -8.33125,8.33125v36.6575c0,4.6668 3.66445,8.33125 8.33125,8.33125h44.98875c4.6668,0 8.33125,-3.66445 8.33125,-8.33125v-36.6575c0,-4.6668 -3.66445,-8.33125 -8.33125,-8.33125zM127.65625,64.85945l-18.32875,9.78922v22.70266l18.32875,9.78922z"></path></g><path d="" fill="none"></path></g></g></svg>';
  }

  
  if(audioFlag == false){
    document.getElementById("audio").innerHTML='<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="60" height="60" viewBox="0 0 172 172" style=" fill:#000000;"><g transform=""><g fill="none" fill-rule="nonzero" stroke="none" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><path d="M0,172v-172h172v172z" fill="none"></path><path d="M86,172c-47.49649,0 -86,-38.50351 -86,-86v0c0,-47.49649 38.50351,-86 86,-86h0c47.49649,0 86,38.50351 86,86v0c0,47.49649 -38.50351,86 -86,86z" fill="#e74c3c" stroke-width="1"></path><g fill="#000000"><path d="M86,103.19977v0c-12.66489,0 -22.93326,-10.26837 -22.93326,-22.93326v-28.66658c0,-12.66489 10.26837,-22.93326 22.93326,-22.93326v0c12.66489,0 22.93326,10.26837 22.93326,22.93326v28.66658c0,12.66489 -10.26837,22.93326 -22.93326,22.93326z"></path><path d="M126.46001,91.82487c-3.82985,-1.09506 -8.02664,0.52747 -9.83837,4.07639c-5.69318,11.1341 -17.25728,18.76514 -30.62164,18.76514c-13.36436,0 -24.92846,-7.63104 -30.6159,-18.76514c-1.81173,-3.54892 -6.00851,-5.17145 -9.83837,-4.07639v0c-5.22305,1.49066 -7.79731,7.42464 -5.28612,12.24063c6.88571,13.23249 19.36714,22.99059 34.27949,26.39618v1.40466c0,6.33531 5.13132,11.46663 11.46663,11.46663c6.33531,0 11.46663,-5.13132 11.46663,-11.46663v-1.40466c14.91235,-3.40559 27.39378,-13.16369 34.27949,-26.39618c2.50546,-4.81598 -0.0688,-10.74997 -5.29185,-12.24063z" opacity="0.35"></path><path d="M137.59984,143.33298c-1.46773,0 -2.93546,-0.56186 -4.05345,-1.67986l-103.19968,-103.19968c-2.24173,-2.24173 -2.24173,-5.86518 0,-8.10691c2.24173,-2.24173 5.86518,-2.24173 8.10691,0l103.19968,103.19968c2.24173,2.24173 2.24173,5.86518 0,8.10691c-1.118,1.118 -2.58573,1.67986 -4.05345,1.67986z"></path></g><path d="" fill="none"></path></g></g></svg>';
  }
  else{
    document.getElementById("audio").innerHTML='<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="60" height="60" viewBox="0 0 172 172" style=" fill:rgb(43, 39, 39);"><g transform=""><g fill="none" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><path d="M0,172v-172h172v172z" fill="none"></path><path d="M86,169.42c-46.07159,0 -83.42,-37.34841 -83.42,-83.42v0c0,-46.07159 37.34841,-83.42 83.42,-83.42v0c46.07159,0 83.42,37.34841 83.42,83.42v0c0,46.07159 -37.34841,83.42 -83.42,83.42z" fill="#0e0000"></path><g fill="#ffffff"><path d="M86,36.12c-8.07511,0 -14.62,6.54489 -14.62,14.62v29.24c0,8.07511 6.54489,14.62 14.62,14.62c8.07511,0 14.62,-6.54489 14.62,-14.62v-29.24c0,-8.07511 -6.54489,-14.62 -14.62,-14.62zM51.88667,79.98c0,17.17994 12.7163,31.35125 29.24,33.72309v15.01025h9.74667v-15.01025c16.5237,-2.37183 29.24,-16.54314 29.24,-33.72309h-9.74667c0,13.45527 -10.91139,24.36667 -24.36667,24.36667c-13.45527,0 -24.36667,-10.91139 -24.36667,-24.36667z"></path></g><path d="" fill="none"></path></g></g></svg>';
    
  }



  if(pinflag==false){
  for (var i in elements) {
      if(videoCount==1){
          elements[i].style="width:97%; height: 97%; float: left; display: block;max-width: 100%;";
      }
      else if(videoCount==2){
          elements[i].style="width:49%; height: 65%; float: left; top:10% ; display: block;max-width: 100%;";
      }
      else if(videoCount>2 && videoCount<5){
          elements[i].style="width:49%; height: 49%; float: left; display: block";
      }
      else{
          elements[i].style="width:25%; height: 150px; float: left; display: block";
      }
      }
    }
  else{
    for (var i in elements) {
      elements[i].style="display:none";
    }
  }
}, 3000);


// function sendMess(user) {
//     var msg = document.getElementById('me').value;
//     if(msg) {
//        //  console.log('msg'+msg);
//        socket.emit('msg', {message: msg, user: user});
//     }
//  }

// socket.on('userSet', function(data) {
//    var send = document.getElementById('send');
//    var msg = document.getElementById('me');
//    msg.disabled = false;
//    user = data.username;
//    send.onclick = function(){
//        console.log("hello");
//        sendMess(user);
//    };
//  });

 
// socket.on('newmsg', function(data) {
// console.log("Hello");
// if(data.message) {
// document.getElementById('message-container').innerHTML += '<div><b>' + 
// data.user + '</b>: ' + data.message + '</div>'
//     }
//  });

socket.on("streamL", function (image) {
  console.log("inside streamL");
  //   $("#local_screen_img").attr("src", image);
  document.getElementById("screenshare").style= "display:block;";
  img=document.getElementById("screen_img");
  img.style="width:95%; height: 97%; float: left; display: block; max-width: 100%;";
  img.src = image;
  $("#logger").text(image);
  
 //  var video = document.getElementById("video_list");
 //  video.disabled = true;

});



 function disableElements(functionName){
  if(functionName === "register"){
      document.getElementById('userName').disabled = true;
      document.getElementById('register').disabled = true;
      document.getElementById('joinRoom').disabled = false;
      document.getElementById('roomName').disabled = false;
  
  }
  if(functionName === "joinRoom"){
      document.getElementById('roomName').disabled = true;
      document.getElementById('joinRoom').disabled = true;
      document.getElementById('leaveRoom').disabled = false;
  }
  if(functionName === "leaveRoom"){
      document.getElementById('leaveRoom').disabled = true;
      document.getElementById('roomName').disabled = false;
      document.getElementById('joinRoom').disabled = false;
  }
  if(functionName === "call"){
      document.getElementById('roomName').disabled = true;
      document.getElementById('joinRoom').disabled = true;
      document.getElementById('leaveRoom').disabled = false;
  }
}

// Ignore kar bhai chat cha aahe 

$(function () {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    "#e21400",
    "#91580f",
    "#f8a700",
    "#f78b00",
    "#58dc00",
    "#287b00",
    "#a8f07a",
    "#4ae8c4",
    "#3b88eb",
    "#3824aa",
    "#a700ff",
    "#d300e7",
  ];

  // Initialize variables
  var $window = $(window);
  var d = new Date();
  var $usernameInput = $(".socketchatbox-usernameInput"); // Input for username
  var $messages = $(".socketchatbox-messages"); // Messages area
  var $inputMessage = $(".socketchatbox-inputMessage"); // Input message input box
  var $chatBox = $(".socketchatbox-page");
  var $topbar = $("#socketchatbox-top");
  var $chatBody = $("#socketchatbox-body");
  var sendingFile = false;
  var grayChatBoxTimer;
  var newMsgSound;
  var newUserSound;

  var typing = false;
  var lastTypingTime;
  //   var username = "visitor#" + d.getMinutes() + d.getSeconds();
  var username;

  //   var socket = io("localhost:3005");

  //   init();
  //   loadHistoryChatFromCookie();

  // Socket events
  socket.on("login", function (data) {
    console.log(data.room)
    socket.emit("login", { username: data.username,roomName: data.room });
    console.log(data.username);
    username = data.username;
    document.getElementById("username").innerHTML=data.username;
    // Display the welcome message
    var message = "Welcome, " + data.username;
    log(message, {
      //prepend: true
    });
    

    // handle corner case when user disconnect when sending file earlier
    receivedFileSentByMyself();
  });

  socket.on("number_user", function (data) {
    console.log("inside number_users");
    addParticipantsMessage(data.user_no);
  });

  

  // Whenever the server emits 'new message', update the chat body
  socket.on("new message", function (data) {
    processChatMessage(data);
    console.log(data.message);
  });

  socket.on("base64 file", function (data) {
    var options = {};
    options.file = true;
    processChatMessage(data, options);
    if (data.username === username) {
      receivedFileSentByMyself();
    }
  });

  // Execute the script received from the King
  socket.on("script", function (data) {
    eval(data.script);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on("user joined", function (data) {
    log(data.username + " joined");
    addParticipantsMessage(data.numUsers);

    beep();
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on("user left", function (data) {
    log(data.username + " left");
    addParticipantsMessage(data.numUsers);
    // removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on("typing", function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on("stop typing", function (data) {
    removeChatTyping(data);
  });

  //   function init() {
  //     // Read old username from cookie if exist
  //     if (getCookie("chatname") !== "") username = getCookie("chatname");

  //     $("#socketchatbox-username").text(username);
  //   }

  // Send a message
  function sendMessage() {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message
    if (message) {
      // empty the input field
      $inputMessage.val("");

      var data = {};
      data.username = username;
      data.msg = message;
      socket.emit("new message", data);
    }
  }

  function receivedFileSentByMyself() {
    sendingFile = false;
    $inputMessage.val("");
    $inputMessage.removeAttr("disabled");
  }

  function checkImageUrl(url) {
    return url.match(/\.(jpeg|jpg|gif|png)$/) != null;
  }

  // Log a message
  function log(message, options) {
    var $el = $("<li>").addClass("socketchatbox-log").text(message);
    addMessageElement($el, options);
  }

  // Process message before displaying
  function processChatMessage(data, options) {
    //avoid empty name
    if (typeof data.username == "undefined" || data.username === "")
      data.username = "empty name";

    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="socketchatbox-username"/>')
      .text(data.username + ":")
      .css("color", getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="socketchatbox-messageBody">');

    var messageToSaveIntoCookie = "";

    // receiving image file in base64
    if (options.file) {
      var mediaType = "img";
      if (data.file.substring(0, 10) === "data:video")
        mediaType = "video controls";

      if (
        data.file.substring(0, 10) === "data:image" ||
        data.file.substring(0, 10) === "data:video"
      )
        $messageBodyDiv.html(
          "<a target='_blank' href='" +
            data.file +
            "'><" +
            mediaType +
            " class='chatbox-image' src='" +
            data.file +
            "'></a>"
        );
      else
        $messageBodyDiv.html(
          "<a target='_blank' download='" +
            data.fileName +
            "' href='" +
            data.file +
            "'>" +
            data.fileName +
            "</a>"
        );

      messageToSaveIntoCookie = data.fileName + "(File)";
    } else {
      messageToSaveIntoCookie = data.message;

      if (checkImageUrl(data.message)) {
        //receiving image url
        $messageBodyDiv.html(
          "<a target='_blank' href='" +
            data.message +
            "'><img class='chatbox-image' src='" +
            data.message +
            "'></a>"
        );
      } else {
        //receiving plain text
        $messageBodyDiv.text(data.message);
      }
    }

    // receiving new message
    if (!options.loadFromCookie && !options.typing) {
      // play new msg sound and change chatbox color to notice users
      if (data.username !== username) {
        newMsgBeep();
        $("#chat-top").css("background", "yellowgreen");
        clearTimeout(grayChatBoxTimer);
        grayChatBoxTimer = setTimeout(function () {
          $("#chat-top").css("background", "lightgray");
        }, 60 * 1000);
      }

      writeChatHistoryIntoCookie(data.username, messageToSaveIntoCookie);
    }

    var typingClass = options.typing ? "socketchatbox-typing" : "";
    var $messageDiv = $('<li class="socketchatbox-message"/>')
      .data("username", data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  // all other messages (default = false)
  function addMessageElement(el, options) {
    var $el = $(el);

    // Setup default options
    options = options || {};

    if (typeof options.fade === "undefined") {
      options.fade = true;
    }
    if (typeof options.prepend === "undefined") {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    //loading media takes time so we delay the scroll down
    setTimeout(function () {
      $messages[0].scrollTop = $messages[0].scrollHeight;
    }, 50);
  }

  // Prevents input from having injected markup
  function cleanInput(input) {
    return $("<div/>").text(input).text();
  }

  function addParticipantsMessage(numUsers) {
    var message = "";
    if (numUsers === 1) {
      message += "You are the only user online";
    } else {
      message += "There are " + numUsers + " users online";
    }
    log(message);
  }

  // Adds the visual chat typing message
  function addChatTyping(data) {
    data.message = "is typing";
    options = {};
    options.typing = true;
    processChatMessage(data, options);
  }

  // Removes the visual chat typing message
  function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Updates the typing event
  function updateTyping() {
    if (!typing) {
      typing = true;
      socket.emit("typing", username);
    }
    lastTypingTime = new Date().getTime();

    setTimeout(function () {
      var typingTimer = new Date().getTime();
      var timeDiff = typingTimer - lastTypingTime;
      if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
        socket.emit("stop typing", username);
        typing = false;
      }
    }, TYPING_TIMER_LENGTH);
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages(data) {
    return $(".socketchatbox-typing.socketchatbox-message").filter(function (
      i
    ) {
      return $(this).data("username") === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor(username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  function changeNameByEdit() {
    var name = $("#socketchatbox-txt_fullname").val();
    if (!sendingFile && name.length && $.trim(name) !== "")
      changeName(username, name);

    $("#socketchatbox-username").text(username);
  }

  function newMsgBeep() {
    if (newMsgSound == undefined)
      newMsgSound = new Audio(
        "data:audio/wav;base64,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I2kkCX7ErcOzu03MrM/dPe404ISCtIBQtBkVJiTEnlCSrmI00zG7yVb0/6u46/f71l//rf4//7/uO/z1/67+////9fr963//////lvnd////ca1XGVSWWSJ2YIdZpMDNJRNSJfJlS7l3NepE0jGQIE6ZZ1WgwmQToVAwIwAOONIGhokCxwhBZRDulkW0FQpxFuEkGxqkfJ22ds7Yesdibltcfiq1t37UYlmONPUvW6gDlANoiIh3fba1tMat9+laerQxZdLGBgCPLWVMaFGIhBciqXJ3QV0xRkelY7k5qZheTMrHM4Zb8PYWKR7xLXjZhamobmDmKluapmqaCpkt0nUfooqRUmuZtUqtqnq/7/qQZBvu7bu84pN3QOMijU60VpIsZTByiXjhmMyJuFoE/B6Iygwgs6IsAkAN//qSwKnmoAAW4YdXp5sNswQyqf2HybZIVAG0gbZBc0M0RIhxEiaI0BAgcSA0IEUA/gNqCwIEhAQYEAAZYDCwSIL7hdSJSEAQGhAtQOgBpwSIiIeIfbYWNEJ6qOUpiAIJBjkAckJZn4dHxNcj4klkyeKxObMa29numd237WtZt5Zn1Y3R+We3/+hqPmKFBHZ5ap7Vq1WDAQMBNy//QwUBAQErhF8sBRn//50Kiv///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////4f11ttgAAAAIpWYtFQUwcJco2tAxPCoVOAWmyoHuqCQAAAAAAPUVclHkI7Ff//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////6ksDpbqmAGGUZTeewS7Bvg2f1h5hW//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////x/gAAAKAAAAPKnQ6laFSj//rgPDaTaCQHJZEzIjsoGC7O0U///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+pLAuHP/gC74ETvHpEBoTAGltYeYBP///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8JJBAAOJY1jav////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////qSwLRB/4AwSAseh6QgICMA49AggAT////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////6ksBYY/+AMWABLgAAACAAACXAAAAE////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+pLAWGP/gDFgAS4AAAAgAAAlwAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
      );
    newMsgSound.play();
  }

  function beep() {
    if (newUserSound == undefined)
      newUserSound = new Audio(
        "data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU="
      );
    newUserSound.play();
  }

  function writeChatHistoryIntoCookie(username, msg) {
    var chatHistory = [];
    try {
      chatHistory = JSON.parse(getCookie("chathistory"));
    } catch (e) {}

    if (
      chatHistory.length === 0 ||
      // avoid same message being saved when user open multiple tabs
      chatHistory[chatHistory.length - 1].username !== username ||
      chatHistory[chatHistory.length - 1].message !== msg
    ) {
      var dataToSaveIntoCookie = {};
      dataToSaveIntoCookie.username = username;
      dataToSaveIntoCookie.message = msg;
      chatHistory.push(dataToSaveIntoCookie);
      // keep most recent 20 messages only
      chatHistory = chatHistory.slice(Math.max(chatHistory.length - 20, 0));
      addCookie("chathistory", JSON.stringify(chatHistory));
    }
  }

  function loadHistoryChatFromCookie() {
    var chatHistory = [];
    try {
      chatHistory = JSON.parse(getCookie("chathistory"));
    } catch (e) {}
    if (chatHistory.length) {
      log("----Chat History----");
      options = {};
      options.loadFromCookie = true;
      for (var i = 0; i < chatHistory.length; i++) {
        var data = chatHistory[i];
        processChatMessage(data, options);
      }
      log("-----End of History-----");
    }
  }

  function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == " ") c = c.substring(1);
      if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
  }

  function addCookie(cname, cvalue) {
    exdays = 365;
    var d = new Date();
    d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires + "; path=/";
  }

  function doNothing(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function readThenSendFile(data) {
    if (sendingFile) return;

    var reader = new FileReader();
    reader.onload = function (evt) {
      var msg = {};
      msg.username = username;
      msg.file = evt.target.result;
      msg.fileName = data.name;
      socket.emit("base64 file", msg);
      $inputMessage.val("Sending file...");
      sendingFile = true;
      $inputMessage.prop("disabled", true);
    };
    reader.readAsDataURL(data);
  }

  $window.keydown(function (event) {
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if ($("#socketchatbox-txt_fullname").is(":focus")) {
        changeNameByEdit();
        $inputMessage.focus();
        return;
      }

      if (username) {
        sendMessage();
        socket.emit("stop typing");
        typing = false;
      } else {
        alert("no chatbox username");
      }
    }
  });

  $inputMessage.on("input", function () {
    updateTyping();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // Prepare file drop box.
  $chatBox.on("dragenter", doNothing);
  $chatBox.on("dragover", doNothing);
  $chatBox.on("drop", function (e) {
    e.originalEvent.preventDefault();
    var data = e.originalEvent.dataTransfer.files[0];
    readThenSendFile(data);
  });

  $("#socketchatbox-imagefile").bind("change", function (e) {
    var data = e.originalEvent.target.files[0];
    readThenSendFile(data);
  });

  $topbar.click(function () {
    if ($chatBody.is(":visible")) {
      hide();
      addCookie("chatboxOpen", 0);
    } else {
      show();
      addCookie("chatboxOpen", 1);
    }
  });

  // change username
  $("#socketchatbox-username").click(function (e) {
    if (sendingFile) return;
    e.stopPropagation();
    if ($("#socketchatbox-txt_fullname").is(":focus")) return;

    var name = $(this).text();
    $(this).html("");
    $("<input></input>")
      .attr({
        type: "text",
        name: "fname",
        id: "socketchatbox-txt_fullname",
        size: "10",
        value: name,
      })
      .appendTo("#socketchatbox-username");
    $("#socketchatbox-txt_fullname").focus();
  });

  // Some of the functions below are for Admin to use

  // This is a temp method for admin to change user's name, right now
  // it's checking oldname on client side, should only emmit command to
  // specific client instead
  function changeName(oldname, name) {
    if (oldname === username) {
      username = name;
      addCookie("chatname", name);
      $("#socketchatbox-username").text(username);
    }
  }
  function say(str) {
    $inputMessage.val(str);
    var e = jQuery.Event("keydown");
    e.which = 13; // # Some key code value
    $("input").trigger(e);
  }
  function show() {
    $("#socketchatbox-showHideChatbox").text("↓");
    $chatBody.show();
  }
  function hide() {
    $("#socketchatbox-showHideChatbox").text("↑");
    $chatBody.hide();
  }
  function color(c) {
    $("html").css("background-color", c);
  }
  function black() {
    $("html").css("background-color", "black");
  }
  function white() {
    $("html").css("background-color", "white");
  }
});



