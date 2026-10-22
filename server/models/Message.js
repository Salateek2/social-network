// Message model (§28). Persists chat history for the Socket.io chat.
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Stable id for a 1:1 conversation (sorted pair of user ids), so we can
    // fetch a thread regardless of who sent which message.
    room: { type: String, required: true, index: true },
    text: { type: String, required: true, maxlength: 2000 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Build a deterministic room id from two user ids.
messageSchema.statics.roomId = function (a, b) {
  return [String(a), String(b)].sort().join('_');
};

module.exports = mongoose.model('Message', messageSchema);
