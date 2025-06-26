const Product = require('../models/product');
const { broadcastPriceUpdate } = require('../src/websocket');
const Transaction = require('../models/transaction');
const { updateProductPrice, generateUniqueCode } = require('./shopifyService');
const PriceHistory = require('../models/priceHistory');

function calculateNewPrice(basePrice, totalPurchases, totalCashouts) {
  basePrice = Number(basePrice) || 0;
  totalPurchases = Number(totalPurchases) || 0;
  totalCashouts = Number(totalCashouts) || 0;
  return parseFloat((basePrice + (totalPurchases * 0.25) - (totalCashouts * 0.25)).toFixed(2));
}

async function processPurchase(orderData) {
  // orderData: Shopify order payload
  // 1. Idempotency: check if order already processed
  const shopifyOrderId = orderData.id.toString();
  const userEmail = orderData.email;
  const results = [];
  for (const item of orderData.line_items) {
    const productId = item.product_id.toString();
    const quantity = item.quantity;
    const purchasePrice = parseFloat(item.price);
    // Check if transaction already exists
    const existing = await Transaction.getByShopifyOrderId(shopifyOrderId, productId);
    if (existing) {
      results.push({ productId, status: 'duplicate' });
      continue;
    }
    // Calculate new price
    const oldPrice = existing ? existing.purchase_price : 0;
    const newPrice = calculateNewPrice(existing ? existing.base_price : 0, existing ? existing.total_purchases : 0, existing ? existing.total_cashouts : 0);
    // Update price in Shopify
    await updateProductPrice(productId, productId, newPrice);
    // Log price history
    await PriceHistory.create({
      product_id: productId,
      price: newPrice,
      action_type: 'purchase',
    });
    // Generate unique code
    const uniqueCode = generateUniqueCode();
    // Create transaction
    await Transaction.create({
      product_id: productId,
      unique_code: uniqueCode,
      user_email: userEmail,
      purchase_price: purchasePrice,
      shopify_order_id: shopifyOrderId,
      status: 'active',
    });
    // Broadcast price update
    broadcastPriceUpdate(productId, newPrice, oldPrice);
    results.push({ productId, status: 'processed', uniqueCode });
  }
  return results;
}

async function processCashout(transactionCode) {
  // TODO: Implement cashout processing logic
}

async function updatePriceHistory(productId, oldPrice, newPrice, action) {
  // TODO: Implement price history logging
}

async function processOrderUpdate(orderData) {
  // Handle order update/cancellation
  // If cancelled, reverse price increases and update transaction status
  const shopifyOrderId = orderData.id.toString();
  const results = [];
  if (orderData.cancelled_at) {
    // Order was cancelled
    for (const item of orderData.line_items) {
      const productId = item.product_id.toString();
      // Find transaction
      const transaction = await Transaction.getByShopifyOrderId(shopifyOrderId, productId);
      if (!transaction || transaction.status === 'cancelled') {
        results.push({ productId, status: 'already_cancelled' });
        continue;
      }
      // Recalculate price
      const oldPrice = transaction.purchase_price;
      const newPrice = calculateNewPrice(transaction.base_price, transaction.total_purchases, transaction.total_cashouts);
      // Update price in Shopify
      await updateProductPrice(productId, productId, newPrice);
      // Log price history
      await PriceHistory.create({
        product_id: productId,
        price: newPrice,
        action_type: 'cancel',
      });
      // Update transaction status
      await Transaction.setCancelled(transaction.id);
      // Broadcast price update
      broadcastPriceUpdate(productId, newPrice, oldPrice);
      results.push({ productId, status: 'cancelled' });
    }
  } else {
    // Not a cancellation, just an update (no-op for now)
    results.push({ status: 'updated', note: 'No cancellation detected' });
  }
  return results;
}

async function processOrderPaid(orderData) {
  // Handle payment confirmation (mark transaction as paid)
  const shopifyOrderId = orderData.id.toString();
  const results = [];
  for (const item of orderData.line_items) {
    const productId = item.product_id.toString();
    const transaction = await Transaction.getByShopifyOrderId(shopifyOrderId, productId);
    if (!transaction) {
      results.push({ productId, status: 'transaction_not_found' });
      continue;
    }
    // Mark as paid (if you track payment status)
    await Transaction.setPaid(transaction.id);
    results.push({ productId, status: 'paid' });
  }
  return results;
}

module.exports = {
  calculateNewPrice,
  processPurchase,
  processCashout,
  updatePriceHistory,
  processOrderUpdate,
  processOrderPaid,
}; 