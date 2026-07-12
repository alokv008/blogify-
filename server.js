const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const connectDB = require('./config/db');
const { checkUser } = require('./middleware/viewAuthMiddleware');

dotenv.config();
connectDB();

const app = express();

// View engine (EJS) for server-rendered pages
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Core middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Lets HTML forms submit PUT/DELETE by adding ?_method=PUT to the action URL
app.use(methodOverride('_method'));

// Serve uploaded files and static assets (CSS, images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Attaches res.locals.currentUser on every request, for use in EJS views
app.use(checkUser);

// JSON API routes (unchanged — still usable from Postman, a mobile app, etc.)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/blogs', require('./routes/blogRoutes'));

// Server-rendered EJS pages (the "fullstack" frontend)
app.use('/', require('./routes/viewRoutes'));

// 404 handler
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ message: 'Route not found' });
  }
  res.status(404).render('404', { title: 'Not found' });
});

// Global error handler (catches Multer errors too)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Blogify server running on port ${PORT}`);
});
