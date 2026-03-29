-- Add equipment field to rle_guides table
-- This allows each RLE guide to list suggested equipment items

ALTER TABLE rle_guides 
ADD COLUMN IF NOT EXISTS equipment TEXT[] DEFAULT '{}';

-- Update existing guides with sample equipment
UPDATE rle_guides 
SET equipment = ARRAY[
  'Stethoscope',
  'Blood Pressure Apparatus',
  'Thermometer',
  'Pulse Oximeter',
  'Penlight',
  'Bandage Scissors',
  'Alcohol',
  'Cotton Balls',
  'Gloves'
]
WHERE year_level = '1st Year' AND title = 'Fundamentals of Nursing';

UPDATE rle_guides 
SET equipment = ARRAY[
  'Surgical Instruments Set',
  'IV Stand',
  'Catheter',
  'Wound Dressing Kit',
  'Suture Kit',
  'Sterile Gloves',
  'Gauze',
  'Surgical Tape',
  'Syringe'
]
WHERE year_level = '2nd Year' AND title = 'Medical-Surgical Nursing';

UPDATE rle_guides 
SET equipment = ARRAY[
  'Fetal Doppler',
  'Infant Scale',
  'Pediatric Stethoscope',
  'Baby Thermometer',
  'Newborn Assessment Kit',
  'Infant Resuscitation Bag',
  'Umbilical Cord Clamp',
  'Baby Blanket'
]
WHERE year_level = '3rd Year' AND title = 'Maternal & Child Health';
