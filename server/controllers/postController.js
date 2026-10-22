// Post controller (§19 CRUD/List/Search, §20 advanced search, §22 feed, §21 permissions).
const Post = require('../models/Post');
const Group = require('../models/Group');
const User = require('../models/User');

const AUTHOR_FIELDS = 'username displayName avatar';

// Build the set of group ids whose posts the current user is allowed to see:
// all public groups + any private group they belong to. (§21)
async function visibleGroupIds(uid) {
  const groups = await Group.find({
    $or: [{ isPrivate: false }, { members: uid }],
  }).select('_id');
  return groups.map((g) => g._id);
}

// POST /api/posts           -> Create (group post requires membership) (§21)
async function createPost(req, res, next) {
  try {
    const uid = req.userId;
    const { text, group, mediaUrl, mediaType, tags } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Post text is required.' });
    }
    if (group) {
      const g = await Group.findById(group);
      if (!g) return res.status(404).json({ error: 'Group not found.' });
      if (!g.isMember(uid)) {
        return res.status(403).json({ error: 'You must be a member to post in this group.' });
      }
    }
    const post = await Post.create({
      author: uid,
      group: group || null,
      text: String(text).trim(),
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || 'none',
      tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map((t) => t.trim()) : []),
    });
    const populated = await post.populate('author', AUTHOR_FIELDS);
    res.status(201).json(populated);
  } catch (err) { next(err); }
}

// GET /api/posts/feed       -> own + friends' + member-group posts (§22)
async function feed(req, res, next) {
  try {
    const uid = req.userId;
    const me = await User.findById(uid).select('friends');
    const myGroups = await Group.find({ members: uid }).select('_id');
    const groupIds = myGroups.map((g) => g._id);
    const authorIds = [uid, ...me.friends];

    const posts = await Post.find({
      $or: [
        { author: { $in: authorIds }, group: null }, // personal posts by me/friends
        { group: { $in: groupIds } },                // posts in my groups
      ],
    })
      .populate('author', AUTHOR_FIELDS)
      .populate('group', 'name isPrivate')
      .sort('-createdAt')
      .limit(100);
    res.json(posts);
  } catch (err) { next(err); }
}

// GET /api/posts/mine       -> List my own posts (§19, §22)
async function myPosts(req, res, next) {
  try {
    const posts = await Post.find({ author: req.userId })
      .populate('author', AUTHOR_FIELDS)
      .populate('group', 'name isPrivate')
      .sort('-createdAt');
    res.json(posts);
  } catch (err) { next(err); }
}

// GET /api/posts/search?q=&tag=&group=&from=&to=  -> advanced search 3+ params (§20)
async function searchPosts(req, res, next) {
  try {
    const uid = req.userId;
    const { q, tag, group, from, to } = req.query;

    const allowedGroupIds = await visibleGroupIds(uid);
    // Visibility: personal posts OR posts in groups the user may see.
    const filter = {
      $and: [{ $or: [{ group: null }, { group: { $in: allowedGroupIds } }] }],
    };

    if (q) filter.$and.push({ text: { $regex: q, $options: 'i' } });
    if (tag) filter.$and.push({ tags: { $regex: tag, $options: 'i' } });
    if (group) filter.$and.push({ group });
    if (from || to) {
      const dateFilter = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);
      filter.$and.push({ createdAt: dateFilter });
    }

    const posts = await Post.find(filter)
      .populate('author', AUTHOR_FIELDS)
      .populate('group', 'name isPrivate')
      .sort('-createdAt')
      .limit(100);
    res.json(posts);
  } catch (err) { next(err); }
}

// GET /api/posts/user/:userId -> a user's posts, filtered by what I may see (§21):
// their personal posts + their posts in groups visible to me.
async function userPosts(req, res, next) {
  try {
    const allowedGroupIds = await visibleGroupIds(req.userId);
    const posts = await Post.find({
      author: req.params.userId,
      $or: [{ group: null }, { group: { $in: allowedGroupIds } }],
    })
      .populate('author', AUTHOR_FIELDS)
      .populate('group', 'name isPrivate')
      .sort('-createdAt')
      .limit(100);
    res.json(posts);
  } catch (err) { next(err); }
}

// GET /api/posts/:id        -> Read one (respect group privacy) (§21)
async function getPost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', AUTHOR_FIELDS)
      .populate('group', 'name isPrivate members')
      .populate('comments.author', AUTHOR_FIELDS);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    if (post.group && post.group.isPrivate) {
      const isMember = post.group.members.some((m) => m.equals(req.userId));
      if (!isMember) return res.status(403).json({ error: 'This post is in a private group.' });
    }
    res.json(post);
  } catch (err) { next(err); }
}

// PUT /api/posts/:id        -> Update (author only) (§21)
async function updatePost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (!post.author.equals(req.userId)) {
      return res.status(403).json({ error: 'You can only edit your own posts.' });
    }
    const { text, mediaUrl, mediaType, tags } = req.body || {};
    if (text !== undefined) post.text = String(text).trim();
    if (mediaUrl !== undefined) post.mediaUrl = mediaUrl;
    if (mediaType !== undefined) post.mediaType = mediaType;
    if (tags !== undefined) {
      post.tags = Array.isArray(tags) ? tags : String(tags).split(',').map((t) => t.trim());
    }
    await post.save();
    res.json(post);
  } catch (err) { next(err); }
}

// DELETE /api/posts/:id     -> Delete (author OR group admin) (§21)
async function deletePost(req, res, next) {
  try {
    const uid = req.userId;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    let allowed = post.author.equals(uid);
    if (!allowed && post.group) {
      const g = await Group.findById(post.group);
      if (g && g.isAdmin(uid)) allowed = true; // group admins can moderate
    }
    if (!allowed) {
      return res.status(403).json({ error: 'You can only delete your own posts.' });
    }
    await post.deleteOne();
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// POST /api/posts/:id/like  -> toggle like
async function toggleLike(req, res, next) {
  try {
    const uid = req.userId;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const liked = post.likes.some((l) => l.equals(uid));
    if (liked) post.likes = post.likes.filter((l) => !l.equals(uid));
    else post.likes.push(uid);
    await post.save();
    res.json({ likes: post.likes.length, liked: !liked });
  } catch (err) { next(err); }
}

// POST /api/posts/:id/comment
async function addComment(req, res, next) {
  try {
    const { text } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    post.comments.push({ author: req.userId, text: String(text).trim() });
    await post.save();
    const populated = await post.populate('comments.author', AUTHOR_FIELDS);
    res.status(201).json(populated.comments[populated.comments.length - 1]);
  } catch (err) { next(err); }
}

module.exports = {
  createPost, feed, myPosts, searchPosts, userPosts, getPost, updatePost, deletePost,
  toggleLike, addComment,
};
