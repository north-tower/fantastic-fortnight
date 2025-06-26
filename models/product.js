const db = require('../config/firebase');
const { calculateCurrentPrice } = require('../utils/pricing');

const Product = {
  async getById(id) {
    const doc = await db.collection('products').doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async getAll() {
    const snapshot = await db.collection('products').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getByShopifyId(shopifyProductId) {
    const doc = await db.collection('products').where('shopify_product_id', '==', shopifyProductId).get();
    return doc.docs.length > 0 ? { id: doc.docs[0].id, ...doc.docs[0].data() } : null;
  },

  async create(data) {
    const ref = await db.collection('products').add(data);
    const doc = await ref.get();
    return { id: doc.id, ...doc.data() };
  },

  async update(id, data) {
    await db.collection('products').doc(id).update(data);
    const doc = await db.collection('products').doc(id).get();
    return { id: doc.id, ...doc.data() };
  },

  async updatePriceAndHistory(product, actionType) {
    console.log('Calculating price with:', {
      base_price: product.base_price,
      total_purchases: product.total_purchases,
      total_cashouts: product.total_cashouts
    });
    const newPrice = calculateCurrentPrice(product.base_price, product.total_purchases, product.total_cashouts);
    await db.collection('products').doc(product.id).update({ current_price: newPrice });
    await db.collection('price_history').add({
      product_id: product.id,
      price: newPrice,
      action_type: actionType,
      timestamp: new Date(),
      total_purchases: product.total_purchases,
      total_cashouts: product.total_cashouts
    });
    return newPrice;
  },

  async getPriceHistory(productId) {
    const snapshot = await db.collection('price_history')
      .where('product_id', '==', productId)
      .orderBy('timestamp', 'asc')
      .get();

    const history = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        price: data.price,
        action_type: data.action_type,
        timestamp: data.timestamp,
        total_purchases: data.total_purchases || 0,  // Default to 0 if undefined
        total_cashouts: data.total_cashouts || 0     // Default to 0 if undefined
      };
    });

    console.log('Price history retrieved:', history);  // Debug log
    return history;
  },
};

module.exports = Product; 