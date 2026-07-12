const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Blog = require('../models/Blog');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// Sends the JWT to the browser as an httpOnly cookie so JavaScript on the
// page can't read it (helps protect against XSS token theft), but the
// browser will automatically send it back on every request.
const sendTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
  });
};

/* ---------- Public pages ---------- */

// GET /  — homepage, lists all blogs
const renderHome = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const skip = (page - 1) * limit;

  const blogs = await Blog.find()
    .populate('author', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Blog.countDocuments();

  res.render('index', {
    title: 'Blogify — Home',
    blogs,
    page,
    totalPages: Math.ceil(total / limit),
  });
};

// GET /blogs/:id — single blog detail page
const renderBlogDetail = async (req, res) => {
  const blog = await Blog.findById(req.params.id).populate('author', 'name avatar');

  if (!blog) {
    return res.status(404).render('404', { title: 'Not found' });
  }

  res.render('blog-detail', { title: blog.title, blog });
};

/* ---------- Auth pages ---------- */

// GET /register
const renderRegisterPage = (req, res) => {
  res.render('register', { title: 'Create account', error: null });
};

// POST /register
const handleRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).render('register', {
        title: 'Create account',
        error: 'Please fill in all fields',
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).render('register', {
        title: 'Create account',
        error: 'An account with this email already exists',
      });
    }

    const avatar = req.file ? `/uploads/${req.file.filename}` : '';
    const user = await User.create({ name, email, password, avatar });

    sendTokenCookie(res, generateToken(user._id));
    res.redirect('/dashboard');
  } catch (error) {
    res.status(500).render('register', { title: 'Create account', error: error.message });
  }
};

// GET /login
const renderLoginPage = (req, res) => {
  res.render('login', { title: 'Log in', error: null });
};

// POST /login
const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).render('login', { title: 'Log in', error: 'Invalid email or password' });
    }

    sendTokenCookie(res, generateToken(user._id));
    res.redirect('/dashboard');
  } catch (error) {
    res.status(500).render('login', { title: 'Log in', error: error.message });
  }
};

// POST /logout
const handleLogout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

/* ---------- Protected pages (require login) ---------- */

// GET /dashboard — the logged-in user's own blogs
const renderDashboard = async (req, res) => {
  const blogs = await Blog.find({ author: req.user._id }).sort({ createdAt: -1 });
  res.render('dashboard', { title: 'My dashboard', blogs });
};

// GET /blogs/new — create-blog form
const renderCreateBlogPage = (req, res) => {
  res.render('blog-form', { title: 'New post', blog: null, error: null });
};

// POST /blogs — handle create-blog form submission
const handleCreateBlog = async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    if (!title || !content) {
      return res.status(400).render('blog-form', {
        title: 'New post',
        blog: req.body,
        error: 'Title and content are required',
      });
    }

    const coverImage = req.file ? `/uploads/${req.file.filename}` : '';
    const parsedTags = tags ? tags.split(',').map((t) => t.trim()) : [];

    const blog = await Blog.create({
      title,
      content,
      tags: parsedTags,
      coverImage,
      author: req.user._id,
    });

    res.redirect(`/blogs/${blog._id}`);
  } catch (error) {
    res.status(500).render('blog-form', { title: 'New post', blog: req.body, error: error.message });
  }
};

// GET /blogs/:id/edit — edit-blog form
const renderEditBlogPage = async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) return res.status(404).render('404', { title: 'Not found' });
  if (blog.author.toString() !== req.user._id.toString()) {
    return res.status(403).send('Not authorized to edit this post');
  }

  res.render('blog-form', { title: 'Edit post', blog, error: null });
};

// PUT /blogs/:id — handle edit-blog form submission
const handleUpdateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) return res.status(404).render('404', { title: 'Not found' });
    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).send('Not authorized to edit this post');
    }

    const { title, content, tags } = req.body;

    if (req.file) {
      if (blog.coverImage) {
        fs.unlink(path.join(__dirname, '..', blog.coverImage), () => {});
      }
      blog.coverImage = `/uploads/${req.file.filename}`;
    }

    blog.title = title || blog.title;
    blog.content = content || blog.content;
    blog.tags = tags ? tags.split(',').map((t) => t.trim()) : blog.tags;

    await blog.save();
    res.redirect(`/blogs/${blog._id}`);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

// DELETE /blogs/:id
const handleDeleteBlog = async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) return res.status(404).render('404', { title: 'Not found' });
  if (blog.author.toString() !== req.user._id.toString()) {
    return res.status(403).send('Not authorized to delete this post');
  }

  if (blog.coverImage) {
    fs.unlink(path.join(__dirname, '..', blog.coverImage), () => {});
  }

  await blog.deleteOne();
  res.redirect('/dashboard');
};

module.exports = {
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
};
