const db = require('../config/firebase');

const Cashout = {
  async create(data) {
    const ref = await db.collection('cashouts').add({
      ...data,
      timestamp: new Date()
    });
    const doc = await ref.get();
    return { id: doc.id, ...doc.data() };
  },

  async getByTransactionId(transactionId) {
    const snapshot = await db.collection('cashouts')
      .where('transaction_id', '==', transactionId)
      .limit(1)
      .get();
    
    return snapshot.docs.length > 0 ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;
  }
};

module.exports = Cashout; 