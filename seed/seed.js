// Seed script (§23): fills the network with realistic demo data.
// Creates 4 users (in BOTH Firebase and MongoDB), groups, posts, likes,
// comments and chat history — so the defense demo looks alive.
//
// Run with:  npm run seed
// Safe to re-run: it wipes and recreates only the demo users' content.
//
// Demo logins (all with password "socialnet123"):
//   noa.levi@socialnet-demo.com · daniel.cohen@socialnet-demo.com
//   maya.peretz@socialnet-demo.com · tomer.azulay@socialnet-demo.com
require('dotenv').config();
const mongoose = require('mongoose');
const getAdmin = require('../server/config/firebaseAdmin');
const User = require('../server/models/User');
const Group = require('../server/models/Group');
const Post = require('../server/models/Post');
const Message = require('../server/models/Message');

const PASSWORD = 'socialnet123';

const PEOPLE = [
  {
    username: 'noa',
    displayName: 'Noa Levi',
    email: 'noa.levi@socialnet-demo.com',
    bio: 'CS student, coffee-powered. Photographing Tel Aviv one alley at a time.',
    avatar: 'bird',
  },
  {
    username: 'daniel',
    displayName: 'Daniel Cohen',
    email: 'daniel.cohen@socialnet-demo.com',
    bio: 'Full-stack tinkerer. If it compiles, ship it.',
    avatar: 'lion',
  },
  {
    username: 'maya',
    displayName: 'Maya Peretz',
    email: 'maya.peretz@socialnet-demo.com',
    bio: 'Runner, baker, serial hobby-starter.',
    avatar: 'fox',
  },
  {
    username: 'tomer',
    displayName: 'Tomer Azulay',
    email: 'tomer.azulay@socialnet-demo.com',
    bio: 'Gamer and part-time barista. Ask me about my espresso setup.',
    avatar: 'panda',
  },
];

