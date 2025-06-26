const crypto = require('crypto');
const db = require('../config/firebase');

function randomAlphanumeric(length) {
  return crypto.randomBytes(length)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, length);
}

async function generateUniqueCode() {
  let code, exists;
  do {
    code = `${randomAlphanumeric(3)}-${randomAlphanumeric(4)}-${randomAlphanumeric(4)}`;
    // Check for collision in Firestore
    const snapshot = await db.collection('transactions').where('unique_code', '==', code).get();
    exists = !snapshot.empty;
  } while (exists);
  return code;
}

module.exports = { generateUniqueCode }; 