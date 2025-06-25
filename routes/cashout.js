const express = require('express');
const Joi = require('joi');
const Product = require('../models/product');
const Transaction = require('../models/transaction');
const Cashout = require('../models/cashout');
const validate = require('../middleware/validate');
const { updateShopifyProductPrice } = require('../services/shopify');

const router = express.Router();

// Cashout API route for processing user cashout requests
// Handles: POST /api/cashout
// See README for details

const cashoutSchema = Joi.object({
  unique_code: Joi.string().required(),
  user_email: Joi.string().email().required(),
  email_request: Joi.string().allow('').optional(),
});

// POST /api/cashout
router.post('/', validate(cashoutSchema), async (req, res) => {
  try {
    const { unique_code, user_email, email_request } = req.body;
    console.log('Cashout request received:', { unique_code, user_email, email_request });
    // Find transaction by unique_code and user_email
    const transaction = await Transaction.getByUniqueCodeAndEmail(unique_code, user_email);
    console.log('Transaction found:', transaction);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    const product = await Product.getById(transaction.product_id);
    console.log('Product found:', product);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Calculate profit amount
    const profit_amount = parseFloat((product.current_price - transaction.purchase_price).toFixed(2));
    console.log('Profit amount calculated:', profit_amount);

    // Update product cashout count
    await Product.update(product.id, { total_cashouts: product.total_cashouts + 1 });
    // Fetch the updated product
    const updatedProduct = await Product.getById(product.id);
    // Now update price and history with the correct count
    // (Assume updatePriceAndHistory is now a Product method or handled in priceService)
    const newPrice = await Product.updatePriceAndHistory(updatedProduct, 'cashout');
    console.log('New price after cashout:', newPrice);

    // Update price on Shopify for the product
    try {
      await updateShopifyProductPrice(product.shopify_product_id, newPrice);
      console.log('Shopify price updated successfully');
    } catch (shopifyErr) {
      console.error('Failed to update Shopify price:', shopifyErr);
      return res.status(500).json({ error: 'Failed to update Shopify price' });
    }

    // Create cashout record
    const cashout = await Cashout.create({
      transaction_id: transaction.id,
      user_email,
      profit_amount,
      cashout_price: product.current_price,
      email_request,
    });
    console.log('Cashout record created:', cashout);

    res.status(201).json({ cashout });
  } catch (err) {
    console.error('Failed to process cashout:', err);
    res.status(500).json({ error: 'Failed to process cashout', details: err.message, stack: err.stack });
  }
});

module.exports = router; 