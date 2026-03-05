-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_publications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Drugs policies
CREATE POLICY "Anyone can view approved drugs" ON drugs
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Pharmacists can add drugs" ON drugs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'pharmacist'
    )
  );

CREATE POLICY "Admins can approve drugs" ON drugs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Consultations policies
CREATE POLICY "Users can view their own consultations" ON consultations
  FOR SELECT USING (user_id = auth.uid() OR doctor_id = auth.uid());

CREATE POLICY "Users can create consultations" ON consultations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Doctors can update their consultations" ON consultations
  FOR UPDATE USING (doctor_id = auth.uid());

-- Chat messages policies
CREATE POLICY "Users can view messages from their consultations" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM consultations 
      WHERE id = consultation_id 
      AND (user_id = auth.uid() OR doctor_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their consultations" ON chat_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create transactions" ON transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Announcements policies
CREATE POLICY "Anyone can view active announcements" ON announcements
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Research publications policies
CREATE POLICY "Anyone can view research publications" ON research_publications
  FOR SELECT USING (true);

CREATE POLICY "Doctors can add research publications" ON research_publications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('doctor', 'admin')
    )
  );
