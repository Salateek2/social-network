// Express application setup (MVC: this wires middleware + routes).
const express = require('express');
const path = require('path');

const app = express();

// ---- Core middleware ----
app.use(express.json({ limit: '2mb' }));          // parse JSON bodies (2mb: canvas drawings)
app.use(express.urlencoded({ extended: true }));  // parse form bodies

// Auth (§21) is per-route: middleware/auth.js verifies the Firebase ID token
// the React client sends with every request.

// In production, serve the built React app. In development the React dev
// server runs on :3001 and proxies /api calls here (see client/package.json).
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

// Uploaded post media (videos/images) — see routes/uploadRoutes.js.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- Routes ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// Any non-API GET falls through to the React app (production build),
// so React Router URLs like /dashboard work on refresh.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'), (err) => {
    if (err) next(); // no build yet (dev mode) -> plain 404
  });
});

// ---- 404 handler ----
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---- Central error handler (§24: never crash on bad input) ----
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

module.exports = app;
