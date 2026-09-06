-- Feature 17: SA-assisted borrowing for registered Clinical Instructors.
-- Apply after database/16-attendance-repair.sql.
--
-- This flow creates an immediately active borrow on behalf of a registered CI.
-- It deducts available stock while holding the inventory row lock and accepts
-- zero to three optional student tags. Existing CI-request and SA-approval
-- flows remain unchanged for their normal callers.

-- Serialize every path that can issue an active borrow for the same CI. A
-- transaction-scoped advisory lock avoids taking a CI profile lock before the
-- inventory lock, which keeps this migration compatible with existing
-- item-first reservation and approval paths.
CREATE OR REPLACE FUNCTION public.lock_active_borrower(p_borrower_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_borrower_id IS NULL THEN
    RAISE EXCEPTION 'Borrower is required';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('lab-lend:active-borrow:' || p_borrower_id::TEXT)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_optional_student_tag_input(p_students JSONB)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_student JSONB;
  v_name TEXT;
BEGIN
  IF p_students IS NULL OR jsonb_typeof(p_students) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Student tags must be an array of up to 3 students';
  END IF;

  IF jsonb_array_length(p_students) > 3 THEN
    RAISE EXCEPTION 'A borrow can include at most 3 students';
  END IF;

  FOR v_student IN SELECT value FROM jsonb_array_elements(p_students)
  LOOP
    IF jsonb_typeof(v_student) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Each student tag must be an object';
    END IF;

    v_name := NULLIF(trim(COALESCE(v_student->>'name', '')), '');
    IF v_name IS NULL OR char_length(v_name) > 120 THEN
      RAISE EXCEPTION 'Each tagged student must have a valid name';
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_students) WITH ORDINALITY a(value, ordinality)
    JOIN jsonb_array_elements(p_students) WITH ORDINALITY b(value, ordinality)
      ON a.ordinality < b.ordinality
    WHERE lower(trim(a.value->>'name')) = lower(trim(b.value->>'name'))
  ) THEN
    RAISE EXCEPTION 'A student cannot be tagged more than once';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_borrow_for_ci(
  p_item_id UUID,
  p_quantity INTEGER,
  p_borrower_id UUID,
  p_student_tags JSONB DEFAULT '[]'::JSONB
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id UUID := auth.uid();
  v_creator_role TEXT;
  v_borrower_role TEXT;
  v_item public.inventory_items%ROWTYPE;
  v_result public.transactions%ROWTYPE;
  v_student_tags JSONB := COALESCE(p_student_tags, '[]'::JSONB);
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
  v_due_date DATE;
  v_student JSONB;
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

  PERFORM public.validate_optional_student_tag_input(v_student_tags);

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Borrow quantity must be greater than zero';
  END IF;

  -- This lock is shared with normal SA approval and reservation issuance.
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

  v_due_date := v_today + 2;

  -- The inventory row lock makes this availability check and deduction atomic.
  UPDATE public.inventory_items
  SET stock_available = stock_available - p_quantity
  WHERE id = p_item_id;

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
    p_item_id,
    'borrow',
    'approved',
    p_quantity,
    v_today,
    v_due_date,
    public.transaction_due_at(v_due_date),
    TRUE
  )
  RETURNING * INTO v_result;

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

  -- user_id on the transaction is the borrowing CI. The audit row preserves
  -- which SA actually created the assisted borrow.
  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    v_creator_id,
    'Created SA-Assisted Borrow',
    jsonb_build_object(
      'transaction_id', v_result.id,
      'created_by', v_creator_id,
      'borrower_id', p_borrower_id,
      'item_id', p_item_id,
      'quantity', p_quantity,
      'borrow_date', v_today,
      'due_date', v_due_date,
      'due_at', v_result.due_at,
      'student_tags', v_student_tags
    )::TEXT,
    'transaction'
  );

  RETURN v_result;
END;
$$;

-- Keep the existing approval API but coordinate its active-borrow check with
-- the new assisted flow and reservation issuance.
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

  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;
  IF NOT FOUND OR v_transaction.status <> 'pending' OR v_transaction.type <> 'borrow' THEN
    RAISE EXCEPTION 'Only pending borrow requests can be approved';
  END IF;

  PERFORM public.lock_active_borrower(v_transaction.user_id);
  IF EXISTS (
    SELECT 1
    FROM public.transactions
    WHERE user_id = v_transaction.user_id
      AND type = 'borrow'
      AND status IN ('approved', 'overdue')
  ) THEN
    RAISE EXCEPTION 'Cannot approve a borrow while the Clinical Instructor has unreturned items';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = v_transaction.item_id
  FOR UPDATE;
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

