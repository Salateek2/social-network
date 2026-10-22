// User routes (§19, §21). All require login.
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/userController');

router.use(requireAuth);

router.get('/', c.listUsers);             // List
router.get('/search', c.searchUsers);     // Search
router.get('/me/notifications', c.notifications); // Notifications tab
router.put('/me', c.updateMe);            // Update own profile
router.delete('/me', c.deleteMe);         // Delete own account
router.get('/:id', c.getUser);            // Read one

// Friends
router.post('/:id/friend-request', c.sendFriendRequest);
router.post('/:id/accept', c.acceptFriendRequest);
router.post('/:id/decline', c.declineFriendRequest);
router.delete('/:id/friend', c.removeFriend);

module.exports = router;
