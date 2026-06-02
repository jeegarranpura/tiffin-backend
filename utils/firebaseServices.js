const admin = require("firebase-admin");
const { User } = require('../models')

if (process.env.FIREBASE_CONFIG) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CONFIG)),
  });
}

const sendNotification = async (token, title, message, agent) => {
  const payload = {
    token: token,
    notification: {
      title: title,
      body: message,
    },
    data: {
      type: "order",
    },
  };

  try {
    const data = await admin.messaging().send(payload);
  } catch (error) {
    if (error.code === "messaging/registration-token-not-registered") {
      // Remove token from database
      console.log("Invalid token, Or Token deleting...");
      const user = await User.findOne({ where: { fcmToken: token } });
      if (user) {
        await user.update({ fcmToken: null });
      }

    }
  }
};

module.exports = {
  sendNotification,
};

//
