-- Feature 3: SA-only reservations with a selected CI borrower.
-- Apply after database/10-reservation-stock-holds.sql.
-- reservations.user_id remains the borrowing CI for compatibility; created_by
-- records the SA who created the reservation.

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS created_by UUID;

UPDATE public.reservations
SET created_by = user_id
WHERE created_by IS NULL;

ALTER TABLE public.reservations
  ALTER COLUMN created_by SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservations_created_by_fkey'
      AND conrelid = 'public.reservations'::regclass
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservations_created_by
  ON public.reservations(created_by);
CREATE INDEX IF NOT EXISTS idx_reservations_borrower_id
  ON public.reservations(user_id);

-- New reservations are created and approved by the SA in one operation. The
-- Feature 2 hold is still acquired before insertion, so stock remains locked.
DROP FUNCTION IF EXISTS public.create_reservation(UUID, DATE, DATE, INTEGER);

CREATE OR REPLACE FUNCTION public.create_reservation(
  p_item_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_quantity INTEGER,
  p_borrower_id UUID
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
BEGIN
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT role INTO v_creator_role
  FROM public.user_profiles
  WHERE id = v_creator_id;
  IF v_creator_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can create reservations';
  END IF;

  SELECT role INTO v_borrower_role
  FROM public.user_profiles
  WHERE id = p_borrower_id;
  IF v_borrower_role IS DISTINCT FROM 'ci' THEN
    RAISE EXCEPTION 'A registered Clinical Instructor must be selected';
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
    user_id, created_by, item_id, start_date, end_date, status,
    quantity, stock_held_quantity
  )
  VALUES (
    p_borrower_id, v_creator_id, p_item_id, p_start_date, p_end_date, 'approved',
    p_quantity, p_quantity
  )
  RETURNING * INTO v_result;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    v_creator_id,
    'Created Reservation for Clinical Instructor',
    jsonb_build_object(
      'reservation_id', v_result.id,
      'created_by', v_creator_id,
      'borrower_id', p_borrower_id,
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

-- Keep legacy approval available for old pending rows, but new reservations
-- do not require this second approval step.
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
  IF v_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can cancel reservations';
  END IF;

  SELECT * INTO v_reservation
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;
  IF NOT FOUND OR v_reservation.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Only pending or approved reservations can be cancelled';
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
    jsonb_build_object(
      'reservation_id', v_reservation.id,
      'borrower_id', v_reservation.user_id
    )::TEXT,
    'transaction'
  );
  RETURN v_reservation;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_registered_ci_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  ci_id TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT user_profiles.role INTO v_role
  FROM public.user_profiles
  WHERE user_profiles.id = auth.uid();
  IF v_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can list Clinical Instructors';
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.name, p.role, p.ci_id, p.created_at
  FROM public.user_profiles AS p
  WHERE p.role = 'ci'
  ORDER BY p.name;
END;
$$;

DROP POLICY IF EXISTS reservations_select_policy ON public.reservations;
CREATE POLICY reservations_select_policy ON public.reservations
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'sa')
  );

REVOKE ALL ON FUNCTION public.create_reservation(UUID, DATE, DATE, INTEGER, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_reservation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_registered_ci_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_reservation(UUID, DATE, DATE, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_reservation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_registered_ci_profiles() TO authenticated;
