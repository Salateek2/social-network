// Auth middleware (§21).
// The client logs in with Firebase (client/src/firebase.js) and sends
//   Authorization: Bearer <Firebase ID token>
// on every Ajax call. We verify the token, then load the matching MongoDB
// user profile onto req.user / req.userId for the controllers.
const User = require('../models/User');
const getAdmin = require('../config/firebaseAdmin');

// Step 1: verify the Firebase token only (used by /api/auth/sync, where the
// MongoDB profile may not exist yet).
async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'You must be logged in.' });
  }
  try {
    req.firebaseUser = await getAdmin().auth().verifyIdToken(token);
    next();
  } catch (err) {
    if (err.status === 500) return next(err); // Firebase Admin not configured
    return res.status(401).json({ error: 'Invalid or expired login. Please log in again.' });
  }
}

// Step 2: token must be valid AND a MongoDB profile must exist.
function requireAuth(req, res, next) {
  verifyToken(req, res, async () => {
    try {
      const user = await User.findOne({ firebaseUid: req.firebaseUser.uid });
      if (!user) {
        return res.status(401).json({ error: 'No profile found for this account. Please register.' });
      }
      req.user = user;
      req.userId = user._id;
      next();
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { verifyToken, requireAuth };
