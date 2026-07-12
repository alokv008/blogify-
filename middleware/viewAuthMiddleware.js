const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Runs on every page request. Reads the JWT from a cookie (if present),
// and makes the logged-in user available to every EJS view as `currentUser`.
// Does NOT block the request if there's no token — pages stay public by default.
const checkUser = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    res.locals.currentUser = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    req.user = user;
    res.locals.currentUser = user;
  } catch (error) {
    res.locals.currentUser = null;
  }

  next();
};

// Use this on routes that require login (create/edit/delete blog, dashboard).
// Redirects to the login page instead of returning a JSON 401, since a
// browser is expecting an HTML page back.
const requireAuth = (req, res, next) => {
  if (!res.locals.currentUser) {
    return res.redirect('/login');
  }
  next();
};

module.exports = { checkUser, requireAuth };
