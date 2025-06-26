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
const webhooksRouter = require('../routes/webhooks')
const http = require('http');
const { setupWebSocket } = require('./websocket');

const app = express();
app.set('trust proxy', 1);

// Use express.raw for Shopify webhooks to capture raw body for HMAC verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// Use express.json for all other routes
app.use(express.json());

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TODO: Mount routes here
app.use('/api/products', productsRouter);
app.use('/api/purchase', purchaseRouter);
app.use('/api/cashout', cashoutRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/webhooks', webhooksRouter);
// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
setupWebSocket(server);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 