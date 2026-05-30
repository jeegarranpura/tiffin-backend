const admin = require("firebase-admin");

if (process.env.FIREBASE_CONFIG) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CONFIG)),
  });
}

const sendNotification = async (token, title, message) => {
  const payload = {
    token: token,
    notification: {
      title: `Delivery Route Ready  -  ${title}`,
      body: message,
    },
    data: {
    type: "order",
  },
  };

  const data = await admin.messaging().send(payload);
};

module.exports = {
  sendNotification,
};

//
