// Entry point: loads env, connects to MongoDB, starts HTTP + Socket.io server.
require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const initChat = require('./sockets/chat');

const PORT = process.env.PORT || 3000;

// Don't let an unexpected rejection silently kill the process (§24).
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

(async () => {
  try {
    await connectDB();

    const server = http.createServer(app);
    initChat(server); // attach Socket.io to the same server (§28)

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Health check:        http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();