-- Keep reservation issuance from creating a second active borrow for the same
-- CI while coordinating its lock order with assisted borrowing and approval.
CREATE OR REPLACE FUNCTION public.process_due_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
  v_reservation public.reservations%ROWTYPE;
  v_item public.inventory_items%ROWTYPE;
  v_needed INTEGER;
  v_transaction_id UUID;
  v_transaction_status TEXT;
  v_processed INTEGER := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
    IF v_role IS DISTINCT FROM 'sa' THEN
      RAISE EXCEPTION 'Only Student Assistants or the scheduler can process reservations';
    END IF;
  END IF;

  -- Release stale legacy/pending holds so they cannot block inventory forever.
  FOR v_reservation IN
    SELECT *
    FROM public.reservations
    WHERE status = 'pending'
      AND end_date < v_today
    FOR UPDATE SKIP LOCKED
  LOOP
    IF v_reservation.stock_held_quantity > 0 THEN
      UPDATE public.inventory_items
      SET stock_available = stock_available + v_reservation.stock_held_quantity
      WHERE id = v_reservation.item_id;
    END IF;
    UPDATE public.reservations
    SET status = 'expired', stock_held_quantity = 0
    WHERE id = v_reservation.id;
    v_processed := v_processed + 1;
  END LOOP;

  FOR v_reservation IN
    SELECT *
    FROM public.reservations
    WHERE status = 'approved'
      AND start_date <= v_today
      AND issued_transaction_id IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.lock_active_borrower(v_reservation.user_id);
    IF EXISTS (
      SELECT 1
      FROM public.transactions
      WHERE user_id = v_reservation.user_id
        AND type = 'borrow'
        AND status IN ('approved', 'overdue')
    ) THEN
      -- Keep the reservation approved and its stock hold intact. The next
      -- scheduler run can issue it after the current borrow is returned.
      CONTINUE;
    END IF;

    SELECT * INTO v_item
    FROM public.inventory_items
    WHERE id = v_reservation.item_id
    FOR UPDATE;
    v_needed := v_reservation.quantity - v_reservation.stock_held_quantity;
    IF NOT FOUND OR (v_needed > 0 AND v_item.stock_available < v_needed) THEN
      IF FOUND AND v_reservation.stock_held_quantity > 0 THEN
        UPDATE public.inventory_items
        SET stock_available = stock_available + v_reservation.stock_held_quantity
        WHERE id = v_reservation.item_id;
      END IF;
      UPDATE public.reservations
      SET status = 'failed', stock_held_quantity = 0
      WHERE id = v_reservation.id;
      v_processed := v_processed + 1;
      CONTINUE;
    END IF;

    IF v_needed > 0 THEN
      UPDATE public.inventory_items
      SET stock_available = stock_available - v_needed
      WHERE id = v_reservation.item_id;
    END IF;
    v_transaction_status := CASE
      WHEN public.transaction_due_at(v_reservation.end_date) <= NOW() THEN 'overdue'
      ELSE 'approved'
    END;

    INSERT INTO public.transactions (
      user_id,
      item_id,
      reservation_id,
      type,
      status,
      quantity,
      borrow_date,
      due_date,
      stock_deducted
    )
    VALUES (
      v_reservation.user_id,
      v_reservation.item_id,
      v_reservation.id,
      'borrow',
      v_transaction_status,
      v_reservation.quantity,
      v_reservation.start_date,
      v_reservation.end_date,
      TRUE
    )
    RETURNING id INTO v_transaction_id;

    INSERT INTO public.transaction_student_tags (transaction_id, student_name, student_number)
    SELECT v_transaction_id, student_name, student_number
    FROM public.reservation_student_tags
    WHERE reservation_id = v_reservation.id;

    UPDATE public.reservations
    SET status = 'completed',
        issued_transaction_id = v_transaction_id,
        issued_at = NOW(),
        stock_held_quantity = 0
    WHERE id = v_reservation.id;

    INSERT INTO public.audit_logs (user_id, action, details, category)
    VALUES (
      v_reservation.user_id,
      'Automatically Issued Reservation with Student Tags',
      jsonb_build_object(
        'reservation_id', v_reservation.id,
        'transaction_id', v_transaction_id,
        'student_tags', (
          SELECT jsonb_agg(jsonb_build_object('name', student_name, 'student_number', student_number))
          FROM public.reservation_student_tags
          WHERE reservation_id = v_reservation.id
        )
      )::TEXT,
      'transaction'
    );
    v_processed := v_processed + 1;
  END LOOP;
  RETURN v_processed;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_active_borrower(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_optional_student_tag_input(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_borrow_for_ci(UUID, INTEGER, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_transaction(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_due_reservations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_borrow_for_ci(UUID, INTEGER, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_transaction(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_reservations() TO authenticated, service_role;
