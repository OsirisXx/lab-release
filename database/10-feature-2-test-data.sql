-- Feature 2 test data. Run only in a test/staging database or with client approval.
-- The unique item code is removed by 10-remove-feature-2-test-data.sql.
-- This script creates only an available inventory item; create the reservation
-- through the application so the immediate stock-hold RPC is tested.

DELETE FROM public.transactions
WHERE item_id IN (
  SELECT id FROM public.inventory_items
  WHERE item_code = 'FEATURE2-TEST-RESERVATION'
);
DELETE FROM public.reservations
WHERE item_id IN (
  SELECT id FROM public.inventory_items
  WHERE item_code = 'FEATURE2-TEST-RESERVATION'
);
DELETE FROM public.audit_logs
WHERE details LIKE '[FEATURE2-TEST]%';
DELETE FROM public.inventory_items
WHERE item_code = 'FEATURE2-TEST-RESERVATION';

INSERT INTO public.inventory_items (
  item_code, name, category, unit, maintaining_stock, stock_available,
  condition, location
)
VALUES (
  'FEATURE2-TEST-RESERVATION',
  'TEST Feature 2 - Reservation Hold Item',
  'non-consumable',
  'pc',
  3,
  3,
  'Good',
  'TEST DATA - DELETE'
);
