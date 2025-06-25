const express = require('express');
const Transaction = require('../models/transaction');
const router = express.Router();

// GET /api/transactions/:code - Verify transaction code
router.get('/:code', async (req, res) => {
  try {
    const transaction = await Transaction.getByCode(req.params.code);
    if (!transaction) return res.status(404).json({ error: 'Invalid or expired code' });
    res.json({ valid: true, transaction });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

module.exports = router; 