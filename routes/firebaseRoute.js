const express = require('express');
const router = express.Router();
const { User } = require('../models');


router.post('/updateToken', async (req, res) => {
    try {
        const { fcmToken, userId } = req.body;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        await user.update({
            fcmToken: fcmToken
        });
        const { password, ...updatedUser } = user.toJSON();
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error while saving fmc token', error });
    }
});

module.exports = router;