// A date N days ago (posts spread over time — useful for the D3 charts later).
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// Set a custom createdAt (mongoose timestamps would otherwise overwrite it).
async function backdate(Model, id, date) {
  await Model.updateOne({ _id: id }, { $set: { createdAt: date } }, { timestamps: false });
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing — check your .env file.');
    process.exit(1);
  }
  console.log('Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB.');
  const admin = getAdmin();

  // ---- 1. Users: Firebase account + MongoDB profile ----
  const users = {};
  for (const p of PEOPLE) {
    let fbUser;
    try {
      fbUser = await admin.auth().createUser({
        email: p.email,
        password: PASSWORD,
        displayName: p.displayName,
      });
      console.log(`Firebase user created: ${p.email}`);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        fbUser = await admin.auth().getUserByEmail(p.email);
        console.log(`Firebase user already exists: ${p.email}`);
      } else {
        throw err;
      }
    }

    users[p.username] = await User.findOneAndUpdate(
      { username: p.username },
      {
        firebaseUid: fbUser.uid,
        email: p.email,
        username: p.username,
        displayName: p.displayName,
        bio: p.bio,
        avatar: p.avatar,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  const { noa, daniel, maya, tomer } = users;
  const demoIds = Object.values(users).map((u) => u._id);

  // ---- 2. Clean previous demo content (so re-running doesn't duplicate) ----
  await Post.deleteMany({ author: { $in: demoIds } });
  await Message.deleteMany({ $or: [{ from: { $in: demoIds } }, { to: { $in: demoIds } }] });
  await Group.deleteMany({ admins: { $in: demoIds } });
  // Old invites point at deleted groups — clear them.
  await User.updateMany({ _id: { $in: demoIds } }, { $set: { groupInvites: [] } });

  // ---- 3. Friendships ----
  const pairs = [
    [noa, daniel],
    [noa, maya],
    [daniel, tomer],
    [maya, tomer],
  ];
  for (const [a, b] of pairs) {
    await User.updateOne({ _id: a._id }, { $addToSet: { friends: b._id } });
    await User.updateOne({ _id: b._id }, { $addToSet: { friends: a._id } });
  }

  // ---- 4. Groups (one private, to demo §21 permissions) ----
  const foodies = await Group.create({
    name: 'Campus Foodies',
    description: 'Where to actually eat near campus. Rants about the cafeteria welcome.',
    category: 'Food',
    admins: [maya._id],
    members: [maya._id, noa._id, tomer._id],
  });
  const coders = await Group.create({
    name: 'Late Night Coders',
    description: 'Debugging after midnight. Misery loves company.',
    category: 'Tech',
    admins: [daniel._id],
    members: [daniel._id, noa._id],
  });
  const secret = await Group.create({
    name: 'Exam Survival Club',
    description: 'Members only: past exams, summaries and moral support.',
    category: 'Study',
    isPrivate: true,
    admins: [noa._id],
    members: [noa._id, daniel._id],
    pendingRequests: [tomer._id], // pending request to demo admin approval
  });

  // ---- 4b. Notifications demo: a friend request + a group invitation ----
  // Tomer -> Noa friend request (they are not friends in the pairs above).
  await User.updateOne({ _id: noa._id }, { $addToSet: { friendRequests: tomer._id } });
  // Maya invites Daniel to Campus Foodies (he's not a member).
  await User.updateOne(
    { _id: daniel._id },
    { $push: { groupInvites: { group: foodies._id, from: maya._id } } }
  );

  // ---- 5. Posts (spread over the last month) ----
  const postsData = [
    { author: noa, text: 'First day of the new semester. My schedule is a crime scene. 😅', tags: ['campus', 'life'], days: 30, likes: [daniel, maya] },
    { author: daniel, text: 'Finally understood how middleware works in Express. It only took three tutorials and a minor breakdown.', tags: ['tech', 'nodejs'], days: 26, likes: [noa], group: coders },
    { author: maya, text: 'Found a hummus place 5 minutes from campus that changes everything. Details in the comments.', tags: ['food', 'recommendation'], days: 21, likes: [noa, tomer, daniel], group: foodies, comments: [{ author: tomer, text: 'DROP THE LOCATION' }, { author: maya, text: 'The little place behind the library, ask for extra pita.' }] },
    { author: tomer, text: 'New espresso machine day. My wallet is crying but my mornings are saved. ☕', tags: ['coffee', 'life'], days: 17, likes: [maya] },
    { author: noa, text: 'Photo walk through the old city — golden hour did NOT disappoint.', tags: ['photography'], days: 12, likes: [maya, tomer] },
    { author: noa, text: 'Testing video posts — look at this little guy! 🎬', tags: ['video', 'nature'], days: 2, likes: [maya], mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', mediaType: 'video' },
    { author: daniel, text: '2am. The bug was a missing await. It is always a missing await.', tags: ['tech', 'debugging'], days: 8, likes: [noa, tomer], group: coders, comments: [{ author: noa, text: 'Been there. Yesterday actually.' }] },
    { author: maya, text: '10k this morning! Slowest time ever but zero walking breaks. Progress. 🏃‍♀️', tags: ['running', 'fitness'], days: 4, likes: [noa, daniel] },
    { author: tomer, text: 'Anyone up for a board game night this weekend? I have too many games and not enough friends who show up.', tags: ['games', 'social'], days: 1, likes: [noa, maya, daniel], comments: [{ author: daniel, text: "I'm in if there's pizza." }] },
  ];
  for (const p of postsData) {
    const post = await Post.create({
      author: p.author._id,
      group: p.group ? p.group._id : null,
      text: p.text,
      tags: p.tags,
      mediaUrl: p.mediaUrl || '',
      mediaType: p.mediaType || 'none',
      likes: (p.likes || []).map((u) => u._id),
      comments: (p.comments || []).map((c) => ({ author: c.author._id, text: c.text })),
    });
    await backdate(Post, post._id, daysAgo(p.days));
  }

  // ---- 6. Chat history ----
  const chats = [
    { a: noa, b: daniel, lines: [
      ['a', 'Did you start the final project yet?'],
      ['b', 'Define "start". I made the folder.'],
      ['a', 'That counts. Library tomorrow at 10?'],
      ['b', 'Deal. Bring the summaries 🙏'],
    ]},
    { a: maya, b: tomer, lines: [
      ['a', 'Board game night — count me in!'],
      ['b', 'Yes!! Saturday 8pm, my place.'],
      ['a', "I'll bring the banana bread I posted about."],
    ]},
  ];
  for (const chat of chats) {
    const room = Message.roomId(chat.a._id, chat.b._id);
    let minutesBack = chat.lines.length;
    for (const [who, text] of chat.lines) {
      const from = who === 'a' ? chat.a : chat.b;
      const to = who === 'a' ? chat.b : chat.a;
      const m = await Message.create({ from: from._id, to: to._id, room, text, read: true });
      await backdate(Message, m._id, new Date(Date.now() - minutesBack-- * 60 * 1000));
    }
  }

  console.log('\nSeed complete! Demo accounts (password for all: "' + PASSWORD + '"):');
  for (const p of PEOPLE) console.log(`  ${p.email}  (@${p.username})`);
  console.log('\nGroups: Campus Foodies, Late Night Coders, Exam Survival Club (private)');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
