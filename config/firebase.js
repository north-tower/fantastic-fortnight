const admin = require('firebase-admin');
const serviceAccount = require('./saas-68e2f-firebase-adminsdk-kui9j-5dba57b85a.json'); // <-- Replace with your actual path

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Uncomment and set if you want to specify databaseURL:
  // databaseURL: 'https://<your-project-id>.firebaseio.com'
});

const db = admin.firestore();

module.exports = db; 