-- Feature 5/6 follow-up: automatic two-calendar-day borrow due dates.
-- Apply after database/14-stock-validation.sql.
-- Non-reservation borrow requests are due two local calendar days after the
-- request/approval date at 9:00 PM Asia/Manila. Reservation-issued borrows
-- keep their selected reservation end date.

CREATE OR REPLACE FUNCTION public.create_borrow_request(
  p_item_id UUID,
  p_quantity INTEGER
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_item public.inventory_items%ROWTYPE;
  v_result public.transactions%ROWTYPE;
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
  v_due_date DATE;
BEGIN
  v_due_date := v_today + 2;

  SELECT role INTO v_role FROM public.user_profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'ci' THEN
    RAISE EXCEPTION 'Only Clinical Instructors can submit borrow requests';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Borrow quantity must be greater than zero';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.transactions
    WHERE user_id = v_user_id
      AND type = 'borrow'
      AND status IN ('approved', 'overdue')
  ) THEN
    RAISE EXCEPTION 'Cannot borrow new items while you have unreturned items';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;
  IF v_item.stock_available < p_quantity THEN
    RAISE EXCEPTION 'Only % unit(s) of % are available', v_item.stock_available, v_item.name;
  END IF;

  INSERT INTO public.transactions (
    user_id, item_id, type, status, quantity, borrow_date, due_date, due_at
  )
  VALUES (
    v_user_id, p_item_id, 'borrow', 'pending', p_quantity,
    v_today, v_due_date, public.transaction_due_at(v_due_date)
  )
  RETURNING * INTO v_result;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    v_user_id,
    'Submitted Borrow Request',
    jsonb_build_object(
      'transaction_id', v_result.id,
      'item_id', p_item_id,
      'quantity', p_quantity,
      'available_stock_at_request', v_item.stock_available,
      'due_date', v_due_date,
      'due_at', v_result.due_at
    )::TEXT,
    'transaction'
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_borrow_request(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_borrow_request(UUID, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_bulk_borrow_requests(
  p_item_ids UUID[],
  p_quantities INTEGER[]
)
RETURNS SETOF public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_item public.inventory_items%ROWTYPE;
  v_transaction public.transactions%ROWTYPE;
  v_index INTEGER;
  v_count INTEGER;
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
  v_due_date DATE;
BEGIN
  v_due_date := v_today + 2;

  SELECT role INTO v_role FROM public.user_profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'ci' THEN
    RAISE EXCEPTION 'Only Clinical Instructors can submit bulk borrow requests';
  END IF;

  v_count := COALESCE(array_length(p_item_ids, 1), 0);
  IF v_count < 1 THEN
    RAISE EXCEPTION 'Select at least one available item';
  END IF;
  IF array_length(p_quantities, 1) IS DISTINCT FROM v_count THEN
    RAISE EXCEPTION 'Each selected item must have a quantity';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_item_ids) AS selected(item_id)
    GROUP BY selected.item_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'An item cannot be selected more than once';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_quantities) AS selected(quantity)
    WHERE selected.quantity IS NULL OR selected.quantity <= 0
  ) THEN
    RAISE EXCEPTION 'Bulk borrow quantities must be greater than zero';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.transactions
    WHERE user_id = v_user_id
      AND type = 'borrow'
      AND status IN ('approved', 'overdue')
  ) THEN
    RAISE EXCEPTION 'Cannot borrow new items while you have unreturned items';
  END IF;

  FOR v_index IN 1..v_count
  LOOP
    SELECT * INTO v_item
    FROM public.inventory_items
    WHERE id = p_item_ids[v_index]
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'One of the selected inventory items no longer exists';
    END IF;
    IF v_item.stock_available < p_quantities[v_index] THEN
      RAISE EXCEPTION 'Only % unit(s) of % are available', v_item.stock_available, v_item.name;
    END IF;

    INSERT INTO public.transactions (
      user_id, item_id, type, status, quantity, borrow_date, due_date, due_at
    )
    VALUES (
      v_user_id, v_item.id, 'borrow', 'pending', p_quantities[v_index],
      v_today, v_due_date, public.transaction_due_at(v_due_date)
    )
    RETURNING * INTO v_transaction;

    RETURN NEXT v_transaction;
  END LOOP;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    v_user_id,
    'Submitted Bulk RLE Borrow Request',
    jsonb_build_object(
      'item_ids', to_jsonb(p_item_ids),
      'quantities', to_jsonb(p_quantities),
      'request_count', v_count,
      'due_date', v_due_date
    )::TEXT,
    'transaction'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_bulk_borrow_requests(UUID[], INTEGER[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_bulk_borrow_requests(UUID[], INTEGER[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_transaction(
  p_transaction_id UUID,
  p_student_tags JSONB
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction public.transactions%ROWTYPE;
  v_result public.transactions%ROWTYPE;
  v_item public.inventory_items%ROWTYPE;
  v_role TEXT;
  v_local_date DATE := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
  v_borrow_date DATE;
  v_due_date DATE;
  v_student JSONB;
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can approve transactions';
  END IF;
  PERFORM public.validate_student_tag_input(p_student_tags);

  SELECT * INTO v_transaction FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND OR v_transaction.status <> 'pending' OR v_transaction.type <> 'borrow' THEN
    RAISE EXCEPTION 'Only pending borrow requests can be approved';
  END IF;
  SELECT * INTO v_item FROM public.inventory_items WHERE id = v_transaction.item_id FOR UPDATE;
  IF NOT FOUND OR v_item.stock_available < v_transaction.quantity THEN
    RAISE EXCEPTION 'Only % unit(s) of this item are available', COALESCE(v_item.stock_available, 0);
  END IF;

  -- A reservation has an explicit needed-through period. Regular and RLE
  -- requests use the approval date plus two local calendar days.
  IF v_transaction.reservation_id IS NULL THEN
    v_borrow_date := v_local_date;
    v_due_date := v_local_date + 2;
  ELSE
    v_borrow_date := v_transaction.borrow_date;
    v_due_date := v_transaction.due_date;
  END IF;

  UPDATE public.inventory_items
  SET stock_available = stock_available - v_transaction.quantity
  WHERE id = v_transaction.item_id;
  UPDATE public.transactions
  SET status = 'approved',
      borrow_date = v_borrow_date,
      due_date = v_due_date,
      due_at = public.transaction_due_at(v_due_date),
      stock_deducted = TRUE
  WHERE id = p_transaction_id
  RETURNING * INTO v_result;

  FOR v_student IN SELECT value FROM jsonb_array_elements(p_student_tags)
  LOOP
    INSERT INTO public.transaction_student_tags (transaction_id, student_name, student_number)
    VALUES (p_transaction_id, trim(v_student->>'name'), NULLIF(trim(v_student->>'student_number'), ''));
  END LOOP;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (auth.uid(), 'Approved Borrow Request with Student Tags', jsonb_build_object(
    'transaction_id', p_transaction_id,
    'student_tags', p_student_tags,
    'due_date', v_result.due_date,
    'due_at', v_result.due_at
  )::TEXT, 'transaction');
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_transaction(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_transaction(UUID, JSONB) TO authenticated;
