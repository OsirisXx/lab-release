-- Feature 1 test data. Run only in a test/staging database or with client approval.
-- Every row uses item_code beginning with FEATURE1-TEST- and can be removed by
-- database/09-remove-feature-1-test-data.sql.
-- Requires at least one existing CI profile.

DO $$
DECLARE
  v_ci_id UUID;
  v_overdue_item UUID;
  v_today_item UUID;
  v_future_item UUID;
  v_overdue_tx UUID;
  v_local_today DATE;
BEGIN
  v_local_today := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
  SELECT id INTO v_ci_id
  FROM public.user_profiles
  WHERE role = 'ci'
    AND NOT EXISTS (
      SELECT 1
      FROM public.transactions
      WHERE user_id = public.user_profiles.id
        AND type = 'borrow'
        AND status IN ('approved', 'overdue')
    )
  ORDER BY created_at
  LIMIT 1;

  IF v_ci_id IS NULL THEN
    SELECT id INTO v_ci_id
    FROM public.user_profiles
    WHERE role = 'ci'
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_ci_id IS NULL THEN
    RAISE EXCEPTION 'Feature 1 test data requires at least one CI user profile';
  END IF;

  DELETE FROM public.audit_logs WHERE details LIKE '[FEATURE1-TEST]%';
  DELETE FROM public.transactions
  WHERE item_id IN (
    SELECT id FROM public.inventory_items
    WHERE item_code IN ('FEATURE1-TEST-OVERDUE', 'FEATURE1-TEST-TODAY', 'FEATURE1-TEST-FUTURE', 'FEATURE1-TEST-AVAILABLE')
  );
  DELETE FROM public.inventory_items
  WHERE item_code IN ('FEATURE1-TEST-OVERDUE', 'FEATURE1-TEST-TODAY', 'FEATURE1-TEST-FUTURE', 'FEATURE1-TEST-AVAILABLE');

  INSERT INTO public.inventory_items (item_code, name, category, unit, maintaining_stock, stock_available, condition, location)
  VALUES
    ('FEATURE1-TEST-OVERDUE', 'TEST Feature 1 - Overdue Item', 'non-consumable', 'pc', 1, 0, 'Good', 'TEST DATA - DELETE'),
    ('FEATURE1-TEST-TODAY', 'TEST Feature 1 - Due Today Item', 'non-consumable', 'pc', 1, 0, 'Good', 'TEST DATA - DELETE'),
    ('FEATURE1-TEST-FUTURE', 'TEST Feature 1 - Future Due Item', 'non-consumable', 'pc', 1, 0, 'Good', 'TEST DATA - DELETE'),
    ('FEATURE1-TEST-AVAILABLE', 'TEST Feature 1 - Available Borrow Item', 'non-consumable', 'pc', 1, 1, 'Good', 'TEST DATA - DELETE');

  SELECT id INTO v_overdue_item FROM public.inventory_items WHERE item_code = 'FEATURE1-TEST-OVERDUE';
  SELECT id INTO v_today_item FROM public.inventory_items WHERE item_code = 'FEATURE1-TEST-TODAY';
  SELECT id INTO v_future_item FROM public.inventory_items WHERE item_code = 'FEATURE1-TEST-FUTURE';

  INSERT INTO public.transactions (user_id, item_id, type, status, quantity, borrow_date, due_date)
  VALUES
    (v_ci_id, v_overdue_item, 'borrow', 'approved', 1, v_local_today - 1, v_local_today - 1),
    (v_ci_id, v_today_item, 'borrow', 'approved', 1, v_local_today, v_local_today),
    (v_ci_id, v_future_item, 'borrow', 'approved', 1, v_local_today + 3, v_local_today + 3);

  SELECT id INTO v_overdue_tx FROM public.transactions WHERE item_id = v_overdue_item;

  INSERT INTO public.extension_requests (
    transaction_id,
    requested_by,
    reason,
    previous_due_date,
    previous_due_at
  )
  VALUES (
    v_overdue_tx,
    v_ci_id,
    '[FEATURE1-TEST] Request one-day extension for overdue test transaction',
    v_local_today - 1,
    public.transaction_due_at(v_local_today - 1)
  );

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (v_ci_id, 'feature_1_test_data', '[FEATURE1-TEST] Created overdue, today, future, and extension test records', 'system');
END $$;
