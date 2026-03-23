-- Add RLE Guide table for editable guides
-- Run this AFTER 01-schema.sql and 02-inventory-data.sql

CREATE TABLE IF NOT EXISTS rle_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_level TEXT NOT NULL CHECK (year_level IN ('1st Year', '2nd Year', '3rd Year', '4th Year')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id)
);

-- Enable RLS
ALTER TABLE rle_guides ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can read, only SA can create/update/delete
CREATE POLICY "Anyone can view guides" ON rle_guides FOR SELECT USING (true);
CREATE POLICY "SA can insert guides" ON rle_guides FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'sa')
);
CREATE POLICY "SA can update guides" ON rle_guides FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'sa')
);
CREATE POLICY "SA can delete guides" ON rle_guides FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'sa')
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_rle_guides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rle_guides_updated_at
  BEFORE UPDATE ON rle_guides
  FOR EACH ROW
  EXECUTE FUNCTION update_rle_guides_updated_at();

-- Insert default guides
INSERT INTO rle_guides (year_level, title, description, topics) VALUES
('1st Year', 'Fundamentals of Nursing', 'Basic nursing skills, patient care, and clinical procedures', ARRAY['Vital Signs', 'Patient Assessment', 'Basic Life Support', 'Infection Control']),
('2nd Year', 'Medical-Surgical Nursing', 'Advanced patient care and surgical procedures', ARRAY['Wound Care', 'Medication Administration', 'Pre/Post-Op Care', 'Patient Monitoring']),
('3rd Year', 'Maternal & Child Health', 'Obstetric and pediatric nursing care', ARRAY['Prenatal Care', 'Labor & Delivery', 'Newborn Care', 'Pediatric Assessment']),
('4th Year', 'Community Health Nursing', 'Public health and community-based care', ARRAY['Health Promotion', 'Disease Prevention', 'Community Assessment', 'Health Education']);
