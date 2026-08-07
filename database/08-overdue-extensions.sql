-- Feature 1: same-day overdue processing and one-day extensions.
-- Assumes the institution's local timezone is Asia/Manila.
-- Apply this after database/07-fix-user-delete-audit.sql.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.transaction_due_at(p_due_date DATE)
RETURNS TIMESTAMPTZ
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_due_date::TEXT || ' 21:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Manila';
$$;

UPDATE public.transactions
SET due_at = public.transaction_due_at(due_date)
WHERE due_at IS NULL;

ALTER TABLE public.transactions
  ALTER COLUMN due_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_transaction_due_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.due_date IS DISTINCT FROM OLD.due_date OR NEW.due_at IS NULL THEN
    NEW.due_at := public.transaction_due_at(NEW.due_date);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_transaction_due_at ON public.transactions;
CREATE TRIGGER trigger_sync_transaction_due_at
  BEFORE INSERT OR UPDATE OF due_date, due_at ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_transaction_due_at();

CREATE TABLE IF NOT EXISTS public.extension_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  requested_days INTEGER NOT NULL DEFAULT 1 CHECK (requested_days = 1),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  previous_due_date DATE,
  previous_due_at TIMESTAMPTZ,
  approved_due_date DATE,
  approved_due_at TIMESTAMPTZ
);

ALTER TABLE public.extension_requests
  ADD COLUMN IF NOT EXISTS previous_due_date DATE,
  ADD COLUMN IF NOT EXISTS previous_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_due_date DATE,
  ADD COLUMN IF NOT EXISTS approved_due_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_extension_requests_transaction_id
  ON public.extension_requests(transaction_id);
CREATE INDEX IF NOT EXISTS idx_extension_requests_status
  ON public.extension_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_extension_per_transaction
  ON public.extension_requests(transaction_id)
  WHERE status = 'pending';

DROP FUNCTION IF EXISTS public.mark_overdue_transactions();

CREATE OR REPLACE FUNCTION public.mark_overdue_transactions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
  v_role TEXT;
BEGIN
  IF auth.role() <> 'service_role' THEN
    SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
    IF v_role IS DISTINCT FROM 'sa' THEN
      RAISE EXCEPTION 'Only Student Assistants or the scheduler can mark overdue transactions';
    END IF;
  END IF;

  UPDATE public.transactions
  SET status = 'overdue'
  WHERE type = 'borrow'
    AND status = 'approved'
    AND due_at <= NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_transaction_extension(
  p_transaction_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.extension_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction public.transactions%ROWTYPE;
  v_request public.extension_requests%ROWTYPE;
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT role INTO v_role
  FROM public.user_profiles
  WHERE id = auth.uid();

  IF v_role IS DISTINCT FROM 'ci' THEN
    RAISE EXCEPTION 'Only Clinical Instructors can request extensions';
  END IF;

  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_transaction.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only request an extension for your own transaction';
  END IF;

  IF v_transaction.type <> 'borrow' OR v_transaction.status NOT IN ('approved', 'overdue') THEN
    RAISE EXCEPTION 'Only active borrow transactions can be extended';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.extension_requests
    WHERE transaction_id = p_transaction_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'This transaction already has a pending extension request';
  END IF;

  INSERT INTO public.extension_requests (
    transaction_id,
    requested_by,
    requested_days,
    reason,
    previous_due_date,
    previous_due_at
  )
  VALUES (
    p_transaction_id,
    auth.uid(),
    1,
    NULLIF(TRIM(p_reason), ''),
    v_transaction.due_date,
    v_transaction.due_at
  )
  RETURNING * INTO v_request;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    auth.uid(),
    'Requested Due Date Extension',
    jsonb_build_object(
      'transaction_id', p_transaction_id,
      'requested_days', 1,
      'reason', p_reason
    )::text,
    'transaction'
  );

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_transaction_extension(
  p_request_id UUID,
  p_approve BOOLEAN,
  p_review_note TEXT DEFAULT NULL
)
RETURNS public.extension_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.extension_requests%ROWTYPE;
  v_transaction public.transactions%ROWTYPE;
  v_role TEXT;
  v_new_due_date DATE;
  v_new_due_at TIMESTAMPTZ;
  v_new_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT role INTO v_role
  FROM public.user_profiles
  WHERE id = auth.uid();

  IF v_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can review extensions';
  END IF;

  SELECT * INTO v_request
  FROM public.extension_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Extension request not found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'This extension request has already been reviewed';
  END IF;

  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE id = v_request.transaction_id
  FOR UPDATE;

  IF NOT FOUND OR v_transaction.status NOT IN ('approved', 'overdue') THEN
    RAISE EXCEPTION 'The related transaction is no longer active';
  END IF;

  IF p_approve THEN
    v_new_due_date := v_transaction.due_date + v_request.requested_days;
    v_new_due_at := public.transaction_due_at(v_new_due_date);
    v_new_status := CASE WHEN v_new_due_at <= NOW() THEN 'overdue' ELSE 'approved' END;

    UPDATE public.transactions
    SET due_date = v_new_due_date,
        due_at = v_new_due_at,
        status = v_new_status
    WHERE id = v_transaction.id;
  END IF;

  UPDATE public.extension_requests
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      review_note = NULLIF(TRIM(p_review_note), ''),
      approved_due_date = CASE WHEN p_approve THEN v_new_due_date ELSE NULL END,
      approved_due_at = CASE WHEN p_approve THEN v_new_due_at ELSE NULL END
  WHERE id = v_request.id
  RETURNING * INTO v_request;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    auth.uid(),
    CASE WHEN p_approve THEN 'Approved Due Date Extension' ELSE 'Rejected Due Date Extension' END,
    jsonb_build_object(
      'request_id', p_request_id,
      'transaction_id', v_request.transaction_id,
      'requested_days', v_request.requested_days,
      'previous_due_date', v_request.previous_due_date,
      'previous_due_at', v_request.previous_due_at,
      'approved_due_date', v_request.approved_due_date,
      'approved_due_at', v_request.approved_due_at,
      'review_note', p_review_note
    )::text,
    'transaction'
  );

  RETURN v_request;
