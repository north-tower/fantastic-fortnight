const express = require('express');
const Joi = require('joi');
const Product = require('../models/product');
const Transaction = require('../models/transaction');
const { generateUniqueCode } = require('../utils/codeGenerator');
const validate = require('../middleware/validate');
const { updateShopifyProductPrice } = require('../services/shopify');

const router = express.Router();

// Purchase API route for handling Shopify purchase webhooks
// Handles: POST /api/purchase
// See README for details

const purchaseSchema = Joi.object({
  shopify_product_id: Joi.string().required(),
  user_email: Joi.string().email().required(),
  purchase_price: Joi.number().min(0).required(),
  shopify_order_id: Joi.string().required(),
});

// POST /api/purchase
router.post('/', validate(purchaseSchema), async (req, res) => {
  try {
    const { shopify_product_id, user_email, purchase_price, shopify_order_id } = req.body;
    console.log('Purchase request received:', { shopify_product_id, user_email, purchase_price, shopify_order_id });
    
    const product = await Product.getByShopifyId(shopify_product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    console.log('Product found:', product.id);

    // Update product purchase count
    await Product.update(product.id, { total_purchases: product.total_purchases + 1 });
    console.log('Product purchase count updated');
    
    // Fetch the updated product
    const updatedProduct = await Product.getById(product.id);
    console.log('Updated product fetched');
    
    // Now update price and history with the correct count
    const newPrice = await Product.updatePriceAndHistory(updatedProduct, 'purchase');
    console.log('Price and history updated, new price:', newPrice);

    // Update price on Shopify for the product
    try {
      await updateShopifyProductPrice(shopify_product_id, newPrice);
      console.log('Shopify price updated successfully');
    } catch (shopifyErr) {
      console.error('Shopify price update failed:', shopifyErr);
      return res.status(500).json({ error: 'Failed to update Shopify price', details: shopifyErr.message });
    }

    // Generate unique code
    const unique_code = await generateUniqueCode();
    console.log('Unique code generated:', unique_code);

    // Create transaction
    const transaction = await Transaction.create({
      product_id: product.id,
      unique_code,
      user_email,
      purchase_price,
      shopify_order_id,
    });
    console.log('Transaction created:', transaction.id);

    res.status(201).json({ transaction });
  } catch (err) {
    console.error('Purchase processing error:', err);
    res.status(500).json({ error: 'Failed to process purchase', details: err.message, stack: err.stack });
  }
});

module.exports = router; 