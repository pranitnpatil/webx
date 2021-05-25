const mongoose = require('mongoose');
const Schema = mongoose.Schema;

userSchema = new Schema( {
	
	unique_id: Number,
	username: String,
    roomname: String,
	createdAt: {
		type: Date,
		default: Date.now
	}
}),
User_room = mongoose.model('User_room', userSchema);

module.exports = User_room;