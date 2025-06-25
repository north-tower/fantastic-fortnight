-- products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopify_product_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2) NOT NULL,
    total_purchases INTEGER DEFAULT 0,
    total_cashouts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    unique_code VARCHAR(20) UNIQUE NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    purchase_price DECIMAL(10,2) NOT NULL,
    shopify_order_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'cashed_out')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- cashouts table
CREATE TABLE IF NOT EXISTS cashouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    cashout_price DECIMAL(10,2) NOT NULL,
    profit_amount DECIMAL(10,2) NOT NULL,
    processed_at TIMESTAMP DEFAULT NOW(),
    email_request TEXT
);

-- price_history table
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    action_type VARCHAR(20) CHECK (action_type IN ('purchase', 'cashout')),
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_shopify_product_id ON products(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_unique_code ON transactions(unique_code);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id); 