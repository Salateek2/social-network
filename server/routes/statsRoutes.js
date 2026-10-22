// Stats routes (§29). All require login.
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/statsController');

router.use(requireAuth);

router.get('/posts-per-group', c.postsPerGroup);
router.get('/posts-per-day', c.postsPerDay);

module.exports = router;
