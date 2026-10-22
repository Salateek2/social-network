// Post model (§18, §22). Can be a personal post or belong to a group.
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // null/undefined => personal post on the author's profile / friends feed.
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null, index: true },

    text: { type: String, required: [true, 'Post text is required'], maxlength: 5000 },

    // Media (§26 video lives here too)
    mediaUrl: { type: String, default: '' },
    mediaType: { type: String, enum: ['none', 'image', 'video'], default: 'none' },

    // For search by category (§19, §20)
    tags: [{ type: String, trim: true, index: true }],

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
