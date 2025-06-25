const db = require('../config/firebase');

const Transaction = {
  async getByShopifyOrderId(shopifyOrderId, productId) {
    const snapshot = await db.collection('transactions')
      .where('shopify_order_id', '==', shopifyOrderId)
      .where('product_id', '==', productId)
      .get();
    return snapshot.docs.length > 0 ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;
  },

  async getByUniqueCodeAndEmail(uniqueCode, userEmail) {
    const snapshot = await db.collection('transactions')
      .where('unique_code', '==', uniqueCode)
      .where('user_email', '==', userEmail)
      .get();
    return snapshot.docs.length > 0 ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;
  },

  async create(data) {
    const ref = await db.collection('transactions').add(data);
    const doc = await ref.get();
    return { id: doc.id, ...doc.data() };
  },

  async setPaid(id) {
    await db.collection('transactions').doc(id).update({ status: 'paid' });
  },

  async setCancelled(id) {
    await db.collection('transactions').doc(id).update({ status: 'cancelled' });
  }
};

module.exports = Transaction; 