END;
$$;

REVOKE ALL ON FUNCTION public.request_transaction_extension(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_transaction_extension(UUID, BOOLEAN, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_overdue_transactions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_transaction_extension(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_transaction_extension(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_overdue_transactions() TO authenticated;

-- Secure the existing SA transaction transitions behind role-checked RPCs.
CREATE OR REPLACE FUNCTION public.approve_transaction(p_transaction_id UUID)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction public.transactions%ROWTYPE;
  v_result public.transactions%ROWTYPE;
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

  UPDATE public.transactions
  SET status = 'approved',
      borrow_date = v_local_date,
      due_date = v_local_date,
      due_at = public.transaction_due_at(v_local_date)
  WHERE id = p_transaction_id
  RETURNING * INTO v_result;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (auth.uid(), 'Approved Borrow Request', jsonb_build_object('transaction_id', p_transaction_id, 'due_at', v_result.due_at)::text, 'transaction');

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_transaction(p_transaction_id UUID)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.transactions%ROWTYPE;
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can reject transactions';
  END IF;

  UPDATE public.transactions
  SET status = 'rejected'
  WHERE id = p_transaction_id
    AND status = 'pending'
    AND type = 'borrow'
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only pending borrow requests can be rejected';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (auth.uid(), 'Rejected Borrow Request', jsonb_build_object('transaction_id', p_transaction_id)::text, 'transaction');

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.return_transaction(p_transaction_id UUID)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.transactions%ROWTYPE;
  v_role TEXT;
  v_local_date DATE := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can process returns';
  END IF;

  UPDATE public.transactions
  SET status = 'returned', return_date = v_local_date
  WHERE id = p_transaction_id
    AND status IN ('approved', 'overdue')
    AND type = 'borrow'
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only active borrow transactions can be returned';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (auth.uid(), 'Processed Item Return', jsonb_build_object('transaction_id', p_transaction_id)::text, 'transaction');

  RETURN v_result;
END;
$$;

-- Role-aware policies prevent direct client table writes from bypassing the UI.
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transactions_select_policy ON public.transactions;
CREATE POLICY transactions_select_policy ON public.transactions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'sa')
  );

DROP POLICY IF EXISTS transactions_insert_policy ON public.transactions;
CREATE POLICY transactions_insert_policy ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'ci')
  );

DROP POLICY IF EXISTS extension_requests_select_policy ON public.extension_requests;
CREATE POLICY extension_requests_select_policy ON public.extension_requests
  FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'sa')
  );

DROP POLICY IF EXISTS extension_requests_insert_policy ON public.extension_requests;
CREATE POLICY extension_requests_insert_policy ON public.extension_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'ci')
  );

DROP POLICY IF EXISTS audit_logs_select_policy ON public.audit_logs;
CREATE POLICY audit_logs_select_policy ON public.audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'sa'));

DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
CREATE POLICY audit_logs_insert_policy ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

REVOKE ALL ON FUNCTION public.approve_transaction(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_transaction(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.return_transaction(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_transaction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_transaction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_transaction(UUID) TO authenticated;
