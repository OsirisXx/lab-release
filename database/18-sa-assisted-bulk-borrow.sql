-- Feature 18: Atomic SA-assisted borrowing for multiple marked RLE items.
-- Apply after database/17-sa-assisted-borrow.sql.
--
-- This flow creates one immediately active borrow transaction per marked item
-- in a single atomic operation. All stock checks, deductions, transactions,
-- student tags, and the audit entry commit together or roll back together.

CREATE OR REPLACE FUNCTION public.create_bulk_borrow_for_ci(
  p_item_ids UUID[],
  p_quantities INTEGER[],
  p_borrower_id UUID,
  p_student_tags JSONB DEFAULT '[]'::JSONB
)
RETURNS SETOF public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id UUID := auth.uid();
  v_creator_role TEXT;
  v_borrower_role TEXT;
  v_count INTEGER := COALESCE(array_length(p_item_ids, 1), 0);
  v_locked_count INTEGER := 0;
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
  v_due_date DATE := v_today + 2;
  v_student_tags JSONB := COALESCE(p_student_tags, '[]'::JSONB);
  v_request RECORD;
  v_item public.inventory_items%ROWTYPE;
  v_result public.transactions%ROWTYPE;
  v_student JSONB;
  v_transaction_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT role INTO v_creator_role
  FROM public.user_profiles
  WHERE id = v_creator_id;

  IF v_creator_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can create assisted borrows';
  END IF;

  SELECT role INTO v_borrower_role
  FROM public.user_profiles
  WHERE id = p_borrower_id;

  IF v_borrower_role IS DISTINCT FROM 'ci' THEN
    RAISE EXCEPTION 'A registered Clinical Instructor must be selected';
  END IF;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'Select at least one item';
  END IF;

  IF COALESCE(array_length(p_quantities, 1), 0) <> v_count THEN
    RAISE EXCEPTION 'Each selected item must have a quantity';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_item_ids) AS input(item_id)
    WHERE input.item_id IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM unnest(p_quantities) AS input(quantity)
    WHERE input.quantity IS NULL OR input.quantity <= 0
  ) THEN
    RAISE EXCEPTION 'Every selected item must have a positive quantity';
  END IF;

  IF EXISTS (
    SELECT input.item_id
    FROM unnest(p_item_ids) AS input(item_id)
    GROUP BY input.item_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'An item cannot be selected more than once';
  END IF;

  PERFORM public.validate_optional_student_tag_input(v_student_tags);

  -- Match the lock used by the existing assisted, approval, and reservation
  -- issuance paths. The active-borrow check is intentionally performed once
  -- before the batch is created.
  PERFORM public.lock_active_borrower(p_borrower_id);

  IF EXISTS (
    SELECT 1
    FROM public.transactions
    WHERE user_id = p_borrower_id
      AND type = 'borrow'
      AND status IN ('approved', 'overdue')
  ) THEN
    RAISE EXCEPTION 'Cannot borrow new items while the Clinical Instructor has unreturned items';
  END IF;

  -- Lock every item in deterministic order and validate the entire batch
  -- before changing any stock. Any exception aborts the whole RPC transaction.
  FOR v_request IN
    SELECT input.item_id, input.quantity
    FROM unnest(p_item_ids, p_quantities) AS input(item_id, quantity)
    ORDER BY input.item_id
  LOOP
    SELECT * INTO v_item
    FROM public.inventory_items
    WHERE id = v_request.item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'One of the selected inventory items no longer exists';
    END IF;

    v_locked_count := v_locked_count + 1;

    IF v_item.stock_available < v_request.quantity THEN
      RAISE EXCEPTION 'Only % unit(s) of % are available', v_item.stock_available, v_item.name;
    END IF;
  END LOOP;

  IF v_locked_count <> v_count THEN
    RAISE EXCEPTION 'One of the selected inventory items no longer exists';
  END IF;

  -- All item locks are held through commit. Multiple rows are created in this
  -- one operation, so the next assisted borrow for this CI remains blocked
  -- until all active rows are returned through the existing return flow.
  FOR v_request IN
    SELECT input.item_id, input.quantity
    FROM unnest(p_item_ids, p_quantities) AS input(item_id, quantity)
    ORDER BY input.item_id
  LOOP
    UPDATE public.inventory_items
    SET stock_available = stock_available - v_request.quantity
    WHERE id = v_request.item_id;

    INSERT INTO public.transactions (
      user_id,
      item_id,
      type,
      status,
      quantity,
      borrow_date,
      due_date,
      due_at,
      stock_deducted
    )
    VALUES (
      p_borrower_id,
      v_request.item_id,
      'borrow',
      'approved',
      v_request.quantity,
      v_today,
      v_due_date,
      public.transaction_due_at(v_due_date),
      TRUE
    )
    RETURNING * INTO v_result;

    v_transaction_ids := v_transaction_ids || v_result.id;

    FOR v_student IN SELECT value FROM jsonb_array_elements(v_student_tags)
    LOOP
      INSERT INTO public.transaction_student_tags (
        transaction_id,
        student_name,
        student_number
      )
      VALUES (
        v_result.id,
        trim(v_student->>'name'),
        NULLIF(trim(v_student->>'student_number'), '')
      );
    END LOOP;

    RETURN NEXT v_result;
  END LOOP;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    v_creator_id,
    'Created SA-Assisted Bulk Borrow',
    jsonb_build_object(
      'created_by', v_creator_id,
      'borrower_id', p_borrower_id,
      'transaction_ids', to_jsonb(v_transaction_ids),
      'item_ids', to_jsonb(p_item_ids),
      'quantities', to_jsonb(p_quantities),
      'borrow_date', v_today,
      'due_date', v_due_date,
      'due_at', public.transaction_due_at(v_due_date),
      'student_tags', v_student_tags
    )::TEXT,
    'transaction'
  );

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.create_bulk_borrow_for_ci(UUID[], INTEGER[], UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_bulk_borrow_for_ci(UUID[], INTEGER[], UUID, JSONB) TO authenticated;
