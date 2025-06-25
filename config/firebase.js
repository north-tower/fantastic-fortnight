const admin = require('firebase-admin');



let serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Uncomment and set if you want to specify databaseURL:
  // databaseURL: 'https://<your-project-id>.firebaseio.com'
});

const db = admin.firestore();

module.exports = db; 