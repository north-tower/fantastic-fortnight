const express = require('express');
const Product = require('../models/product');
const PriceHistory = require('../models/priceHistory');
const validate = require('../middleware/validate');
const Joi = require('joi');
const { shopifyStoreUrl, shopifyApiSecret } = require('../config');
const axios = require('axios');

const router = express.Router();

// Product Management API routes for CRUD operations and price history
// Handles: GET /, GET /:id, POST /, PUT /:id, GET /:id/price-history
// See README for details

// Validation schemas
const createProductSchema = Joi.object({
  shopify_product_id: Joi.string().required(),
  name: Joi.string().required(),
  base_price: Joi.number().min(0).required(),
});

const updateProductSchema = Joi.object({
  name: Joi.string(),
  base_price: Joi.number().min(0),
});

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await Product.getAll();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.getById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products
router.post('/', validate(createProductSchema), async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id
router.put('/:id', validate(updateProductSchema), async (req, res) => {
  try {
    const product = await Product.update(req.params.id, req.body);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// GET /api/products/:id/price-history
router.get('/:id/price-history', async (req, res) => {
  try {
    // First, try to find the product by Shopify ID
    let product = await Product.getByShopifyId(req.params.id);
    
    if (!product) {
      // If not found by Shopify ID, try as Firestore document ID
      product = await Product.getById(req.params.id);
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get price history using the Firestore document ID
    const history = await PriceHistory.getByProductId(product.id);
    res.json(history);
  } catch (err) {
    console.error('Price history error:', err);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

// POST /api/products/sync-shopify
router.post('/sync-shopify', async (req, res) => {
  try {
    let sinceId = null;
    let importedProducts = 0;
    let hasMore = true;

    while (hasMore) {
      let url = `${shopifyStoreUrl}/admin/api/2023-01/products.json?limit=250`;
      if (sinceId) url += `&since_id=${sinceId}`;
      
      const response = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': shopifyApiSecret,
          'Content-Type': 'application/json',
        },
      });
      const products = response.data.products;

      console.log(`Fetched ${products.length} products from Shopify.`);
      for (const p of products) {
        console.log(`Processing product: ${p.id} - ${p.title}`);
        if (!p.variants || p.variants.length === 0) {
          console.warn(`Product ${p.id} has no variants, skipping.`);
          continue;
        }
        let localProduct = await Product.getByShopifyId(p.id.toString());
        if (!localProduct) {
          try {
            localProduct = await Product.create({
              shopify_product_id: p.id.toString(),
              name: p.title,
              base_price: parseFloat(p.variants[0].price),
              current_price: parseFloat(p.variants[0].price),
              total_purchases: 0,
              total_cashouts: 0,
            });
            console.log('Created product:', localProduct);
            importedProducts++;
          } catch (err) {
            console.error('Error creating product:', err);
          }
        } else {
          console.log(`Product already exists: ${p.id}`);
        }
      }

      if (products.length < 250) {
        hasMore = false;
      } else {
        sinceId = products[products.length - 1].id;
      }
    }
    res.json({ message: 'Shopify products synced', importedProducts });
  } catch (err) {
    if (err.response) {
      console.error('Shopify API error data:', err.response.data);
    }
    console.error('Sync Shopify Products Error:', err);
    res.status(500).json({ error: 'Failed to sync Shopify products', details: err.message, stack: err.stack, shopify: err.response ? err.response.data : undefined });
  }
});

module.exports = router; 