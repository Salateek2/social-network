// Auth routes (§21). Firebase handles login itself; these routes manage
// the MongoDB profile that goes with the Firebase account.
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { sync, me } = require('../controllers/authController');

router.post('/sync', verifyToken, sync); // create profile after Firebase sign-up
router.get('/me', verifyToken, me);      // current user's profile

module.exports = router;
