# Dynamic Pricing Shopify Backend

A Node.js/Express backend for a dynamic pricing Shopify store with real-time updates, Supabase/PostgreSQL integration, and secure cashout logic.

## Features
- Dynamic product pricing: price increases by $0.20 per purchase, decreases by $0.20 per cashout
- Unique code generation for each order
- Cashout system with email validation and profit calculation
- Shopify webhook integration for order and price updates
- Real-time price updates via WebSocket
- Price history tracking for charting
- Comprehensive error handling, input validation, and security best practices

## Tech Stack
- Node.js, Express.js
- PostgreSQL (via Supabase)
- Supabase Auth
- dotenv for configuration
- WebSocket for real-time updates

## Project Structure
```
/config        # Configuration files
/migrations    # Database migrations
/models        # Database models and queries
/routes        # API route handlers
/services      # Business logic (pricing, email, shopify)
/middleware    # Custom middleware functions
/utils         # Helper functions
```

## Setup Instructions
1. Clone the repository and install dependencies:
   ```bash
   git clone <repo-url>
   cd dynamic-pricing-shopify-backend
   npm install
   ```
2. Create a `.env` file in the root directory with the following variables:

```
DATABASE_URL=your_supabase_db_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_STORE_URL=your_store_url
PORT=3000
NODE_ENV=development
```

3. Run database migrations (see `/migrations` for SQL files).
4. Start the development server:
   ```bash
   npm run dev
   ```

## Testing
- Run tests with:
  ```bash
  npm test
  ```

## License
MIT 