-- Insert sample drugs
INSERT INTO drugs (name, generic_name, description, dosage, side_effects, interactions, price, manufacturer, category, is_approved) VALUES
('Aspirin', 'Acetylsalicylic Acid', 'Pain reliever and fever reducer', '325mg-650mg every 4-6 hours', ARRAY['Stomach upset', 'Heartburn', 'Drowsiness'], ARRAY['Blood thinners', 'NSAIDs'], 5.99, 'Bayer', 'Pain Relief', true),
('Paracetamol', 'Acetaminophen', 'Pain and fever medication', '500mg-1000mg every 4-6 hours', ARRAY['Nausea', 'Rash', 'Liver damage (overdose)'], ARRAY['Alcohol', 'Warfarin'], 3.99, 'Generic', 'Pain Relief', true),
('Ibuprofen', 'Ibuprofen', 'Anti-inflammatory pain reliever', '200mg-400mg every 4-6 hours', ARRAY['Stomach pain', 'Heartburn', 'Dizziness'], ARRAY['Aspirin', 'Blood pressure medications'], 7.99, 'Advil', 'Pain Relief', true),
('Amoxicillin', 'Amoxicillin', 'Antibiotic for bacterial infections', '250mg-500mg three times daily', ARRAY['Diarrhea', 'Nausea', 'Rash'], ARRAY['Birth control pills', 'Methotrexate'], 12.99, 'Generic', 'Antibiotics', true),
('Omeprazole', 'Omeprazole', 'Reduces stomach acid production', '20mg once daily', ARRAY['Headache', 'Nausea', 'Diarrhea'], ARRAY['Clopidogrel', 'Warfarin'], 15.99, 'Prilosec', 'Digestive Health', true),
('Metformin', 'Metformin HCl', 'Type 2 diabetes medication', '500mg-1000mg twice daily', ARRAY['Nausea', 'Diarrhea', 'Stomach upset'], ARRAY['Alcohol', 'Contrast dye'], 8.99, 'Generic', 'Diabetes', true),
('Lisinopril', 'Lisinopril', 'Blood pressure medication', '10mg-40mg once daily', ARRAY['Dizziness', 'Cough', 'Headache'], ARRAY['Potassium supplements', 'NSAIDs'], 9.99, 'Generic', 'Cardiovascular', true),
('Atorvastatin', 'Atorvastatin', 'Cholesterol-lowering medication', '10mg-80mg once daily', ARRAY['Muscle pain', 'Headache', 'Nausea'], ARRAY['Grapefruit juice', 'Cyclosporine'], 18.99, 'Lipitor', 'Cardiovascular', true);

-- Insert sample announcements
INSERT INTO announcements (title, content, is_active) VALUES
('Welcome to MediPi', 'Your trusted AI-powered medical companion. Get instant drug information and medical consultations.', true),
('New Feature: Doctor Consultations', 'You can now consult with verified doctors directly through our platform!', true),
('Safety First', 'Always consult with healthcare professionals before starting any new medication.', true);

-- Insert sample research publications
INSERT INTO research_publications (title, abstract, authors, publication_date, journal, category) VALUES
('AI in Healthcare: Current Applications', 'A comprehensive review of artificial intelligence applications in modern healthcare systems.', ARRAY['Dr. Sarah Johnson', 'Dr. Michael Chen'], '2024-01-15', 'Journal of Medical AI', 'Artificial Intelligence'),
('Drug Interactions: A Clinical Guide', 'Understanding and preventing dangerous drug interactions in clinical practice.', ARRAY['Dr. Ahmed Hassan', 'Dr. Emily Rodriguez'], '2023-12-20', 'Clinical Pharmacology Review', 'Pharmacology'),
('Telemedicine Best Practices', 'Guidelines for effective telemedicine consultations and patient care.', ARRAY['Dr. James Wilson'], '2024-02-10', 'Digital Health Journal', 'Telemedicine');
