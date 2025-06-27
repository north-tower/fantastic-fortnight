const Product = require('../models/product');
const { broadcastPriceUpdate } = require('../src/websocket');
const Transaction = require('../models/transaction');
const { updateShopifyProductPrice } = require('../services/shopify');
const PriceHistory = require('../models/priceHistory');
const { generateUniqueCode } = require('../utils/codeGenerator');

function calculateNewPrice(basePrice, totalPurchases, totalCashouts) {
  basePrice = Number(basePrice) || 0;
  totalPurchases = Number(totalPurchases) || 0;
  totalCashouts = Number(totalCashouts) || 0;
  return parseFloat((basePrice + (totalPurchases * 0.25) - (totalCashouts * 0.25)).toFixed(2));
}

async function processPurchase(orderData) {
  // orderData: Shopify order payload
  const shopifyOrderId = orderData.id.toString();
  const userEmail = orderData.email;
  const results = [];
  
  for (const item of orderData.line_items) {
    const productId = item.product_id.toString();
    const quantity = item.quantity;
    const purchasePrice = parseFloat(item.price);
    
    // 1. Idempotency: check if order already processed FIRST
    const existing = await Transaction.getByShopifyOrderId(shopifyOrderId, productId);
    if (existing) {
      console.log(`Order ${shopifyOrderId} for product ${productId} already processed, skipping`);
      results.push({ productId, status: 'duplicate' });
      continue;
    }
    
    // 2. Fetch product from Firestore
    const product = await Product.getByShopifyId(productId);
    if (!product) {
      console.error('Product not found for productId:', productId);
      results.push({ productId, status: 'product_not_found' });
      continue;
    }
    
    console.log('Product before purchase:', product);
    
    // 3. Increment total_purchases
    await Product.update(product.id, { total_purchases: (product.total_purchases || 0) + 1 });
    
    // 4. Fetch updated product
    const updatedProduct = await Product.getById(product.id);
    console.log('Product after incrementing total_purchases:', updatedProduct);
    
    // 5. Calculate new price
    const newPrice = calculateNewPrice(updatedProduct.base_price, updatedProduct.total_purchases, updatedProduct.total_cashouts);
    console.log('Calculated new price:', newPrice);
    
    // 6. Update product price in Firestore
    await Product.update(product.id, { current_price: newPrice });
    
    // 7. Log price history
    await PriceHistory.create({
      product_id: product.id,
      price: newPrice,
      action_type: 'purchase',
      total_purchases: updatedProduct.total_purchases,
      total_cashouts: updatedProduct.total_cashouts,
      timestamp: new Date()
    });
    
    // 8. Update price in Shopify
    try {
      await updateShopifyProductPrice(productId, newPrice);
      console.log('Shopify price updated for productId:', productId, 'to', newPrice);
    } catch (err) {
      console.error('Failed to update Shopify price for productId:', productId, err);
    }
    
    // 9. Generate unique code
    const uniqueCode = await generateUniqueCode();
    
    // 10. Create transaction
    await Transaction.create({
      product_id: productId,
      unique_code: uniqueCode,
      user_email: userEmail,
      purchase_price: purchasePrice,
      shopify_order_id: shopifyOrderId,
      status: 'active',
    });
    
    // 11. Broadcast price update
    broadcastPriceUpdate(productId, newPrice, product.current_price);
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
      await updateShopifyProductPrice(productId, newPrice);
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