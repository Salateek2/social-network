// Group controller (§19 CRUD/List/Search, §21 admin powers & privacy).
const Group = require('../models/Group');
const User = require('../models/User');

const LIST_FIELDS = 'name description category isPrivate coverImage admins members createdAt';

// POST /api/groups          -> Create (creator becomes admin + member)
async function createGroup(req, res, next) {
  try {
    const { name, description, category, isPrivate, coverImage } = req.body || {};
    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: 'Group name must be at least 2 characters.' });
    }
    const group = await Group.create({
      name: name.trim(),
      description: description || '',
      category: category || 'General',
      isPrivate: !!isPrivate,
      coverImage: coverImage || '',
      admins: [req.userId],
      members: [req.userId],
    });
    res.status(201).json(group);
  } catch (err) { next(err); }
}

// GET /api/groups           -> List (public groups + groups I'm in) (§21)
async function listGroups(req, res, next) {
  try {
    const uid = req.userId;
    const groups = await Group.find({
      $or: [{ isPrivate: false }, { members: uid }],
    }).select(LIST_FIELDS).sort('-createdAt').limit(200);
    res.json(groups);
  } catch (err) { next(err); }
}

// GET /api/groups/search?name=&category=&privacy=  -> Search, 3 params (§20)
async function searchGroups(req, res, next) {
  try {
    const uid = req.userId;
    const { name, category, privacy } = req.query;

    // Always respect visibility: only public groups or ones I'm a member of.
    const visibility = { $or: [{ isPrivate: false }, { members: uid }] };
    const filter = { $and: [visibility] };

    if (name) filter.$and.push({ name: { $regex: name, $options: 'i' } });
    if (category) filter.$and.push({ category: { $regex: category, $options: 'i' } });
    if (privacy === 'private') filter.$and.push({ isPrivate: true });
    if (privacy === 'public') filter.$and.push({ isPrivate: false });

    const groups = await Group.find(filter).select(LIST_FIELDS).limit(100);
    res.json(groups);
  } catch (err) { next(err); }
}

// GET /api/groups/:id       -> Read one (private => members only) (§21)
async function getGroup(req, res, next) {
  try {
    const uid = req.userId;
    const group = await Group.findById(req.params.id)
      .populate('admins', 'username displayName avatar')
      .populate('members', 'username displayName avatar')
      .populate('pendingRequests', 'username displayName avatar');
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    if (group.isPrivate && !group.isMember(uid)) {
      return res.status(403).json({ error: 'This is a private group.' });
    }
    res.json(group);
  } catch (err) { next(err); }
}

// PUT /api/groups/:id       -> Update (admin only) (§21)
async function updateGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (!group.isAdmin(req.userId)) {
      return res.status(403).json({ error: 'Only a group admin can edit this group.' });
    }
    const { name, description, category, isPrivate, coverImage } = req.body || {};
    if (name !== undefined) group.name = String(name).trim();
    if (description !== undefined) group.description = description;
    if (category !== undefined) group.category = category;
    if (isPrivate !== undefined) group.isPrivate = !!isPrivate;
    if (coverImage !== undefined) group.coverImage = coverImage;
    await group.save();
    res.json(group);
  } catch (err) { next(err); }
}

// DELETE /api/groups/:id    -> Delete (admin only) (§21)
async function deleteGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (!group.isAdmin(req.userId)) {
      return res.status(403).json({ error: 'Only a group admin can delete this group.' });
    }
    await group.deleteOne();
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// ---- Membership ----

// POST /api/groups/:id/join   -> request to join (auto-join if public? we require approval)
async function requestJoin(req, res, next) {
  try {
    const uid = req.userId;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (group.isMember(uid)) return res.status(409).json({ error: 'Already a member.' });

    if (!group.pendingRequests.some((r) => r.equals(uid))) {
      group.pendingRequests.push(uid);
      await group.save();
    }
    res.json({ ok: true, message: 'Join request sent.' });
  } catch (err) { next(err); }
}

// POST /api/groups/:id/approve/:userId   -> admin approves a pending member (§21)
async function approveMember(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (!group.isAdmin(req.userId)) {
      return res.status(403).json({ error: 'Only an admin can approve members.' });
    }
    const { userId } = req.params;
    if (!group.pendingRequests.some((r) => r.equals(userId))) {
      return res.status(400).json({ error: 'No pending request from that user.' });
    }
    group.pendingRequests = group.pendingRequests.filter((r) => !r.equals(userId));
    if (!group.isMember(userId)) group.members.push(userId);
    await group.save();
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// POST /api/groups/:id/remove/:userId  -> admin removes a member (§21 extended powers)
async function removeMember(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (!group.isAdmin(req.userId)) {
      return res.status(403).json({ error: 'Only an admin can remove members.' });
    }
    const targetId = req.params.userId;
    if (group.isAdmin(targetId)) {
      return res.status(400).json({ error: 'Admins cannot be removed.' });
    }
    group.members = group.members.filter((m) => !m.equals(targetId));
    await group.save();
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// POST /api/groups/:id/invite/:userId  -> a member invites another user (§21)
async function inviteToGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    if (!group.isMember(req.userId)) {
      return res.status(403).json({ error: 'Only members can invite people.' });
    }
    const targetId = req.params.userId;
    if (group.isMember(targetId)) {
      return res.status(409).json({ error: 'Already a member.' });
    }
    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const already = target.groupInvites.some((i) => i.group && i.group.equals(group._id));
    if (!already) {
      target.groupInvites.push({ group: group._id, from: req.userId });
      await target.save();
    }
    res.json({ ok: true, message: 'Invitation sent.' });
  } catch (err) { next(err); }
}

// POST /api/groups/:id/accept-invite  -> invited user joins directly
async function acceptInvite(req, res, next) {
  try {
    const me = await User.findById(req.userId);
    const has = me.groupInvites.some((i) => i.group && i.group.equals(req.params.id));
    if (!has) return res.status(400).json({ error: 'No invitation for this group.' });

    me.groupInvites = me.groupInvites.filter((i) => !i.group || !i.group.equals(req.params.id));
    await me.save();

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'That group no longer exists.' });
    if (!group.isMember(me._id)) {
      group.members.push(me._id);
      group.pendingRequests = group.pendingRequests.filter((r) => !r.equals(me._id));
      await group.save();
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// DELETE /api/groups/:id/invite  -> decline my invitation
async function declineInvite(req, res, next) {
  try {
    await User.findByIdAndUpdate(req.userId, {
      $pull: { groupInvites: { group: req.params.id } },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// POST /api/groups/:id/leave
async function leaveGroup(req, res, next) {
  try {
    const uid = req.userId;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found.' });
    group.members = group.members.filter((m) => !m.equals(uid));
    group.admins = group.admins.filter((a) => !a.equals(uid));
    await group.save();
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = {
  createGroup, listGroups, searchGroups, getGroup, updateGroup, deleteGroup,
  requestJoin, approveMember, leaveGroup, removeMember,
  inviteToGroup, acceptInvite, declineInvite,
};
