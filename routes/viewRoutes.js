const express = require('express');
const router = express.Router();
const {
  renderHome,
  renderBlogDetail,
  renderRegisterPage,
  handleRegister,
  renderLoginPage,
  handleLogin,
  handleLogout,
  renderDashboard,
  renderCreateBlogPage,
  handleCreateBlog,
  renderEditBlogPage,
  handleUpdateBlog,
  handleDeleteBlog,
} = require('../controllers/viewController');
const { requireAuth } = require('../middleware/viewAuthMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public pages
router.get('/', renderHome);
router.get('/register', renderRegisterPage);
router.post('/register', upload.single('avatar'), handleRegister);
router.get('/login', renderLoginPage);
router.post('/login', handleLogin);
router.post('/logout', handleLogout);

// Protected pages — order matters: '/blogs/new' must come before '/blogs/:id'
router.get('/dashboard', requireAuth, renderDashboard);
router.get('/blogs/new', requireAuth, renderCreateBlogPage);
router.post('/blogs', requireAuth, upload.single('coverImage'), handleCreateBlog);
router.get('/blogs/:id/edit', requireAuth, renderEditBlogPage);
router.put('/blogs/:id', requireAuth, upload.single('coverImage'), handleUpdateBlog);
router.delete('/blogs/:id', requireAuth, handleDeleteBlog);

// Public blog detail page — placed after '/blogs/new' and '/blogs/:id/edit'
router.get('/blogs/:id', renderBlogDetail);

module.exports = router;
