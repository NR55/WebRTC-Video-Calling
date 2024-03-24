const mongoose = require("mongoose");

const roomsSchema = new mongoose.Schema({
    roomName: { type: String, required: true },
    creation: { type: String, required: true },
    creator_Username: { type: String, required: true },
    adminPassword: { type: String, required: true },
    description: { type: String, required: false },
    roomLocked: { type: Boolean, required: true },
    roomKey: { type: String, required: false }
});

const Rooms = mongoose.model("Rooms", roomsSchema);

module.exports = Rooms;