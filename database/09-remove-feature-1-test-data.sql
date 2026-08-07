-- Removes only the rows created by 09-feature-1-test-data.sql.
DELETE FROM public.audit_logs
WHERE details LIKE '[FEATURE1-TEST]%';

DELETE FROM public.transactions
WHERE item_id IN (
  SELECT id FROM public.inventory_items
  WHERE item_code IN ('FEATURE1-TEST-OVERDUE', 'FEATURE1-TEST-TODAY', 'FEATURE1-TEST-FUTURE', 'FEATURE1-TEST-AVAILABLE')
);

DELETE FROM public.inventory_items
WHERE item_code IN ('FEATURE1-TEST-OVERDUE', 'FEATURE1-TEST-TODAY', 'FEATURE1-TEST-FUTURE', 'FEATURE1-TEST-AVAILABLE');
