const WebSocket = require('ws');
const url = require('url');

let wss;
const productRooms = {};

function setupWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const location = url.parse(req.url, true);
    const productId = location.query.productId;
    if (productId) {
      if (!productRooms[productId]) productRooms[productId] = new Set();
      productRooms[productId].add(ws);
      ws.on('close', () => productRooms[productId].delete(ws));
    }
  });
}

function broadcastPriceUpdate(productId, price) {
  if (productRooms[productId]) {
    for (const ws of productRooms[productId]) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'price_update', productId, price }));
      }
    }
  }
}

module.exports = { setupWebSocket, broadcastPriceUpdate }; 