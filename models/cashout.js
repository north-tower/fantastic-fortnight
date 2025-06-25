const db = require('../config/firebase');

const Cashout = {
  async create(data) {
    const ref = await db.collection('cashouts').add({
      ...data,
      timestamp: new Date()
    });
    const doc = await ref.get();
    return { id: doc.id, ...doc.data() };
  }
};

module.exports = Cashout; 