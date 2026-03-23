-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ci', 'sa')),
  ci_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_code TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('consumable', 'non-consumable')),
  unit TEXT NOT NULL,
  stock_total INTEGER NOT NULL DEFAULT 0,
  stock_available INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL CHECK (condition IN ('Good', 'Defective', 'Mixed', 'Expired')),
  location TEXT NOT NULL,
  image_url TEXT,
  expiration_date DATE,
  last_restock_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT stock_check CHECK (stock_available <= stock_total)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('borrow', 'return', 'reserve')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'returned', 'overdue', 'rejected')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  borrow_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_in TIME NOT NULL,
  time_out TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('inventory', 'transaction', 'user', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_item_id ON reservations(item_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);

-- Function to auto-generate CI ID
CREATE OR REPLACE FUNCTION generate_ci_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'ci' AND NEW.ci_id IS NULL THEN
    NEW.ci_id := 'CI' || LPAD(NEXTVAL('ci_id_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for CI IDs
CREATE SEQUENCE IF NOT EXISTS ci_id_seq START 1;

-- Trigger to auto-generate CI ID on user insert
CREATE TRIGGER trigger_generate_ci_id
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_ci_id();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for inventory_items updated_at
CREATE TRIGGER trigger_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for transactions updated_at
CREATE TRIGGER trigger_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user has unreturned items
CREATE OR REPLACE FUNCTION has_unreturned_items(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM transactions
    WHERE user_id = p_user_id
    AND status IN ('approved', 'overdue')
    AND type = 'borrow'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update stock when transaction is approved
CREATE OR REPLACE FUNCTION update_stock_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- When borrow is approved, reduce stock
  IF NEW.type = 'borrow' AND NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE inventory_items
    SET stock_available = stock_available - NEW.quantity
    WHERE id = NEW.item_id;
  END IF;

  -- When item is returned, increase stock
  IF NEW.status = 'returned' AND OLD.status IN ('approved', 'overdue') THEN
    UPDATE inventory_items
    SET stock_available = stock_available + NEW.quantity
    WHERE id = NEW.item_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stock
CREATE TRIGGER trigger_update_stock
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_transaction();

-- Function to check overdue transactions
CREATE OR REPLACE FUNCTION mark_overdue_transactions()
RETURNS void AS $$
BEGIN
  UPDATE transactions
  SET status = 'overdue'
  WHERE status = 'approved'
  AND type = 'borrow'
  AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Disable RLS for development (bare minimum setup)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Note: Sample users will be created through Supabase Auth registration
-- The user_profiles table will be populated via trigger when users sign up

-- Insert sample inventory
INSERT INTO inventory_items (name, category, unit, stock_total, stock_available, condition, location) VALUES
  ('Stethoscope', 'non-consumable', 'pc', 30, 22, 'Good', 'C1A'),
  ('Blood Pressure Apparatus', 'non-consumable', 'set', 15, 8, 'Good', 'C1A'),
  ('Penlight', 'non-consumable', 'pc', 50, 41, 'Mixed', 'C1A'),
  ('Thermometer (Digital)', 'non-consumable', 'pc', 20, 14, 'Good', 'OR/DRN'),
  ('Disposable Gloves (M)', 'consumable', 'box', 100, 67, 'Good', 'C1L'),
  ('Face Mask (Surgical)', 'consumable', 'box', 80, 52, 'Good', 'C1L'),
  ('Syringe 5ml', 'consumable', 'pc', 500, 340, 'Good', 'C1L'),
  ('IV Set (Macro)', 'consumable', 'pc', 200, 145, 'Good', 'C1L'),
  ('Wheelchair', 'non-consumable', 'pc', 5, 3, 'Good', 'OR/DRN'),
  ('Hospital Bed Model', 'non-consumable', 'pc', 8, 6, 'Mixed', 'NCC1L')
ON CONFLICT DO NOTHING;
