-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Account Information Table (Static)
CREATE TABLE acct_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code VARCHAR(20) NOT NULL UNIQUE,
    account_type VARCHAR(10),
    account_name VARCHAR(20),
    acct_holder_name VARCHAR(20),
    address1 VARCHAR(20),
    address2 VARCHAR(20),
    city VARCHAR(20),
    state VARCHAR(20),
    country VARCHAR(20),
    zip NUMERIC,
    phone1 NUMERIC,
    phone2 NUMERIC,
    email VARCHAR(20),
    id_type VARCHAR(20),
    id_number NUMERIC,
    entity_type VARCHAR(20),
    account_opened DATE,
    account_closed DATE,
    beneficiary VARCHAR(20),
    emergency_contact_name VARCHAR(20),
    emergency_contact_number NUMERIC,
    updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Account Balances Table (Time-series, partitioned by month)
CREATE TABLE acct_balances (
    id UUID DEFAULT uuid_generate_v4(),
    account_code VARCHAR(20) NOT NULL,
    account_type VARCHAR(10),
    account_name VARCHAR(20),
    acct_holder_name VARCHAR(20),
    date DATE NOT NULL,
    cash_balance NUMERIC,
    stock_lmv NUMERIC,
    stock_smv NUMERIC,
    options_lmv NUMERIC,
    options_smv NUMERIC,
    account_equity NUMERIC,
    credit_balance NUMERIC,
    debit_balance NUMERIC,
    sma NUMERIC,
    fed_requirement NUMERIC,
    fed_excess_deficit NUMERIC,
    house_requirement NUMERIC,
    house_excess_deficit NUMERIC,
    exchange_requirement NUMERIC,
    exchange_excess_deficit NUMERIC,
    day_trading_bp NUMERIC,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (account_code, date)
) PARTITION BY RANGE (date);

-- Create partitions for last 2 years and future dates
CREATE TABLE acct_balances_2024 PARTITION OF acct_balances
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE acct_balances_2025 PARTITION OF acct_balances
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE acct_balances_2026 PARTITION OF acct_balances
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Trade Data Table (High volume, partitioned by month)
CREATE TABLE trade_data (
    id UUID DEFAULT uuid_generate_v4(),
    account_code VARCHAR(20) NOT NULL,
    account_type VARCHAR(10),
    account_name VARCHAR(20),
    acct_holder_name VARCHAR(20),
    date DATE NOT NULL,
    trade_id VARCHAR(20) NOT NULL,
    trade_type VARCHAR(20),
    trade_timestamp TIMESTAMP,
    security_type VARCHAR(10),
    symbol VARCHAR(30),
    underlying_symbol VARCHAR(20),
    expiration DATE,
    strike NUMERIC,
    call_put VARCHAR(4),
    stock_trade_price NUMERIC,
    option_trade_premium NUMERIC,
    stock_share_qty NUMERIC,
    option_contracts NUMERIC,
    gross_amount NUMERIC,
    commission NUMERIC,
    exch_fees NUMERIC,
    net_amount NUMERIC,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (trade_id, date)
) PARTITION BY RANGE (date);

-- Create partitions for trade data
CREATE TABLE trade_data_2024 PARTITION OF trade_data
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE trade_data_2025 PARTITION OF trade_data
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE trade_data_2026 PARTITION OF trade_data
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Account Fees and Interest Table
CREATE TABLE acct_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(20),
    date DATE NOT NULL,
    transaction_id VARCHAR(20) NOT NULL UNIQUE,
    type VARCHAR(30),
    symbol VARCHAR(20),
    amount NUMERIC,
    details VARCHAR(30),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Market Data Cache Table (for caching Alpaca data)
CREATE TABLE market_data_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(30) NOT NULL,
    data_type VARCHAR(20) NOT NULL, -- 'quote', 'bar', 'snapshot', 'fundamental'
    timeframe VARCHAR(10), -- '1Min', '5Min', '1Day', etc.
    data JSONB NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Embeddings Table (for RAG with pgvector)
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI ada-002 dimension
    metadata JSONB,
    document_type VARCHAR(50), -- 'faq', 'research', 'guide', etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- Conversation History Table (for agent memory)
CREATE TABLE conversation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) NOT NULL,
    account_code VARCHAR(20),
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX idx_acct_balances_account ON acct_balances(account_code);
CREATE INDEX idx_acct_balances_date ON acct_balances(date DESC);

CREATE INDEX idx_trade_data_account ON trade_data(account_code);
CREATE INDEX idx_trade_data_symbol ON trade_data(symbol);
CREATE INDEX idx_trade_data_date ON trade_data(date DESC);
CREATE INDEX idx_trade_data_security_type ON trade_data(security_type);
CREATE INDEX idx_trade_data_trade_type ON trade_data(trade_type);

CREATE INDEX idx_acct_fees_account ON acct_fees(account_code);
CREATE INDEX idx_acct_fees_date ON acct_fees(date DESC);
CREATE INDEX idx_acct_fees_type ON acct_fees(type);

CREATE INDEX idx_market_cache_symbol_type ON market_data_cache(symbol, data_type);
CREATE INDEX idx_market_cache_expires ON market_data_cache(expires_at);

-- Vector similarity search index (HNSW for better performance)
CREATE INDEX idx_embeddings_vector ON embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_embeddings_type ON embeddings(document_type);

CREATE INDEX idx_conversation_session ON conversation_history(session_id);
CREATE INDEX idx_conversation_created ON conversation_history(created_at DESC);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM market_data_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE acct_info IS 'Static account holder information';
COMMENT ON TABLE acct_balances IS 'Daily account balance snapshots, partitioned by date';
COMMENT ON TABLE trade_data IS 'Historical trade execution data, partitioned by date';
COMMENT ON TABLE acct_fees IS 'Account fees, commissions, and interest charges';
COMMENT ON TABLE market_data_cache IS 'Cached market data from Alpaca API with TTL';
COMMENT ON TABLE embeddings IS 'Vector embeddings for RAG semantic search';
COMMENT ON TABLE conversation_history IS 'Agent conversation memory for context';
