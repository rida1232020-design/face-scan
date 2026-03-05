-- =====================================================
-- MediPi Database Schema for Supabase
-- Run this in Supabase SQL Editor to create all tables
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users Table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pi_uid      TEXT UNIQUE NOT NULL,
  username    TEXT NOT NULL,
  email       TEXT,
  is_premium  BOOLEAN DEFAULT FALSE,
  pi_balance  DECIMAL(10, 4) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── User Profiles Table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name   TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  phone       TEXT DEFAULT '',
  age         INTEGER DEFAULT 30,
  dob         DATE,
  gender      TEXT DEFAULT '',
  address     TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ─── Scan Results Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_results (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID REFERENCES users(id) ON DELETE CASCADE,
  overall_health_score    INTEGER NOT NULL,
  overall_aging_score     INTEGER NOT NULL,
  estimated_biological_age INTEGER NOT NULL,
  face_detected           BOOLEAN DEFAULT FALSE,
  skin_analysis           JSONB DEFAULT '{}',
  eye_analysis            JSONB DEFAULT '{}',
  aging_indicators        JSONB DEFAULT '[]',
  recommendations         JSONB DEFAULT '[]',
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Transactions Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  pi_payment_id    TEXT UNIQUE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'deposit', 'withdrawal')),
  amount           DECIMAL(10, 4) NOT NULL,
  description      TEXT NOT NULL,
  description_ar   TEXT DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_pi_uid ON users(pi_uid);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_user_id ON scan_results(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_created_at ON scan_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- ─── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write (app handles auth via Pi UID)
-- In production, replace with proper JWT-based RLS policies

CREATE POLICY "Allow all for users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow all for scan_results" ON scan_results FOR ALL USING (true);
CREATE POLICY "Allow all for transactions" ON transactions FOR ALL USING (true);

-- ─── Updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
