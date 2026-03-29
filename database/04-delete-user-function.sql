-- Function to delete a user (SA only)
-- This function handles deletion of user from auth.users and cascade deletion of related data

CREATE OR REPLACE FUNCTION delete_user(user_id_to_delete UUID, requesting_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requesting_user_role TEXT;
  deleted_user_email TEXT;
  deleted_user_name TEXT;
BEGIN
  -- Check if requesting user is SA
  SELECT role INTO requesting_user_role
  FROM user_profiles
  WHERE id = requesting_user_id;

  IF requesting_user_role != 'sa' THEN
    RAISE EXCEPTION 'Only Student Assistants can delete users';
  END IF;

  -- Get user details for audit log
  SELECT email, name INTO deleted_user_email, deleted_user_name
  FROM user_profiles
  WHERE id = user_id_to_delete;

  -- Delete from user_profiles (this will cascade to related tables due to foreign keys)
  DELETE FROM user_profiles WHERE id = user_id_to_delete;

  -- Delete from auth.users (Supabase Auth)
  DELETE FROM auth.users WHERE id = user_id_to_delete;

  -- Create audit log entry
  INSERT INTO audit_logs (user_id, action, details, category)
  VALUES (
    requesting_user_id,
    'delete_user',
    jsonb_build_object(
      'deleted_user_id', user_id_to_delete,
      'deleted_user_email', deleted_user_email,
      'deleted_user_name', deleted_user_name
    ),
    'user_management'
  );
END;
$$;
