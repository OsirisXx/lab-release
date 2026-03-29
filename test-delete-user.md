TESTING FEATURE 3: DELETE USER ACCOUNTS

MANUAL TESTING STEPS

1. Start the development server:
   npm run dev

2. Login as Student Assistant (SA)
   - Email: your SA account
   - Password: your SA password

3. Navigate to Users page (http://localhost:8080/users)

4. Verify Delete Buttons Appear:
   - Each user row should have a trash icon button
   - Button should be red/destructive color
   - Only visible when logged in as SA

5. Click Delete Button on a Test User:
   - Confirmation dialog should appear
   - Dialog should show: "Are you sure you want to delete [User Name]?"
   - Dialog should warn about permanent deletion
   - Should have Cancel and Delete buttons

6. Click Cancel:
   - Dialog should close
   - User should NOT be deleted
   - User still appears in list

7. Click Delete Button Again:
   - Click "Delete" in confirmation dialog
   - Should show "Deleting..." state
   - Toast notification: "User [Name] deleted successfully"
   - User should disappear from list
   - Page should auto-refresh

8. Verify Database Deletion:
   - Go to Supabase dashboard
   - Check auth.users table - user should be gone
   - Check user_profiles table - user should be gone
   - Check audit_logs table - should have entry for deletion

9. Test as Clinical Instructor (CI):
   - Logout
   - Login as CI
   - Go to Users page
   - Delete buttons should NOT appear
   - CI cannot delete users

DATABASE SETUP REQUIRED

Before testing, you need to run the delete_user function in Supabase:

1. Go to Supabase Dashboard > SQL Editor
2. Open file: database/04-delete-user-function.sql
3. Copy all contents
4. Paste into SQL Editor
5. Click "Run"
6. Should see "Success. No rows returned"

EXPECTED BEHAVIOR

✓ SA can see delete buttons
✓ CI cannot see delete buttons
✓ Confirmation dialog prevents accidental deletion
✓ User is deleted from both auth.users and user_profiles
✓ Audit log entry is created
✓ Toast notification confirms deletion
✓ User list auto-refreshes
✓ Related data is handled (transactions, attendance)

EDGE CASES TO TEST

1. Try to delete yourself (current SA user)
   - Should work but you'll be logged out
   
2. Delete user with active transactions
   - Should work, transactions remain for audit purposes

3. Network error during deletion
   - Should show error toast
   - User should NOT be deleted
   - Dialog should remain open

4. Multiple rapid delete clicks
   - Button should be disabled during deletion
   - Should not create duplicate delete operations
