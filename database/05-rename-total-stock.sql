-- Rename stock_total to maintaining_stock in inventory_items table

ALTER TABLE inventory_items 
RENAME COLUMN stock_total TO maintaining_stock;

-- Update any views or functions that reference stock_total (if any)
-- This ensures backward compatibility and proper naming throughout the system
