// Auth controller (§21, §24).
// Sign-up / login / logout happen in FIREBASE on the client (client/src/firebase.js).
// This controller only manages the MongoDB profile linked to the Firebase account.
const User = require('../models/User');

// Animal avatars available in the client (client/src/components/Avatar.js) —
// every new user gets a random one; they can change it on the Profile page.
const AVATAR_KEYS = ['bird', 'lion', 'fox', 'panda', 'frog', 'cat', 'dog', 'turtle', 'owl', 'penguin'];

// POST /api/auth/sync — called right after Firebase sign-up (or on first login).
// Creates the MongoDB profile for the verified Firebase user, if missing.
async function sync(req, res, next) {
  try {
    const { uid, email } = req.firebaseUser; // set by verifyToken middleware

    // Already have a profile? Just return it.
    const existing = await User.findOne({ firebaseUid: uid });
    if (existing) return res.json(existing);

    const { username, displayName } = req.body || {};

    // Validation (§24)
    if (!username || String(username).trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }
    const taken = await User.findOne({ username: username.trim() });
    if (taken) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }

    const user = await User.create({
      firebaseUid: uid,
      email: email || '',
      username: username.trim(),
      displayName: (displayName || username).trim(),
      avatar: AVATAR_KEYS[Math.floor(Math.random() * AVATAR_KEYS.length)],
    });
    res.status(201).json(user);
  } catch (err) {
    // Handle the duplicate-key race just in case (§24)
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }
    next(err);
  }
}

// GET /api/auth/me — who am I? (null user = valid Firebase login, no profile yet)
async function me(req, res, next) {
  try {
    const user = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { sync, me };
