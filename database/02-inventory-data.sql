-- Import real inventory data from client's Excel files
-- Run this AFTER 01-schema.sql

-- OR/DR INVENTORY (Operating Room/Delivery Room - Non-Consumable Clinical Instruments)
INSERT INTO inventory_items (name, category, unit, stock_total, stock_available, condition, location) VALUES
('Adson Forceps', 'non-consumable', 'pcs', 15, 15, 'Good', 'OR/DRNCC1L'),
('Allis Forceps', 'non-consumable', 'pcs', 12, 12, 'Good', 'OR/DRNCC1L'),
('Babcock Forceps', 'non-consumable', 'pcs', 10, 10, 'Good', 'OR/DRNCC1L'),
('Bandage Scissors', 'non-consumable', 'pcs', 8, 8, 'Good', 'OR/DRNCC1L'),
('Bowel Clamp', 'non-consumable', 'pcs', 6, 6, 'Good', 'OR/DRNCC1L'),
('Crile Forceps', 'non-consumable', 'pcs', 20, 20, 'Good', 'OR/DRNCC1L'),
('Curved Mayo Scissors', 'non-consumable', 'pcs', 10, 10, 'Good', 'OR/DRNCC1L'),
('Dissecting Forceps', 'non-consumable', 'pcs', 15, 15, 'Good', 'OR/DRNCC1L'),
('Dressing Forceps', 'non-consumable', 'pcs', 12, 12, 'Good', 'OR/DRNCC1L'),
('Gallbladder Forceps', 'non-consumable', 'pcs', 5, 5, 'Good', 'OR/DRNCC1L'),
('Halsted Mosquito Forceps', 'non-consumable', 'pcs', 25, 25, 'Good', 'OR/DRNCC1L'),
('Hemostat', 'non-consumable', 'pcs', 30, 30, 'Good', 'OR/DRNCC1L'),
('Kocher Forceps', 'non-consumable', 'pcs', 18, 18, 'Good', 'OR/DRNCC1L'),
('Metzenbaum Scissors', 'non-consumable', 'pcs', 8, 8, 'Good', 'OR/DRNCC1L'),
('Needle Holder', 'non-consumable', 'pcs', 15, 15, 'Good', 'OR/DRNCC1L'),
('Operating Scissors', 'non-consumable', 'pcs', 10, 10, 'Good', 'OR/DRNCC1L'),
('Retractor', 'non-consumable', 'pcs', 12, 12, 'Good', 'OR/DRNCC1L'),
('Scalpel Handle', 'non-consumable', 'pcs', 20, 20, 'Good', 'OR/DRNCC1L'),
('Straight Mayo Scissors', 'non-consumable', 'pcs', 10, 10, 'Good', 'OR/DRNCC1L'),
('Tissue Forceps', 'non-consumable', 'pcs', 15, 15, 'Good', 'OR/DRNCC1L'),
('Towel Clamp', 'non-consumable', 'pcs', 20, 20, 'Good', 'OR/DRNCC1L'),
('Foerster Sponge Forceps', 'non-consumable', 'pcs', 15, 15, 'Good', 'OR/DRNCC1L'),
('Instrument Tray', 'non-consumable', 'pcs', 4, 4, 'Good', 'OR/DRNCC1L'),
('Kelly Forceps (Curved)', 'non-consumable', 'pcs', 18, 18, 'Good', 'OR/DRNCC1L');

-- NP2 CONSUMABLES (Nursing Proficiency 2)
INSERT INTO inventory_items (name, category, unit, stock_total, stock_available, condition, location) VALUES
('Disposable Gown (Non-Sterile)', 'consumable', 'pcs', 10, 10, 'Good', 'NP2C/M/SHL1'),
('Disposable Gown - Surgical Isolation Gown', 'consumable', 'pcs', 17, 17, 'Good', 'NP2C/M/SHL2'),
('Disposable Syringe w/ needle 3 cc', 'consumable', 'pcs', 2400, 2400, 'Good', 'NP2C/L/SHL3'),
('Disposable Syringe w/ needle 5 cc', 'consumable', 'pcs', 3470, 3470, 'Good', 'NP2C/L/SHL4'),
('Latex Examination Gloves (Non-Sterile, Powder Free)', 'consumable', 'box', 6, 6, 'Good', 'NP2C/M/SHL5'),
('Single Use Medical Coverall (Sterile)', 'consumable', 'pcs', 409, 409, 'Good', 'NP2C/L/SHL6');

