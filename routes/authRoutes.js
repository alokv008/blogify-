const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public routes
router.post('/register', upload.single('avatar'), registerUser);
router.post('/login', loginUser);

// Protected route
router.get('/me', protect, getProfile);

module.exports = router;
