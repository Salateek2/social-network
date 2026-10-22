// Message routes (§28). All require login.
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/messageController');

router.use(requireAuth);

router.get('/conversations', c.listConversations);
router.get('/:userId', c.history);

module.exports = router;