-- CSR BORROW (Central Supply Room - Borrowable Items)
INSERT INTO inventory_items (name, category, unit, stock_total, stock_available, condition, location) VALUES
('Digital Microscope', 'non-consumable', 'pcs', 25, 25, 'Good', 'C1A'),
('Compound Microscope', 'non-consumable', 'unit', 24, 24, 'Mixed', 'C1A'),
('Female sex organ w/ torso', 'non-consumable', 'pc', 2, 2, 'Good', 'C2A'),
('UV lights sensitive fluid', 'non-consumable', 'unit', 2, 2, 'Good', 'C2A'),
('Skeleton Model', 'non-consumable', 'sets', 3, 3, 'Good', 'C2A'),
('Big toothbrush', 'non-consumable', 'pcs', 2, 2, 'Good', 'C2A'),
('Teeth model', 'non-consumable', 'pcs', 4, 4, 'Good', 'C2A'),
('Lungs model', 'non-consumable', 'pc', 1, 1, 'Good', 'C2A'),
('Heart model', 'non-consumable', 'pc', 1, 1, 'Good', 'C2A'),
('Kidney model', 'non-consumable', 'pc', 1, 1, 'Good', 'C2A'),
('Liver model', 'non-consumable', 'pc', 1, 1, 'Good', 'C2A'),
('Digestive system model', 'non-consumable', 'pc', 1, 1, 'Good', 'C2A'),
('Brain model', 'non-consumable', 'pc', 1, 1, 'Good', 'C2A'),
('Eye model', 'non-consumable', 'pc', 2, 2, 'Good', 'C2A'),
('Placenta Model', 'non-consumable', 'pc', 6, 6, 'Good', 'C2A'),
('Male Sex Organ', 'non-consumable', 'pcs', 3, 3, 'Good', 'C2A'),
('Female Sex Organ', 'non-consumable', 'pc', 1, 1, 'Good', 'C2A');

-- NP2 BORROW (Nursing Proficiency 2 - Borrowable Items)
INSERT INTO inventory_items (name, category, unit, stock_total, stock_available, condition, location) VALUES
('Adjustable Wooden Feeding Table', 'non-consumable', 'unit', 4, 4, 'Good', 'NP2/RLR/SD1'),
('Adjustable Wooden Feeding Table', 'non-consumable', 'unit', 1, 1, 'Good', 'NP2/RLR/SD2'),
('Ambu Bag Set', 'non-consumable', 'pc', 1, 1, 'Good', 'NP2/RLR/SD3'),
('Ambu Main Car Training Model', 'non-consumable', 'unit', 1, 1, 'Good', 'NP2/RLR/SD4'),
('Ambu Meccano Man', 'non-consumable', 'pc', 1, 1, 'Good', 'NP2/RLR/SD5'),
('Ambu Ventilation (Kid)', 'non-consumable', 'unit', 1, 1, 'Good', 'NP2/RLR/SD6'),
('Ambu Ventilator Monitor', 'non-consumable', 'pc', 1, 1, 'Good', 'NP2/RLR/SD7'),
('Ambu Ventilation - SN: C3J1G-1287', 'non-consumable', 'unit', 1, 1, 'Good', 'NP2/RLR/SD8'),
('Arm-Chair', 'non-consumable', 'pcs', 2, 2, 'Good', 'NP2/RLR/SD9'),
('Bed Foam', 'non-consumable', 'pcs', 3, 3, 'Good', 'NP2/RBSD10'),
('Bed Side Cabinet', 'non-consumable', 'units', 2, 2, 'Good', 'NP2/RBSD11'),
('Bed Side Table', 'non-consumable', 'units', 5, 5, 'Good', 'NP2/RBHS12'),
('Built in Shelves - 5 layers', 'non-consumable', 'unit', 1, 1, 'Good', 'NP2/RLR/SH13'),
('Comp Blinds - 8 panels', 'non-consumable', 'lot', 1, 1, 'Good', 'NP2/RBHS14'),
('Computer Set', 'non-consumable', 'set', 1, 1, 'Good', 'NP2/RBHS15');

-- CSR CONSUMABLES (with color coding and cabinet locations)
INSERT INTO inventory_items (name, category, unit, stock_total, stock_available, condition, location) VALUES
('Gauze (Light Yellow)', 'consumable', 'pcs', 12, 12, 'Good', 'CSR/CABINET/3A'),
('Cotton (Light Yellow)', 'consumable', 'pc', 24, 24, 'Good', 'CSR/CABINET/3B'),
('Betadine (Light Red/Pink)', 'consumable', 'bottle', 12, 12, 'Good', 'CSR/CABINET/5A'),
('Alcohol (Light Red/Pink)', 'consumable', 'bottle', 6, 6, 'Good', 'CSR/CABINET/5A'),
('Gloves (Orange)', 'consumable', 'pc', 5, 5, 'Good', 'CSR/CABINET'),
('Syringe (Yellow)', 'consumable', 'pc', 7, 7, 'Good', 'CSR/CABINET'),
('IV Set (Red)', 'consumable', 'pc', 3, 3, 'Good', 'CSR/CABINET'),
('Face Mask (Light Blue)', 'consumable', 'pc', 50, 50, 'Good', 'CSR/CABINET/6A');

-- Mark overdue transactions (run this periodically)
SELECT mark_overdue_transactions();
