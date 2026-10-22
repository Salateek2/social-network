// Message controller (§28). REST side: load conversation history + conversation list.
const Message = require('../models/Message');
const User = require('../models/User');

// GET /api/messages/conversations
// Distinct users I've exchanged messages with, most recent first.
async function listConversations(req, res, next) {
  try {
    const uid = req.userId;
    const msgs = await Message.find({ $or: [{ from: uid }, { to: uid }] })
      .sort('-createdAt')
      .limit(500);

    const seen = new Set();
    const partners = [];
    for (const m of msgs) {
      const other = String(m.from) === String(uid) ? String(m.to) : String(m.from);
      if (!seen.has(other)) { seen.add(other); partners.push(other); }
    }
    const users = await User.find({ _id: { $in: partners } }).select('username displayName avatar');
    res.json(users);
  } catch (err) { next(err); }
}

// GET /api/messages/:userId  -> full history between me and :userId
async function history(req, res, next) {
  try {
    const uid = req.userId;
    const room = Message.roomId(uid, req.params.userId);
    const messages = await Message.find({ room }).sort('createdAt').limit(500);
    // Mark messages sent TO me as read.
    await Message.updateMany({ room, to: uid, read: false }, { read: true });
    res.json(messages);
  } catch (err) { next(err); }
}

module.exports = { listConversations, history };
