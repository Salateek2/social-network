// Group model (§18, §21). Has admins (extended powers), members, and join requests.
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    description: { type: String, maxlength: 500, default: '' },
    category: { type: String, trim: true, default: 'General', index: true },
    isPrivate: { type: Boolean, default: false },
    coverImage: { type: String, default: '' },

    // Permissions (§21): admins can manage; only members see private content.
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Helpers used by permission checks (§21).
groupSchema.methods.isAdmin = function (userId) {
  return this.admins.some((a) => a.equals(userId));
};
groupSchema.methods.isMember = function (userId) {
  return this.members.some((m) => m.equals(userId));
};

module.exports = mongoose.model('Group', groupSchema);
