const express = require('express');
const { registerUser, authUser, searchUsers, forgotPassword, resetPassword } = require("../controllers/userControllers");
const { protect } = require('../middleware/authMiddleware');

const router = express.Router()

router.route('/').get(protect, searchUsers);
router.route('/').post(registerUser);
router.post('/login', authUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:id/:token', resetPassword);

module.exports = router;