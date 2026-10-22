// Stats controller (§29). Aggregates LIVE data from MongoDB for the D3 charts.
// Numbers change as soon as posts are added/removed — nothing is hard-coded.
const Post = require('../models/Post');
const Group = require('../models/Group');

// Same visibility rule as posts (§21): public groups + groups I'm in.
async function visibleGroupIds(uid) {
  const groups = await Group.find({
    $or: [{ isPrivate: false }, { members: uid }],
  }).select('_id');
  return groups.map((g) => g._id);
}

// GET /api/stats/posts-per-group  -> [{ name, count }] for the bar chart
async function postsPerGroup(req, res, next) {
  try {
    const ids = await visibleGroupIds(req.userId);
    const rows = await Post.aggregate([
      { $match: { group: { $in: ids } } },
      { $group: { _id: '$group', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const groups = await Group.find({ _id: { $in: rows.map((r) => r._id) } }).select('name');
    const nameById = new Map(groups.map((g) => [String(g._id), g.name]));
    res.json(
      rows.map((r) => ({ name: nameById.get(String(r._id)) || 'Unknown', count: r.count }))
    );
  } catch (err) { next(err); }
}

// GET /api/stats/posts-per-day  -> [{ _id: 'YYYY-MM-DD', count }] last 30 days
async function postsPerDay(req, res, next) {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ids = await visibleGroupIds(req.userId);
    const rows = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          $or: [{ group: null }, { group: { $in: ids } }],
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { postsPerGroup, postsPerDay };
