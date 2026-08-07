-- Feature 7: repair SA attendance repeat-session behavior and authorization.
-- Apply after database/15-two-day-borrow-due-date.sql.
-- Attendance remains one record per Student Assistant per Asia/Manila date.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.attendance
    GROUP BY user_id, date
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate attendance records exist for the same user and date; clean them before applying Feature 7';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_user_date_unique
  ON public.attendance(user_id, date);

CREATE OR REPLACE FUNCTION public.clock_in_attendance()
RETURNS public.attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_local_date DATE := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
  v_local_time TIME(0) := (NOW() AT TIME ZONE 'Asia/Manila')::TIME(0);
  v_existing public.attendance%ROWTYPE;
  v_result public.attendance%ROWTYPE;
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can log attendance';
  END IF;

  SELECT * INTO v_existing
  FROM public.attendance
  WHERE user_id = v_user_id
    AND date = v_local_date
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.time_out IS NULL THEN
      RAISE EXCEPTION 'You are already clocked in today';
    END IF;
    RAISE EXCEPTION 'Attendance is already complete for today';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attendance
    WHERE user_id = v_user_id
      AND time_out IS NULL
  ) THEN
    RAISE EXCEPTION 'Please clock out your previous attendance before starting a new one';
  END IF;

  INSERT INTO public.attendance (user_id, date, time_in)
  VALUES (v_user_id, v_local_date, v_local_time)
  RETURNING * INTO v_result;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    v_user_id,
    'Clocked In Attendance',
    jsonb_build_object('attendance_id', v_result.id, 'date', v_result.date, 'time_in', v_result.time_in)::TEXT,
    'system'
  );

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Attendance is already recorded for today';
END;
$$;

CREATE OR REPLACE FUNCTION public.clock_out_attendance(p_attendance_id UUID)
RETURNS public.attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_local_date DATE := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;
  v_local_time TIME(0) := (NOW() AT TIME ZONE 'Asia/Manila')::TIME(0);
  v_existing public.attendance%ROWTYPE;
  v_result public.attendance%ROWTYPE;
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can log attendance';
  END IF;

  SELECT * INTO v_existing
  FROM public.attendance
  WHERE id = p_attendance_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendance record not found';
  END IF;
  IF v_existing.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'You can only clock out your own attendance';
  END IF;
  IF v_existing.time_out IS NOT NULL THEN
    RAISE EXCEPTION 'Attendance is already clocked out';
  END IF;
  IF v_existing.date > v_local_date THEN
    RAISE EXCEPTION 'Attendance cannot be clocked out before its local date';
  END IF;

  UPDATE public.attendance
  SET time_out = v_local_time
  WHERE id = p_attendance_id
    AND user_id = v_user_id
    AND time_out IS NULL
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendance was already clocked out';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    v_user_id,
    'Clocked Out Attendance',
    jsonb_build_object('attendance_id', v_result.id, 'date', v_result.date, 'time_out', v_result.time_out)::TEXT,
    'system'
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.clock_in_attendance() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clock_out_attendance(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clock_in_attendance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_out_attendance(UUID) TO authenticated;

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_sa_select_policy ON public.attendance;
CREATE POLICY attendance_sa_select_policy ON public.attendance
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'sa'
  ));

DROP POLICY IF EXISTS attendance_sa_insert_policy ON public.attendance;
CREATE POLICY attendance_sa_insert_policy ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'sa'
    )
  );

DROP POLICY IF EXISTS attendance_sa_update_policy ON public.attendance;
CREATE POLICY attendance_sa_update_policy ON public.attendance
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'sa'
    )
  )
  WITH CHECK (user_id = auth.uid());

-- Attendance mutations must go through the role-checked RPCs above.
REVOKE INSERT, UPDATE, DELETE ON public.attendance FROM authenticated;
GRANT SELECT ON public.attendance TO authenticated;
