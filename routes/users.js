const express = require("express");
const router = express.Router();
const { User } = require("../models");

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        "username",
        "email",
        "name",
        "phone",
        "id",
        "role",
        "password",
      ],
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
});

// Create a new user
router.post("/", async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error });
  }
});

// Update a user
router.put("/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await user.update(req.body);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error });
  }
});

// Delete a user
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await user.destroy();
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error });
  }
});

router.get("/delivery-agents", async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        role: "delivery_agent",
      },
      attributes: ["username", "email", "name", "phone", "id", "role"],
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      res.status(404).json({ message: "User Not Found!" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000);
    await User.update({ otp }, { where: { email } });
    res.send(200).json({
      message: "Otp Generated Successfully",
    });
  } catch (eroor) {
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
