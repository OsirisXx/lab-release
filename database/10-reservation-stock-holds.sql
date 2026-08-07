-- Feature 2: reservation window, immediate stock holds, and reservation issuance.
-- Apply after database/08-overdue-extensions.sql on an existing deployment.
-- The application timezone is Asia/Manila.

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS stock_held_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS issued_transaction_id UUID,
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS reservation_id UUID,
  ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_reservation_id_fkey'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_reservation_id_fkey
      FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservations_issued_transaction_id_fkey'
      AND conrelid = 'public.reservations'::regclass
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_issued_transaction_id_fkey
      FOREIGN KEY (issued_transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled', 'expired', 'failed'));

ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_stock_held_quantity_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_stock_held_quantity_check
  CHECK (stock_held_quantity >= 0 AND stock_held_quantity <= quantity);

-- Existing approved/overdue/returned borrow rows already had stock deducted by
-- the legacy trigger. Mark them so the hardened trigger will not deduct again.
UPDATE public.transactions
SET stock_deducted = TRUE
WHERE type = 'borrow'
  AND status IN ('approved', 'overdue', 'returned')
  AND stock_deducted = FALSE;

CREATE INDEX IF NOT EXISTS idx_reservations_item_status_dates
  ON public.reservations(item_id, status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_transactions_reservation_id
  ON public.transactions(reservation_id);

CREATE OR REPLACE FUNCTION public.update_stock_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Normal borrow approvals are deducted by approve_transaction while holding
  -- the inventory row lock. This fallback protects any remaining direct update.
  IF NEW.type = 'borrow'
     AND NEW.status = 'approved'
     AND OLD.status = 'pending'
     AND NOT COALESCE(NEW.stock_deducted, FALSE) THEN
    UPDATE public.inventory_items
    SET stock_available = stock_available - NEW.quantity
    WHERE id = NEW.item_id
      AND stock_available >= NEW.quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient stock for this borrow request';
    END IF;
  END IF;

  IF NEW.status = 'returned'
     AND OLD.status IN ('approved', 'overdue')
     AND COALESCE(OLD.stock_deducted, TRUE) THEN
    UPDATE public.inventory_items
    SET stock_available = stock_available + NEW.quantity
    WHERE id = NEW.item_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_stock ON public.transactions;
CREATE TRIGGER trigger_update_stock
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_on_transaction();

CREATE OR REPLACE FUNCTION public.create_reservation(
  p_item_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_quantity INTEGER
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
  v_item public.inventory_items%ROWTYPE;
  v_result public.reservations%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT role INTO v_role FROM public.user_profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'ci' AND v_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only authenticated laboratory users can create reservations';
  END IF;

  IF p_start_date < v_today + 2 THEN
    RAISE EXCEPTION 'Reservations must be made at least 2 calendar days before the borrowing start date';
  END IF;
  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Reservation end date cannot be before the start date';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Reservation quantity must be greater than zero';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;
  IF v_item.stock_available < p_quantity THEN
    RAISE EXCEPTION 'Only % unit(s) of this item are available', v_item.stock_available;
  END IF;

  UPDATE public.inventory_items
  SET stock_available = stock_available - p_quantity
  WHERE id = p_item_id;

  INSERT INTO public.reservations (
    user_id, item_id, start_date, end_date, status, quantity, stock_held_quantity
  )
  VALUES (
    v_user_id, p_item_id, p_start_date, p_end_date, 'pending', p_quantity, p_quantity
  )
  RETURNING * INTO v_result;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    v_user_id,
    'Created Reservation and Held Stock',
    jsonb_build_object(
      'reservation_id', v_result.id,
      'item_id', p_item_id,
      'quantity', p_quantity,
      'start_date', p_start_date,
      'end_date', p_end_date
    )::TEXT,
    'transaction'
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_reservation(p_reservation_id UUID)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_reservation public.reservations%ROWTYPE;
  v_item public.inventory_items%ROWTYPE;
  v_needed INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  SELECT role INTO v_role FROM public.user_profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can approve reservations';
  END IF;

  SELECT * INTO v_reservation
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;
  IF NOT FOUND OR v_reservation.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending reservations can be approved';
  END IF;

  -- Legacy pending rows may predate immediate holds. Acquire any missing
  -- quantity here so approving one cannot bypass the stock check.
  v_needed := v_reservation.quantity - v_reservation.stock_held_quantity;
  IF v_needed > 0 THEN
    SELECT * INTO v_item
    FROM public.inventory_items
    WHERE id = v_reservation.item_id
    FOR UPDATE;
    IF NOT FOUND OR v_item.stock_available < v_needed THEN
      RAISE EXCEPTION 'Only % unit(s) of this item are available', COALESCE(v_item.stock_available, 0);
    END IF;
    UPDATE public.inventory_items
    SET stock_available = stock_available - v_needed
    WHERE id = v_reservation.item_id;
  END IF;

  UPDATE public.reservations
  SET status = 'approved',
      stock_held_quantity = quantity
  WHERE id = v_reservation.id
  RETURNING * INTO v_reservation;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    v_user_id,
    'Approved Reservation',
    jsonb_build_object('reservation_id', v_reservation.id, 'stock_held', v_reservation.quantity)::TEXT,
    'transaction'
  );
  RETURN v_reservation;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_reservation(p_reservation_id UUID)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_reservation public.reservations%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  SELECT role INTO v_role FROM public.user_profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can reject reservations';
  END IF;

  SELECT * INTO v_reservation
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;
  IF NOT FOUND OR v_reservation.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Only pending or approved reservations can be rejected';
  END IF;

  IF v_reservation.stock_held_quantity > 0 THEN
    UPDATE public.inventory_items
    SET stock_available = stock_available + v_reservation.stock_held_quantity
    WHERE id = v_reservation.item_id;
  END IF;

  UPDATE public.reservations
  SET status = 'rejected', stock_held_quantity = 0
  WHERE id = v_reservation.id
  RETURNING * INTO v_reservation;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    v_user_id,
    'Rejected Reservation and Released Stock',
    jsonb_build_object('reservation_id', v_reservation.id)::TEXT,
    'transaction'
  );
  RETURN v_reservation;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_reservation(p_reservation_id UUID)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_reservation public.reservations%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  SELECT role INTO v_role FROM public.user_profiles WHERE id = v_user_id;

  SELECT * INTO v_reservation
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;
  IF NOT FOUND OR v_reservation.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Only pending or approved reservations can be cancelled';
  END IF;
  IF v_reservation.user_id <> v_user_id AND v_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'You can only cancel your own reservation';
  END IF;

  IF v_reservation.stock_held_quantity > 0 THEN
    UPDATE public.inventory_items
    SET stock_available = stock_available + v_reservation.stock_held_quantity
    WHERE id = v_reservation.item_id;
  END IF;

  UPDATE public.reservations
  SET status = 'cancelled', stock_held_quantity = 0
  WHERE id = v_reservation.id
  RETURNING * INTO v_reservation;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    v_user_id,
    'Cancelled Reservation and Released Stock',
    jsonb_build_object('reservation_id', v_reservation.id)::TEXT,
    'transaction'
  );
  RETURN v_reservation;
