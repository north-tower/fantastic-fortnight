const crypto = require('crypto');
const { pool } = require('../config/database');

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
    // Check for collision in the database
    const { rows } = await pool.query('SELECT 1 FROM transactions WHERE unique_code = $1', [code]);
    exists = rows.length > 0;
  } while (exists);
  return code;
}

module.exports = { generateUniqueCode }; 