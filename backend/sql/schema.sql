-- MarketPlace.Store schema
CREATE TABLE IF NOT EXISTS businesses (
  id SERIAL PRIMARY KEY,
  shop_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  gst_number TEXT,
  city TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  profile_image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_email_unique ON businesses (LOWER(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_posts_business ON posts(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business ON invoices(business_id);
