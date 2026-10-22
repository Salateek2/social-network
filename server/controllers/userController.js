// User controller (§19 CRUD/List/Search, §21 privacy, friends).
const User = require('../models/User');

const PUBLIC_FIELDS = 'username displayName avatar bio createdAt';

// GET /api/users           -> List (§19)
async function listUsers(req, res, next) {
  try {
    const users = await User.find().select(PUBLIC_FIELDS).sort('username').limit(200);
    res.json(users);
  } catch (err) { next(err); }
}

// GET /api/users/search?q=&hasBio=&sort=   -> Search (§19)
async function searchUsers(req, res, next) {
  try {
    const { q } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { username: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
      ];
    }
    const users = await User.find(filter).select(PUBLIC_FIELDS).limit(100);
    res.json(users);
  } catch (err) { next(err); }
}

// GET /api/users/:id       -> Read one (public profile)
async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
      .select(PUBLIC_FIELDS)
      .populate('friends', PUBLIC_FIELDS);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) { next(err); }
}

// PUT /api/users/me        -> Update own profile only (§21)
async function updateMe(req, res, next) {
  try {
    const { displayName, bio, avatar } = req.body || {};
    const update = {};
    if (displayName !== undefined) update.displayName = String(displayName).slice(0, 60);
    if (bio !== undefined) update.bio = String(bio).slice(0, 300);
    if (avatar !== undefined) update.avatar = String(avatar);
    const user = await User.findByIdAndUpdate(req.userId, update, {
      new: true,
      runValidators: true,
    });
    res.json(user);
  } catch (err) { next(err); }
}

// DELETE /api/users/me     -> Delete own account only (§21)
async function deleteMe(req, res, next) {
  try {
    await User.findByIdAndDelete(req.userId);
    // (Client also signs out of Firebase after deleting the account.)
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// GET /api/users/me/notifications -> incoming friend requests + group invites
async function notifications(req, res, next) {
  try {
    const me = await User.findById(req.userId)
      .select('friendRequests groupInvites')
      .populate('friendRequests', PUBLIC_FIELDS)
      .populate('groupInvites.group', 'name category isPrivate')
      .populate('groupInvites.from', 'username displayName avatar');
    // Drop invites whose group has since been deleted.
    const groupInvites = me.groupInvites.filter((i) => i.group);
    res.json({ friendRequests: me.friendRequests, groupInvites });
  } catch (err) { next(err); }
}

// ---- Friends ----

// POST /api/users/:id/friend-request
async function sendFriendRequest(req, res, next) {
  try {
    const targetId = req.params.id;
    if (targetId === String(req.userId)) {
      return res.status(400).json({ error: "You can't friend yourself." });
    }
    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    if (target.friends.some((f) => f.equals(req.userId))) {
      return res.status(409).json({ error: 'Already friends.' });
    }
    if (!target.friendRequests.some((f) => f.equals(req.userId))) {
      target.friendRequests.push(req.userId);
      await target.save();
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// POST /api/users/:id/accept  (accept a request FROM :id)
async function acceptFriendRequest(req, res, next) {
  try {
    const requesterId = req.params.id;
    const me = await User.findById(req.userId);
    if (!me.friendRequests.some((f) => f.equals(requesterId))) {
      return res.status(400).json({ error: 'No such friend request.' });
    }
    // Remove from requests, add to both friend lists.
    me.friendRequests = me.friendRequests.filter((f) => !f.equals(requesterId));
    if (!me.friends.some((f) => f.equals(requesterId))) me.friends.push(requesterId);
    await me.save();

    await User.findByIdAndUpdate(requesterId, { $addToSet: { friends: me._id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// POST /api/users/:id/decline  (decline a request FROM :id)
async function declineFriendRequest(req, res, next) {
  try {
    await User.findByIdAndUpdate(req.userId, { $pull: { friendRequests: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// DELETE /api/users/:id/friend  (remove friendship)
async function removeFriend(req, res, next) {
  try {
    const otherId = req.params.id;
    await User.findByIdAndUpdate(req.userId, { $pull: { friends: otherId } });
    await User.findByIdAndUpdate(otherId, { $pull: { friends: req.userId } });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = {
  listUsers, searchUsers, getUser, updateMe, deleteMe, notifications,
  sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend,
};
