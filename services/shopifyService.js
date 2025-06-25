const axios = require('axios');
const crypto = require('crypto');
const { shopifyStoreUrl, shopifyApiKey, shopifyApiSecret, shopifyAccessToken } = require('../config');

async function updateProductPrice(productId, variantId, newPrice) {
  // Remove all logic related to variants and variantId. Refactor any product sync, price update, or webhook verification logic to operate only at the product level.
}

async function getProduct(productId) {
  const res = await axios.get(
    `${shopifyStoreUrl}/admin/api/2023-01/products/${productId}.json`,
    {
      headers: {
        'X-Shopify-Access-Token': shopifyAccessToken,
        'Content-Type': 'application/json',
      },
    }
  );
  return res.data.product;
}

function verifyWebhook(rawBody, signature) {
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');
  return hash === signature;
}

function generateUniqueCode() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

async function syncProductToDatabase(shopifyProduct) {
  // TODO: Implement logic to sync Shopify product and variants to your DB
}

module.exports = {
  updateProductPrice,
  getProduct,
  verifyWebhook,
  generateUniqueCode,
  syncProductToDatabase,
}; 