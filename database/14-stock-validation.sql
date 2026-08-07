-- Feature 6: enforce available-stock limits for all borrow requests.
-- Apply after database/13-rle-bulk-borrow.sql.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_stock_available_nonnegative'
      AND conrelid = 'public.inventory_items'::regclass
  ) THEN
    ALTER TABLE public.inventory_items
      ADD CONSTRAINT inventory_stock_available_nonnegative
      CHECK (stock_available >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_maintaining_stock_nonnegative'
      AND conrelid = 'public.inventory_items'::regclass
  ) THEN
    ALTER TABLE public.inventory_items
      ADD CONSTRAINT inventory_maintaining_stock_nonnegative
      CHECK (maintaining_stock >= 0);
  END IF;
END $$;

-- Defense in depth for any direct pending transaction insert. The RPC below
-- remains the normal application path and provides the same user-facing error.
CREATE OR REPLACE FUNCTION public.validate_pending_borrow_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_available INTEGER;
BEGIN
  IF NEW.type = 'borrow' AND NEW.status = 'pending' THEN
    SELECT stock_available INTO v_available
    FROM public.inventory_items
    WHERE id = NEW.item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Inventory item not found';
    END IF;
    IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
      RAISE EXCEPTION 'Borrow quantity must be greater than zero';
    END IF;
    IF v_available < NEW.quantity THEN
      RAISE EXCEPTION 'Only % unit(s) are available for this item', v_available;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_pending_borrow_stock ON public.transactions;
CREATE TRIGGER trigger_validate_pending_borrow_stock
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_pending_borrow_stock();

-- Replace the direct client insert used by regular Inventory/RLE borrowing.
DROP FUNCTION IF EXISTS public.create_borrow_request(UUID, INTEGER);

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
BEGIN
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
    user_id, item_id, type, status, quantity, borrow_date, due_date
  )
  VALUES (
    v_user_id, p_item_id, 'borrow', 'pending', p_quantity, v_today, v_today
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
      'due_date', v_today
    )::TEXT,
    'transaction'
  );

  RETURN v_result;
END;
$$;

-- Direct authenticated inserts are restricted to the same pending-borrow shape.
-- Stock quantity is enforced by the trigger above.
DROP POLICY IF EXISTS transactions_insert_policy ON public.transactions;
CREATE POLICY transactions_insert_policy ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND type = 'borrow'
    AND status = 'pending'
    AND quantity > 0
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'ci'
    )
  );

REVOKE ALL ON FUNCTION public.create_borrow_request(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_borrow_request(UUID, INTEGER) TO authenticated;
