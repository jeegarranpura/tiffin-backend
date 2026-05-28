const admin = require("firebase-admin");

if (process.env.FIREBASE_CONFIG) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CONFIG)),
  });
}

const sendNotification = async (token, title, message) => {
  const payload = {
    notification: {
      title: `Delivery Route Ready  -  ${title}`,
      body: message,
    },
  };

  const data = await admin.messaging().sendToDevice(token, payload);
};

module.exports = {
  sendNotification,
};

//
