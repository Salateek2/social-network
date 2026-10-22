// User model (§18). Profile + friend graph.
// Login itself is handled by Firebase Auth (client/src/firebase.js);
// firebaseUid links this MongoDB profile to the Firebase account.
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username is too long'],
    },
    displayName: { type: String, trim: true, maxlength: 60 },
    avatar: { type: String, default: '' }, // image URL
    bio: { type: String, maxlength: 300, default: '' },

    // Friend graph
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // incoming

    // Incoming group invitations (shown in the Notifications tab)
    groupInvites: [
      {
        group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true }
);

// Don't leak the Firebase UID when sending a user as JSON.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.firebaseUid;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
