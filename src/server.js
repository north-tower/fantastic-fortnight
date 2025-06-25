const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { port } = require('../config');
const productsRouter = require('../routes/products');
const purchaseRouter = require('../routes/purchase');
const cashoutRouter = require('../routes/cashout');
const transactionsRouter = require('../routes/transactions');
const webhooksRouter = require('../routes/webhooks');
const http = require('http');
const { setupWebSocket } = require('./websocket');

const app = express();
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/webhooks', webhooksRouter);
app.use(express.json());
app.use('/api/products', productsRouter);
app.use('/api/purchase', purchaseRouter);
app.use('/api/cashout', cashoutRouter);
app.use('/api/transactions', transactionsRouter);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// For Vercel: export the app
module.exports = app;

// For local development: start the server
if (process.env.NODE_ENV !== 'production') {
  const server = http.createServer(app);
  setupWebSocket(server);
  
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}