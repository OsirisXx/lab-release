-- Repair user deletion constraints and function for existing deployments.
-- Run this after 01-schema.sql through 06-add-equipment-to-rle-guides.sql.

-- Ensure deleting a user removes audit rows that belong to that user.
-- This is safe to recreate because the constraint is replaced in place.
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.user_profiles(id)
  ON DELETE CASCADE;

-- A deleted user may have authored an RLE guide. Keep the guide and clear
-- the optional author reference instead of blocking account deletion.
ALTER TABLE public.rle_guides
  DROP CONSTRAINT IF EXISTS rle_guides_created_by_fkey;

ALTER TABLE public.rle_guides
  ADD CONSTRAINT rle_guides_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.user_profiles(id)
  ON DELETE SET NULL;

-- Keep this function definition in sync with 04-delete-user-function.sql.
CREATE OR REPLACE FUNCTION public.delete_user(user_id_to_delete UUID, requesting_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_user_role TEXT;
  deleted_user_email TEXT;
  deleted_user_name TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> requesting_user_id THEN
    RAISE EXCEPTION 'Invalid requesting user';
  END IF;

  SELECT role INTO requesting_user_role
  FROM public.user_profiles
  WHERE id = requesting_user_id;

  IF requesting_user_role IS DISTINCT FROM 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can delete users';
  END IF;

  IF user_id_to_delete = requesting_user_id THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;

  SELECT email, name INTO deleted_user_email, deleted_user_name
  FROM public.user_profiles
  WHERE id = user_id_to_delete;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, details, category)
  VALUES (
    requesting_user_id,
    'delete_user',
    jsonb_build_object(
      'deleted_user_id', user_id_to_delete,
      'deleted_user_email', deleted_user_email,
      'deleted_user_name', deleted_user_name
    )::text,
    'user'
  );

  DELETE FROM public.user_profiles WHERE id = user_id_to_delete;
  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$;
