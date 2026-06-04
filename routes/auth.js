const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { getOtpTemplete, sendEmail } = require('../utils/emailService');

// const { loginRateLimit } = require('../utils/rateLimitService');

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const user = await User.create({ username, password, role });
    res.status(201).json({ id: user.id, username: user.username, role: user.role });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password, platform } = req.body;
    const user = await User.findOne({ where: { username } });

    // const rateLimitResult = await loginRateLimit.consume(req.ip);


    if (!user || !(await user.comparePassword(password))) { 
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    req.user = user;

    const refreshToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );

    if (platform === 'web') {
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      res.json({ token, refreshToken, user: { id: user.id, username: user.username, role: user.role } });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(429).json({
        error: 'Too many login attempts. Please try after 15 minutes.'
      })
    }
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({ token });
  } catch (error) {
    console.log('error', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email: email, role: ['admin', 'manager'] } });

    if (!user) {
      res.status(404).json({ message: "User Not Found!" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000);
    await User.update({ otp }, { where: { email } });

    const html = getOtpTemplete(otp, user.username);
    await sendEmail(email, 'Password Reset Request', html);
    console.log('[mail]  email send to user for otp')

    res.status(200).json({
      message: "Otp Generated and sent successfully, check mailbox",
    });
  } catch (error) {
    res.status(500).json({ message: "Error Forgot password", error });
  }
});
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User Not Found!" });
    }
    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    user.password = newPassword;
    user.otp = null;
    await user.save();
    res.json({ message: "Password Reset Successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error Forgot password", error });
  }
});

module.exports = router;
