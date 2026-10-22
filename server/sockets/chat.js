// Real-time chat over Socket.io (§28).
// Messages are delivered live AND persisted to MongoDB (Message model).
const { Server } = require('socket.io');
const Message = require('../models/Message');
const User = require('../models/User');
const getAdmin = require('../config/firebaseAdmin');

function initChat(httpServer) {
  const io = new Server(httpServer);

  // The client passes its Firebase ID token when connecting:
  //   io({ auth: { token } })  — see client/src/components/Chat.js
  // We verify it here so only logged-in users can chat (§21).
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error('You must be logged in.'));
      const decoded = await getAdmin().auth().verifyIdToken(token);
      const user = await User.findOne({ firebaseUid: decoded.uid });
      if (!user) return next(new Error('No profile found.'));
      socket.userId = String(user._id);
      next();
    } catch (err) {
      next(new Error('You must be logged in.'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;

    // Personal room: lets us deliver a message to a specific user directly.
    socket.join('user:' + userId);

    // Incoming message from this user.
    socket.on('chat:send', async ({ to, text }) => {
      try {
        if (!to || !text || !String(text).trim()) return;
        const room = Message.roomId(userId, to);
        const msg = await Message.create({
          from: userId,
          to,
          room,
          text: String(text).trim(),
        });
        // Deliver to both participants in real time.
        io.to('user:' + userId).to('user:' + to).emit('chat:message', msg);
      } catch (err) {
        socket.emit('chat:error', 'Message could not be sent.');
      }
    });
  });

  return io;
}

module.exports = initChat;
