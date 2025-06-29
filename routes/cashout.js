const express = require('express');
const Joi = require('joi');
const Product = require('../models/product');
const Transaction = require('../models/transaction');
const Cashout = require('../models/cashout');
const validate = require('../middleware/validate');
const { updateShopifyProductPrice } = require('../services/shopify');
const db = require('../config/firebase');

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
    
    // Check if this transaction has already been cashed out
    const existingCashout = await Cashout.getByTransactionId(transaction.id);
    if (existingCashout) {
      return res.status(400).json({ 
        error: 'Transaction already cashed out', 
        cashout_id: existingCashout.id,
        cashed_out_at: existingCashout.timestamp 
      });
    }
    
    const product = await Product.getByShopifyId(transaction.product_id);
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
    const cashoutData = {
      transaction_id: transaction.id,
      user_email,
      profit_amount,
      cashout_price: product.current_price,
    };
    
    // Only add email_request if it's not undefined
    if (email_request !== undefined) {
      cashoutData.email_request = email_request;
    }
    
    const cashout = await Cashout.create(cashoutData);
    console.log('Cashout record created:', cashout);

    // Mark transaction as cashed out
    await Transaction.setCashedOut(transaction.id);
    console.log('Transaction marked as cashed out');

    res.status(201).json({ cashout });
  } catch (err) {
    console.error('Failed to process cashout:', err);
    res.status(500).json({ error: 'Failed to process cashout', details: err.message, stack: err.stack });
  }
});

// GET /api/cashout - List all cashouts
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, user_email, transaction_id } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    console.log('Cashout list request:', { page: pageNum, limit: limitNum, user_email, transaction_id });
    
    let query = db.collection('cashouts');
    
    // Add filters if provided
    if (user_email) {
      query = query.where('user_email', '==', user_email);
    }
    
    if (transaction_id) {
      query = query.where('transaction_id', '==', transaction_id);
    }
    
    // Get total count for pagination
    const countSnapshot = await query.get();
    const total = countSnapshot.docs.length;
    
    // Apply pagination
    const offset = (pageNum - 1) * limitNum;
    const cashoutsSnapshot = await query
      .orderBy('timestamp', 'desc')
      .limit(limitNum)
      .offset(offset)
      .get();
    
    const cashouts = [];
    
    for (const doc of cashoutsSnapshot.docs) {
      const cashoutData = { id: doc.id, ...doc.data() };
      
      // Get transaction details for each cashout
      try {
        const transactionDoc = await db.collection('transactions').doc(cashoutData.transaction_id).get();
        if (transactionDoc.exists) {
          cashoutData.transaction = { id: transactionDoc.id, ...transactionDoc.data() };
        }
      } catch (err) {
        console.error('Error fetching transaction for cashout:', cashoutData.id, err);
        cashoutData.transaction = null;
      }
      
      // Get product details for each cashout
      if (cashoutData.transaction) {
        try {
          const productDoc = await db.collection('products')
            .where('shopify_product_id', '==', cashoutData.transaction.product_id)
            .limit(1)
            .get();
          
          if (!productDoc.empty) {
            const productData = productDoc.docs[0].data();
            cashoutData.product = { 
              id: productDoc.docs[0].id, 
              ...productData 
            };
          }
        } catch (err) {
          console.error('Error fetching product for cashout:', cashoutData.id, err);
          cashoutData.product = null;
        }
      }
      
      cashouts.push(cashoutData);
    }
    
    const response = {
      cashouts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      }
    };
    
    console.log(`Returning ${cashouts.length} cashouts out of ${total} total`);
    res.json(response);
    
  } catch (err) {
    console.error('Failed to fetch cashouts:', err);
    res.status(500).json({ error: 'Failed to fetch cashouts', details: err.message });
  }
});

// POST /api/cashout/:id/mark-paid - Mark cashout as paid
router.post('/:id/mark-paid', async (req, res) => {
  try {
    const cashoutId = req.params.id;
    console.log('Marking cashout as paid:', cashoutId);
    
    // Get the cashout
    const cashoutDoc = await db.collection('cashouts').doc(cashoutId).get();
    if (!cashoutDoc.exists) {
      return res.status(404).json({ error: 'Cashout not found' });
    }
    
    const cashoutData = cashoutDoc.data();
    
    // Check if already paid
    if (cashoutData.status === 'paid') {
      return res.status(400).json({ error: 'Cashout is already marked as paid' });
    }
    
    // Update cashout status to paid
    await db.collection('cashouts').doc(cashoutId).update({
      status: 'paid',
      paid_at: new Date(),
      paid_by: req.body.admin_user || 'admin' // You can add admin authentication later
    });
    
    console.log('Cashout marked as paid:', cashoutId);
    
    // Get updated cashout data
    const updatedDoc = await db.collection('cashouts').doc(cashoutId).get();
    const updatedCashout = { id: updatedDoc.id, ...updatedDoc.data() };
    
    res.json({ 
      success: true, 
      message: 'Cashout marked as paid successfully',
      cashout: updatedCashout 
    });
    
  } catch (err) {
    console.error('Failed to mark cashout as paid:', err);
    res.status(500).json({ error: 'Failed to mark cashout as paid', details: err.message });
  }
});

module.exports = router; 