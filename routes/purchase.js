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
    const product = await Product.getByShopifyId(shopify_product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Update product purchase count
    await Product.update(product.id, { total_purchases: product.total_purchases + 1 });
    // Fetch the updated product
    const updatedProduct = await Product.getById(product.id);
    // Now update price and history with the correct count
    // (Assume updatePriceAndHistory is now a Product method or handled in priceService)
    const newPrice = await Product.updatePriceAndHistory(updatedProduct, 'purchase');

    // Update price on Shopify for the product
    try {
      await updateShopifyProductPrice(shopify_product_id, newPrice);
    } catch (shopifyErr) {
      return res.status(500).json({ error: 'Failed to update Shopify price' });
    }

    // Generate unique code
    const unique_code = await generateUniqueCode();

    // Create transaction
    const transaction = await Transaction.create({
      product_id: product.id,
      unique_code,
      user_email,
      purchase_price,
      shopify_order_id,
    });

    res.status(201).json({ transaction });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process purchase' });
  }
});

module.exports = router; 