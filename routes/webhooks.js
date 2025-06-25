const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const router = express.Router();
const { processPurchase, processOrderUpdate, processOrderPaid } = require('../services/priceService');

// Raw body parser for webhook signature verification
router.use(bodyParser.raw({ type: 'application/json' }));

// Shopify webhook signature verification middleware
const verifyShopifyWebhook = (req, res, next) => {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const body = req.body;
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('base64');
  if (hash !== hmac) {
    return res.status(401).send('Unauthorized');
  }
  next();
};

// POST /api/webhooks/order-created
router.post('/order-created', verifyShopifyWebhook, async (req, res) => {
  try {
    const orderData = JSON.parse(req.body.toString('utf8'));
    const result = await processPurchase(orderData);
    res.status(200).json({ message: 'Order created webhook processed', result });
  } catch (err) {
    console.error('Order created webhook error:', err);
    res.status(500).send('Error processing webhook');
  }
});

// POST /api/webhooks/order-updated
router.post('/order-updated', verifyShopifyWebhook, async (req, res) => {
  try {
    const orderData = JSON.parse(req.body.toString('utf8'));
    const result = await processOrderUpdate(orderData);
    res.status(200).json({ message: 'Order updated webhook processed', result });
  } catch (err) {
    console.error('Order updated webhook error:', err);
    res.status(500).send('Error processing webhook');
  }
});

// POST /api/webhooks/order-paid
router.post('/order-paid', verifyShopifyWebhook, async (req, res) => {
  try {
    const orderData = JSON.parse(req.body.toString('utf8'));
    const result = await processOrderPaid(orderData);
    res.status(200).json({ message: 'Order paid webhook processed', result });
  } catch (err) {
    console.error('Order paid webhook error:', err);
    res.status(500).send('Error processing webhook');
  }
});

module.exports = router; 