END;
$$;

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

  -- Pending reservations that were never approved must not hold stock forever.
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

  -- Approved reservations are issued on their start date. The held quantity
  -- transfers to the transaction, so this INSERT must not deduct stock again.
  FOR v_reservation IN
    SELECT *
    FROM public.reservations
    WHERE status = 'approved'
      AND start_date <= v_today
      AND issued_transaction_id IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    -- New reservations already hold the full quantity. This recovery path
    -- protects legacy approved reservations created before Feature 2.
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
      INSERT INTO public.audit_logs (user_id, action, details, category)
      VALUES (
        v_reservation.user_id,
        'Reservation Issue Failed',
        jsonb_build_object('reservation_id', v_reservation.id, 'reason', 'Inventory item or required stock was unavailable')::TEXT,
        'transaction'
      );
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
      user_id, item_id, reservation_id, type, status, quantity,
      borrow_date, due_date, stock_deducted
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

    UPDATE public.reservations
    SET status = 'completed',
        issued_transaction_id = v_transaction_id,
        issued_at = NOW(),
        stock_held_quantity = 0
    WHERE id = v_reservation.id;

    INSERT INTO public.audit_logs (user_id, action, details, category)
    VALUES (
      v_reservation.user_id,
      'Automatically Issued Reservation',
      jsonb_build_object(
        'reservation_id', v_reservation.id,
        'transaction_id', v_transaction_id,
        'start_date', v_reservation.start_date,
        'end_date', v_reservation.end_date
      )::TEXT,
      'transaction'
    );
    v_processed := v_processed + 1;
  END LOOP;

  RETURN v_processed;
