const db = require('../config/firebase');

const PriceHistory = {
  async getByProductId(productId) {
    const snapshot = await db.collection('price_history')
      .where('product_id', '==', productId)
      // .orderBy('timestamp', 'asc') // Temporarily removed until index is created
      .get();
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort in JavaScript instead
    return results.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  },

  async create(data) {
    const ref = await db.collection('price_history').add({
      ...data,
      timestamp: new Date()
    });
    const doc = await ref.get();
    return { id: doc.id, ...doc.data() };
  },

  // Removed getAggregatedByPeriod as Firestore does not support SQL-like aggregation directly.
};

module.exports = PriceHistory; 