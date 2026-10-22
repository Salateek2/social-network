// Group routes (§19, §21). All require login.
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/groupController');

router.use(requireAuth);

router.post('/', c.createGroup);          // Create
router.get('/', c.listGroups);            // List
router.get('/search', c.searchGroups);    // Search
router.get('/:id', c.getGroup);           // Read one
router.put('/:id', c.updateGroup);        // Update (admin)
router.delete('/:id', c.deleteGroup);     // Delete (admin)

// Membership
router.post('/:id/join', c.requestJoin);
router.post('/:id/approve/:userId', c.approveMember);
router.post('/:id/remove/:userId', c.removeMember);  // admin only (§21)
router.post('/:id/leave', c.leaveGroup);

// Invitations
router.post('/:id/invite/:userId', c.inviteToGroup); // member invites someone
router.post('/:id/accept-invite', c.acceptInvite);   // I accept my invite
router.delete('/:id/invite', c.declineInvite);       // I decline my invite

module.exports = router;