END;
$$;

-- Harden SA approval so two simultaneous approvals cannot borrow the same unit.
CREATE OR REPLACE FUNCTION public.approve_transaction(p_transaction_id UUID)
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can approve transactions';
  END IF;

  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;
  IF NOT FOUND OR v_transaction.status <> 'pending' OR v_transaction.type <> 'borrow' THEN
    RAISE EXCEPTION 'Only pending borrow requests can be approved';
  END IF;

  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = v_transaction.item_id
  FOR UPDATE;
  IF NOT FOUND OR v_item.stock_available < v_transaction.quantity THEN
    RAISE EXCEPTION 'Only % unit(s) of this item are available', COALESCE(v_item.stock_available, 0);
  END IF;

  UPDATE public.inventory_items
  SET stock_available = stock_available - v_transaction.quantity
  WHERE id = v_transaction.item_id;

  UPDATE public.transactions
  SET status = 'approved',
      borrow_date = v_local_date,
      due_date = v_local_date,
      due_at = public.transaction_due_at(v_local_date),
      stock_deducted = TRUE
  WHERE id = p_transaction_id
  RETURNING * INTO v_result;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    auth.uid(),
    'Approved Borrow Request',
    jsonb_build_object('transaction_id', p_transaction_id, 'due_at', v_result.due_at)::TEXT,
    'transaction'
  );
  RETURN v_result;
END;
$$;

-- Force reservation lifecycle changes through the role-checked functions.
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reservations_select_policy ON public.reservations;
CREATE POLICY reservations_select_policy ON public.reservations
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'sa')
  );
DROP POLICY IF EXISTS reservations_insert_policy ON public.reservations;
CREATE POLICY reservations_insert_policy ON public.reservations
  FOR INSERT TO authenticated
  WITH CHECK (FALSE);
DROP POLICY IF EXISTS reservations_update_policy ON public.reservations;
CREATE POLICY reservations_update_policy ON public.reservations
  FOR UPDATE TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);
DROP POLICY IF EXISTS reservations_delete_policy ON public.reservations;
CREATE POLICY reservations_delete_policy ON public.reservations
  FOR DELETE TO authenticated
  USING (FALSE);

-- Inventory remains readable to logged-in users but stock-changing writes are
-- restricted to SA sessions. Stock holds and transaction transitions use the
-- security-definer functions above.
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inventory_select_policy ON public.inventory_items;
CREATE POLICY inventory_select_policy ON public.inventory_items
  FOR SELECT TO authenticated
  USING (TRUE);
DROP POLICY IF EXISTS inventory_insert_policy ON public.inventory_items;
CREATE POLICY inventory_insert_policy ON public.inventory_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'sa'));
DROP POLICY IF EXISTS inventory_update_policy ON public.inventory_items;
CREATE POLICY inventory_update_policy ON public.inventory_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'sa'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'sa'));
DROP POLICY IF EXISTS inventory_delete_policy ON public.inventory_items;
CREATE POLICY inventory_delete_policy ON public.inventory_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'sa'));

REVOKE ALL ON FUNCTION public.create_reservation(UUID, DATE, DATE, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_reservation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_reservation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_reservation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_due_reservations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_reservation(UUID, DATE, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_reservation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_reservation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_reservation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_reservations() TO authenticated, service_role;
