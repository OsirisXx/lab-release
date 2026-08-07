-- Feature 4: tag 1-3 accompanying students and record which tagged student returned items.
-- Apply after database/11-sa-reservation-ci-tagging.sql.

CREATE TABLE IF NOT EXISTS public.reservation_student_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL CHECK (char_length(trim(student_name)) BETWEEN 1 AND 120),
  student_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservation_student_tags_name
  ON public.reservation_student_tags(reservation_id, lower(trim(student_name)));

CREATE TABLE IF NOT EXISTS public.transaction_student_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL CHECK (char_length(trim(student_name)) BETWEEN 1 AND 120),
  student_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_student_tags_name
  ON public.transaction_student_tags(transaction_id, lower(trim(student_name)));

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS returned_by_student_tag_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_returned_by_student_tag_fkey'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_returned_by_student_tag_fkey
      FOREIGN KEY (returned_by_student_tag_id)
      REFERENCES public.transaction_student_tags(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transaction_student_tags_transaction_id
  ON public.transaction_student_tags(transaction_id);
CREATE INDEX IF NOT EXISTS idx_reservation_student_tags_reservation_id
  ON public.reservation_student_tags(reservation_id);

CREATE OR REPLACE FUNCTION public.validate_student_tag_input(p_students JSONB)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_student JSONB;
  v_name TEXT;
BEGIN
  IF jsonb_typeof(p_students) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Borrowing must include between 1 and 3 students';
  END IF;
  IF jsonb_array_length(p_students) < 1 OR jsonb_array_length(p_students) > 3 THEN
    RAISE EXCEPTION 'Borrowing must include between 1 and 3 students';
  END IF;

  FOR v_student IN SELECT value FROM jsonb_array_elements(p_students)
  LOOP
    v_name := NULLIF(trim(v_student->>'name'), '');
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

-- Replace reservation creation so the SA records accompanying students with the reservation.
DROP FUNCTION IF EXISTS public.create_reservation(UUID, DATE, DATE, INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.create_reservation(
  p_item_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_quantity INTEGER,
  p_borrower_id UUID,
  p_student_tags JSONB
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id UUID := auth.uid();
  v_creator_role TEXT;
  v_borrower_role TEXT;
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
  v_item public.inventory_items%ROWTYPE;
  v_result public.reservations%ROWTYPE;
  v_student JSONB;
BEGIN
  SELECT role INTO v_creator_role FROM public.user_profiles WHERE id = v_creator_id;
  IF v_creator_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can create reservations';
  END IF;

  SELECT role INTO v_borrower_role FROM public.user_profiles WHERE id = p_borrower_id;
  IF v_borrower_role IS DISTINCT FROM 'ci' THEN
    RAISE EXCEPTION 'A registered Clinical Instructor must be selected';
  END IF;

  PERFORM public.validate_student_tag_input(p_student_tags);
  IF p_start_date < v_today + 2 THEN
    RAISE EXCEPTION 'Reservations must be made at least 2 calendar days before the borrowing start date';
  END IF;
  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Reservation end date cannot be before the start date';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Reservation quantity must be greater than zero';
  END IF;

  SELECT * INTO v_item FROM public.inventory_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found'; END IF;
  IF v_item.stock_available < p_quantity THEN
    RAISE EXCEPTION 'Only % unit(s) of this item are available', v_item.stock_available;
  END IF;

  UPDATE public.inventory_items SET stock_available = stock_available - p_quantity WHERE id = p_item_id;
  INSERT INTO public.reservations (user_id, created_by, item_id, start_date, end_date, status, quantity, stock_held_quantity)
  VALUES (p_borrower_id, v_creator_id, p_item_id, p_start_date, p_end_date, 'approved', p_quantity, p_quantity)
  RETURNING * INTO v_result;

  FOR v_student IN SELECT value FROM jsonb_array_elements(p_student_tags)
  LOOP
    INSERT INTO public.reservation_student_tags (reservation_id, student_name, student_number)
    VALUES (v_result.id, trim(v_student->>'name'), NULLIF(trim(v_student->>'student_number'), ''));
  END LOOP;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (v_creator_id, 'Created Reservation with Student Tags', jsonb_build_object(
    'reservation_id', v_result.id, 'created_by', v_creator_id, 'borrower_id', p_borrower_id,
    'item_id', p_item_id, 'quantity', p_quantity, 'start_date', p_start_date, 'end_date', p_end_date,
    'student_tags', p_student_tags
  )::TEXT, 'transaction');
  RETURN v_result;
END;
$$;

-- Reservation issuance carries its student tags into the generated transaction.
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
  FOR v_reservation IN SELECT * FROM public.reservations WHERE status = 'pending' AND end_date < v_today FOR UPDATE SKIP LOCKED
  LOOP
    IF v_reservation.stock_held_quantity > 0 THEN
      UPDATE public.inventory_items SET stock_available = stock_available + v_reservation.stock_held_quantity WHERE id = v_reservation.item_id;
    END IF;
    UPDATE public.reservations SET status = 'expired', stock_held_quantity = 0 WHERE id = v_reservation.id;
    v_processed := v_processed + 1;
  END LOOP;

  FOR v_reservation IN SELECT * FROM public.reservations WHERE status = 'approved' AND start_date <= v_today AND issued_transaction_id IS NULL FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO v_item FROM public.inventory_items WHERE id = v_reservation.item_id FOR UPDATE;
    v_needed := v_reservation.quantity - v_reservation.stock_held_quantity;
    IF NOT FOUND OR (v_needed > 0 AND v_item.stock_available < v_needed) THEN
      IF FOUND AND v_reservation.stock_held_quantity > 0 THEN
        UPDATE public.inventory_items SET stock_available = stock_available + v_reservation.stock_held_quantity WHERE id = v_reservation.item_id;
      END IF;
      UPDATE public.reservations SET status = 'failed', stock_held_quantity = 0 WHERE id = v_reservation.id;
      v_processed := v_processed + 1;
      CONTINUE;
    END IF;

    IF v_needed > 0 THEN
      UPDATE public.inventory_items SET stock_available = stock_available - v_needed WHERE id = v_reservation.item_id;
    END IF;
    v_transaction_status := CASE WHEN public.transaction_due_at(v_reservation.end_date) <= NOW() THEN 'overdue' ELSE 'approved' END;

    INSERT INTO public.transactions (user_id, item_id, reservation_id, type, status, quantity, borrow_date, due_date, stock_deducted)
    VALUES (v_reservation.user_id, v_reservation.item_id, v_reservation.id, 'borrow', v_transaction_status,
      v_reservation.quantity, v_reservation.start_date, v_reservation.end_date, TRUE)
    RETURNING id INTO v_transaction_id;

    INSERT INTO public.transaction_student_tags (transaction_id, student_name, student_number)
    SELECT v_transaction_id, student_name, student_number
    FROM public.reservation_student_tags WHERE reservation_id = v_reservation.id;

    UPDATE public.reservations SET status = 'completed', issued_transaction_id = v_transaction_id, issued_at = NOW(), stock_held_quantity = 0 WHERE id = v_reservation.id;
    INSERT INTO public.audit_logs (user_id, action, details, category)
    VALUES (v_reservation.user_id, 'Automatically Issued Reservation with Student Tags', jsonb_build_object(
      'reservation_id', v_reservation.id, 'transaction_id', v_transaction_id, 'student_tags',
      (SELECT jsonb_agg(jsonb_build_object('name', student_name, 'student_number', student_number)) FROM public.reservation_student_tags WHERE reservation_id = v_reservation.id)
    )::TEXT, 'transaction');
    v_processed := v_processed + 1;
  END LOOP;
  RETURN v_processed;
END;
$$;

-- SA approval records the 1-3 accompanying students atomically with stock approval.
DROP FUNCTION IF EXISTS public.approve_transaction(UUID);
CREATE OR REPLACE FUNCTION public.approve_transaction(p_transaction_id UUID, p_student_tags JSONB)
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
  v_student JSONB;
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'sa' THEN RAISE EXCEPTION 'Only Student Assistants can approve transactions'; END IF;
  PERFORM public.validate_student_tag_input(p_student_tags);

  SELECT * INTO v_transaction FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND OR v_transaction.status <> 'pending' OR v_transaction.type <> 'borrow' THEN
    RAISE EXCEPTION 'Only pending borrow requests can be approved';
  END IF;
  SELECT * INTO v_item FROM public.inventory_items WHERE id = v_transaction.item_id FOR UPDATE;
  IF NOT FOUND OR v_item.stock_available < v_transaction.quantity THEN
    RAISE EXCEPTION 'Only % unit(s) of this item are available', COALESCE(v_item.stock_available, 0);
  END IF;

  UPDATE public.inventory_items SET stock_available = stock_available - v_transaction.quantity WHERE id = v_transaction.item_id;
  UPDATE public.transactions SET status = 'approved', borrow_date = v_local_date, due_date = v_local_date,
    due_at = public.transaction_due_at(v_local_date), stock_deducted = TRUE
  WHERE id = p_transaction_id RETURNING * INTO v_result;

  FOR v_student IN SELECT value FROM jsonb_array_elements(p_student_tags)
  LOOP
    INSERT INTO public.transaction_student_tags (transaction_id, student_name, student_number)
    VALUES (p_transaction_id, trim(v_student->>'name'), NULLIF(trim(v_student->>'student_number'), ''));
  END LOOP;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (auth.uid(), 'Approved Borrow Request with Student Tags', jsonb_build_object(
    'transaction_id', p_transaction_id, 'student_tags', p_student_tags, 'due_at', v_result.due_at
  )::TEXT, 'transaction');
  RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.return_transaction(UUID);
CREATE OR REPLACE FUNCTION public.return_transaction(
  p_transaction_id UUID,
  p_returning_student_tag_id UUID DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.transactions%ROWTYPE;
  v_role TEXT;
  v_student public.transaction_student_tags%ROWTYPE;
  v_local_date DATE := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'sa' THEN RAISE EXCEPTION 'Only Student Assistants can process returns'; END IF;

  IF p_returning_student_tag_id IS NOT NULL THEN
    SELECT * INTO v_student FROM public.transaction_student_tags
    WHERE id = p_returning_student_tag_id AND transaction_id = p_transaction_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'The returning student must be tagged on this transaction'; END IF;
  ELSIF EXISTS (SELECT 1 FROM public.transaction_student_tags WHERE transaction_id = p_transaction_id) THEN
    RAISE EXCEPTION 'Select which tagged student returned the equipment';
  END IF;

  UPDATE public.transactions SET status = 'returned', return_date = v_local_date,
    returned_by_student_tag_id = p_returning_student_tag_id
  WHERE id = p_transaction_id AND status IN ('approved', 'overdue') AND type = 'borrow'
  RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only active borrow transactions can be returned'; END IF;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (auth.uid(), 'Processed Item Return', jsonb_build_object(
    'transaction_id', p_transaction_id, 'returning_student_tag_id', p_returning_student_tag_id,
    'returning_student_name', v_student.student_name
  )::TEXT, 'transaction');
  RETURN v_result;
END;
$$;

ALTER TABLE public.reservation_student_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_student_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reservation_student_tags_select_policy ON public.reservation_student_tags;
CREATE POLICY reservation_student_tags_select_policy ON public.reservation_student_tags FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id AND (r.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = auth.uid() AND p.role = 'sa')))
);
DROP POLICY IF EXISTS transaction_student_tags_select_policy ON public.transaction_student_tags;
CREATE POLICY transaction_student_tags_select_policy ON public.transaction_student_tags FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND (t.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = auth.uid() AND p.role = 'sa')))
);

REVOKE ALL ON FUNCTION public.create_reservation(UUID, DATE, DATE, INTEGER, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_transaction(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.return_transaction(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_reservation(UUID, DATE, DATE, INTEGER, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_transaction(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_transaction(UUID, UUID) TO authenticated;

GRANT SELECT ON public.reservation_student_tags TO authenticated;
GRANT SELECT ON public.transaction_student_tags TO authenticated;
