const crypto = require('crypto');
const axios = require('axios');
const { shopifyApiKey, shopifyApiSecret, shopifyStoreUrl } = require('../config');

function verifyShopifyWebhook(req, res, next) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const body = JSON.stringify(req.body);
  const digest = crypto
    .createHmac('sha256', shopifyApiSecret)
    .update(body, 'utf8')
    .digest('base64');
  if (digest !== hmac) {
    return res.status(401).json({ error: 'Invalid Shopify webhook signature' });
  }
  next();
}

async function updateShopifyProductPrice(shopifyProductId, newPrice) {
  try {
    // Fetch all variants for the product
    const productRes = await axios.get(
      `${shopifyStoreUrl}/admin/api/2023-01/products/${shopifyProductId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifyApiSecret,
          'Content-Type': 'application/json',
        },
      }
    );
    const variants = productRes.data.product.variants;
    if (!variants || variants.length === 0) {
      throw new Error('No variants found for product');
    }
    // Update each variant's price
    for (const variant of variants) {
      console.log(`Updating variant ${variant.id} price to ${newPrice}`);
      await axios.put(
        `${shopifyStoreUrl}/admin/api/2023-01/variants/${variant.id}.json`,
        { variant: { id: variant.id, price: Number(newPrice).toFixed(2) } },
        {
          headers: {
            'X-Shopify-Access-Token': shopifyApiSecret,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (err) {
    console.error('Failed to update Shopify price:', err.response?.data || err.message);
    throw new Error('Shopify price update failed');
  }
}

module.exports = { verifyShopifyWebhook, updateShopifyProductPrice }; 