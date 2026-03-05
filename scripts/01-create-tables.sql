-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'doctor', 'pharmacist', 'admin')),
  pi_wallet_address TEXT,
  pi_balance DECIMAL(10, 2) DEFAULT 0,
  specialization TEXT, -- for doctors
  license_number TEXT, -- for doctors and pharmacists
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create drugs table
CREATE TABLE IF NOT EXISTS drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  description TEXT,
  dosage TEXT,
  side_effects TEXT[],
  interactions TEXT[],
  price DECIMAL(10, 2),
  manufacturer TEXT,
  category TEXT,
  requires_prescription BOOLEAN DEFAULT false,
  added_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create consultations table
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  doctor_id UUID REFERENCES users(id),
  consultation_type TEXT CHECK (consultation_type IN ('ai', 'doctor')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  symptoms TEXT,
  diagnosis TEXT,
  prescription TEXT,
  notes TEXT,
  cost DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id),
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('user', 'ai', 'doctor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('payment', 'refund', 'deposit', 'withdrawal')),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  consultation_id UUID REFERENCES consultations(id),
  pi_transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create research_publications table
CREATE TABLE IF NOT EXISTS research_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  abstract TEXT,
  authors TEXT[],
  publication_date DATE,
  journal TEXT,
  doi TEXT,
  url TEXT,
  category TEXT,
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drugs_name ON drugs(name);
CREATE INDEX IF NOT EXISTS idx_drugs_category ON drugs(category);
CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_consultation_id ON chat_messages(consultation_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
