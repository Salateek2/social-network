// Post routes (§19, §20, §22). All require login.
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/postController');

router.use(requireAuth);

router.post('/', c.createPost);           // Create
router.get('/feed', c.feed);              // Feed (§22)
router.get('/mine', c.myPosts);           // List own
router.get('/search', c.searchPosts);     // Advanced search (§20)
router.get('/user/:userId', c.userPosts); // A user's posts (profile pages)
router.get('/:id', c.getPost);            // Read one
router.put('/:id', c.updatePost);         // Update (author)
router.delete('/:id', c.deletePost);      // Delete (author/admin)

router.post('/:id/like', c.toggleLike);
router.post('/:id/comment', c.addComment);

module.exports = router;
