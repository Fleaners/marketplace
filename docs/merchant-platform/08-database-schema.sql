-- Merchant platform schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS sellers (
  id SERIAL PRIMARY KEY,
  shop_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  city TEXT,
  gst_number TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_stock', -- in_stock|running_low|out_of_stock|paused
  image_url TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  inquiry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_visits (
  id BIGSERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  visitor_city TEXT,
  device_type TEXT,
  traffic_source TEXT,
  visited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_threads (
  id BIGSERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  latest_message TEXT,
  latest_message_at TIMESTAMPTZ DEFAULT NOW(),
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  thread_id BIGINT NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL, -- seller|buyer|system
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  seller_id INTEGER,
  event_name TEXT NOT NULL,
  product_id INTEGER,
  city TEXT,
  device_type TEXT,
  traffic_source TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_recommendations (
  id BIGSERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL, -- trend|inventory|response|growth
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 3,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_visits_seller_time ON product_visits(seller_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_seller_time ON message_threads(seller_id, latest_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_seller_time ON analytics_events(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recos_seller_time ON ai_recommendations(seller_id, created_at DESC);
