-- Removes only the rows created or used by the Feature 2 test fixture.
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
