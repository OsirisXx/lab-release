-- Feature 5: atomically create pending borrow requests for marked RLE equipment.
-- Apply after database/12-student-tagging.sql.

DROP FUNCTION IF EXISTS public.create_bulk_borrow_requests(UUID[], INTEGER[]);

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
BEGIN
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
      user_id, item_id, type, status, quantity, borrow_date, due_date
    )
    VALUES (
      v_user_id, v_item.id, 'borrow', 'pending', p_quantities[v_index],
      (NOW() AT TIME ZONE 'Asia/Manila')::DATE,
      (NOW() AT TIME ZONE 'Asia/Manila')::DATE
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
      'request_count', v_count
    )::TEXT,
    'transaction'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_bulk_borrow_requests(UUID[], INTEGER[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_bulk_borrow_requests(UUID[], INTEGER[]) TO authenticated;
