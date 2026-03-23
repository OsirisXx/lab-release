# LabTrack - Complete Feature Testing Guide

## 📋 Overview
This guide provides step-by-step instructions to test every feature in the LabTrack system. Each test will add real data to verify functionality.

**Pages to Test:**
1. Dashboard
2. Inventory
3. Transactions
4. Reservations
5. Locations
6. Users
7. Attendance
8. Reports
9. Audit Log
10. RLE Guide

---

## ⚠️ IMPORTANT: Reports Page Uses Mock Data
**Reports page is currently using hardcoded mock data** and needs to be updated to use real data from hooks.

---

## 🚀 Prerequisites

### 1. Database Setup Complete
- ✅ All 3 SQL files run successfully
- ✅ 7 tables created in Supabase
- ✅ 66 inventory items loaded
- ✅ RLE guides loaded

### 2. User Accounts
Create **TWO** test accounts:

**Account 1: Student Assistant (SA)**
- Email: sa@university.edu
- Password: password123
- Role: Student Assistant
- Purpose: Full admin access for testing

**Account 2: Clinical Instructor (CI)**
- Email: ci@university.edu  
- Password: password123
- Role: Clinical Instructor
- Purpose: Limited access for testing

---

## 📊 Test 1: Dashboard

### Purpose
Verify dashboard displays real-time statistics and data from database.

### Features to Test
- ✅ Real-time statistics (Total Items, Active Borrows, Pending Requests, Overdue Items)
- ✅ Recent Transactions list
- ✅ Low Stock Items widget
- ✅ Green theme applied

### Steps

**1. Login as SA**
```
Email: sa@university.edu
Password: password123
```

**2. Verify Dashboard Statistics**
- **Total Items**: Should show **66** (from inventory_items table)
- **Active Borrows**: Should show **0** (no transactions yet)
- **Pending Requests**: Should show **0** (no pending transactions)
- **Overdue Items**: Should show **0** (no overdue transactions)

**3. Verify Recent Transactions**
- Should show "No transactions" or empty state
- This will populate after creating transactions

**4. Verify Low Stock Items**
- Should show items where `stock_available / stock_total < 50%`
- Items should display:
  - Item name
  - Stock ratio (e.g., "22/30")
  - Progress bar (red if <30%, yellow if <50%)

### Expected Results
✅ All statistics show correct numbers from database  
✅ Green theme visible throughout  
✅ Low stock items display correctly  
✅ No errors in console  

### Data Created
None (read-only page)

---

## 📦 Test 2: Inventory

### Purpose
Verify inventory displays all items from database with search and filter functionality.

### Features to Test
- ✅ Display all 66 inventory items
- ✅ Search functionality
- ✅ Category filter (All, Equipment, Consumables)
- ✅ Stock availability indicators
- ✅ Condition badges

### Steps

**1. Verify Item Count**
- Top of page should show: "66 items across all locations"

**2. Test Search**
- Search for "Stethoscope"
- Should filter to show only stethoscope items
- Clear search

**3. Test Category Filter**
- Click "Equipment" → Should show only non-consumable items
- Click "Consumables" → Should show only consumable items
- Click "All" → Should show all 66 items

**4. Verify Item Details**
Each item row should display:
- ✅ Item name and ID
- ✅ Category badge (Consumable or Equipment)
- ✅ Location (e.g., C1A, C1L, OR/DRN)
- ✅ Total stock number
- ✅ Available stock with progress bar
- ✅ Condition badge (Good, Mixed, or Defective)

**5. Check Stock Indicators**
- Green bar: >50% available
- Yellow bar: 30-50% available
- Red bar: <30% available

### Expected Results
✅ All 66 items display correctly  
✅ Search filters items in real-time  
✅ Category filters work correctly  
✅ Stock indicators show correct colors  
✅ No errors in console  

### Data Created
None (read-only page)

### Known Issues
- "Add Item" button is visible but **not functional** (no dialog implemented)

---

## 🔄 Test 3: Transactions

### Purpose
Test the complete borrow/return workflow with real data creation.

### Features to Test
- ✅ Create borrow request (CI user)
- ✅ Approve/reject transactions (SA user)
- ✅ Search and filter transactions
- ✅ Status badges
- ✅ Audit log creation

### Steps

**Part A: Create Borrow Request (as CI)**

**1. Logout and Login as CI**
```
Email: ci@university.edu
Password: password123
```

**2. Go to Inventory Page**
- Note: CI users cannot create transactions from Transactions page
- Need to implement "Borrow" button on Inventory page

**⚠️ ISSUE FOUND:** No way for CI to create borrow requests from UI!

**Workaround:** Use browser console to create transaction:
```javascript
// Open browser console (F12)
// This will be implemented in UI later
```

**Part B: Approve Transaction (as SA)**

**1. Login as SA**
```
Email: sa@university.edu
```

**2. Go to Transactions Page**
- Should see pending transaction(s)

**3. Test Filters**
- Click "Pending" → Shows only pending
- Click "All" → Shows all transactions

**4. Approve Transaction**
- Click green checkmark (✓) on pending transaction
- Should see success toast: "Transaction approved"
- Status should change to "Approved"
- Transaction should move to "Approved" filter

**5. Test Search**
- Search by item name
- Search by user name
- Verify filtering works

### Expected Results
✅ Transactions display with all details  
✅ Approve/Reject buttons work  
✅ Status updates in real-time  
✅ Search and filters work  
✅ Toast notifications appear  
✅ Audit log entry created  

### Data Created
- ✅ Transaction record in `transactions` table
- ✅ Audit log entry in `audit_logs` table

### Known Issues
- **CRITICAL:** No UI for CI users to create borrow requests
- Need to add "Borrow" button on Inventory page
- Need to add "Return" functionality for approved transactions

---

## 📅 Test 4: Reservations

### Purpose
Test reservation creation and approval workflow.

### Features to Test
- ✅ Calendar widget
- ✅ Display reservations
- ✅ Approve/reject reservations (SA only)
- ✅ Status badges

### Steps

**1. Login as SA**

**2. Go to Reservations Page**
- Should see calendar on left
- Should see "Upcoming Reservations" on right

**3. Verify Initial State**
- Should show "No reservations" message
- Calendar should be interactive

**4. Test Calendar**
- Click different dates
- Verify calendar updates

### Expected Results
✅ Calendar displays correctly  
✅ Empty state shows when no reservations  
✅ Page loads without errors  

### Data Created
None (no create functionality implemented)

### Known Issues
- **CRITICAL:** "New Reservation" button is **not functional** (no dialog implemented)
- Cannot test full reservation workflow
- Need to implement reservation creation dialog

---

## 📍 Test 5: Locations

### Purpose
Test location-based inventory management with inline editing.

### Features to Test
- ✅ Group items by location
- ✅ Display location statistics
- ✅ Inline editing of items
- ✅ Update stock and condition

### Steps

**1. Login as SA**

**2. Go to Locations Page**
- Should see items grouped by location
- Locations should be alphabetically sorted

**3. Verify Location Cards**
Each location should show:
- ✅ Location name (e.g., C1A, C1L, OR/DRN)
- ✅ Item count
- ✅ Stock summary (e.g., "22/30 available")

**4. Test Inline Editing**

**Select an item to edit:**
- Click Edit (pencil icon) on any item
- Fields should become editable:
  - Item Name (text input)
  - Total Stock (number input)
  - On Hand / Available (number input)
  - Status dropdown (Good, Mixed, Defective)

**Make changes:**
- Change "Total Stock" from 30 to 35
- Change "On Hand" from 22 to 27
- Click Save (checkmark icon)

**Verify update:**
- Should see success toast: "Item updated successfully"
- Values should update in table
- Edit mode should close
- Go to Inventory page → Verify changes persisted

**5. Test Cancel**
- Click Edit on another item
- Make changes
- Click Cancel (X icon)
- Changes should be discarded

### Expected Results
✅ Items grouped by location correctly  
✅ Location statistics accurate  
✅ Inline editing works  
✅ Changes persist to database  
✅ Cancel discards changes  
✅ Audit log entry created on update  

### Data Created
- ✅ Updated inventory_items records
- ✅ Audit log entries for updates

---

## 👥 Test 6: Users

### Purpose
Verify user management and display of user profiles.

### Features to Test
- ✅ Display all registered users
- ✅ Separate CI and SA users
- ✅ Search functionality
- ✅ Role filtering

### Steps

**1. Login as SA**

**2. Go to Users Page**
- Should see two columns:
  - Left: Clinical Instructors
  - Right: Student Assistants

**3. Verify User Display**

**Clinical Instructors column:**
- Should show CI user (ci@university.edu)
- Should show:
  - User initials in circle
  - Full name
  - Email address
  - Role badge
  - CI ID (if assigned)
  - Join date

**Student Assistants column:**
- Should show SA user (sa@university.edu)
- Should show same details as above

**4. Test Search**
- Search for "sa@university.edu"
- Should filter to show only SA user
- Clear search

**5. Test Role Filter**
- Click "Clinical Instructors" → Shows only CI users
- Click "Student Assistants" → Shows only SA users
- Click "All" → Shows all users

### Expected Results
✅ All users display correctly  
✅ Users separated by role  
✅ Search filters users  
✅ Role filter works  
✅ User details accurate  

### Data Created
None (read-only page)

### Known Issues
- "Add User" button is **not functional** (no dialog implemented)
- "Edit" button on SA users is **not functional**
- Users can only be created via signup page

---

## ⏰ Test 7: Attendance

### Purpose
Test SA attendance tracking with clock in/out functionality.

### Features to Test
- ✅ Clock In functionality
- ✅ Clock Out functionality
- ✅ Display attendance records
- ✅ Real-time status updates

### Steps

**1. Login as SA**

**2. Go to Attendance Page**
- Should see "Clock In" and "Clock Out" buttons at top
- Should see "Attendance Records" table below

**3. Test Clock In**
- Click "Clock In" button
- Should see success toast: "Clocked in successfully"
- "Clock In" button should become **disabled**
- "Clock Out" button should become **enabled**
- New record should appear in table with:
  - Today's date
  - Current time in "Time In" column
  - "—" in "Time Out" column
  - "Active" status badge (yellow/warning color)

**4. Test Clock Out**
- Wait a few seconds
- Click "Clock Out" button
- Should see success toast: "Clocked out successfully"
- Record should update with:
  - Current time in "Time Out" column
  - "Complete" status badge (green/success color)
- Both buttons should reset:
  - "Clock In" becomes **enabled**
  - "Clock Out" becomes **disabled**

**5. Test Multiple Records**
- Clock in again
- Clock out again
- Verify multiple records appear in table
- Records should be sorted by date (newest first)

**6. Verify as CI User**
- Logout and login as CI
- Go to Attendance page
- Should see attendance records
- Should **NOT** see Clock In/Out buttons (SA only)

### Expected Results
✅ Clock In creates new attendance record  
✅ Clock Out updates existing record  
✅ Status badges update correctly  
✅ Buttons enable/disable properly  
✅ CI users cannot clock in/out  
✅ Records display in correct order  

### Data Created
- ✅ Attendance records in `attendance` table
- ✅ One record per clock in/out session

---

## 📈 Test 8: Reports

### Purpose
Verify reports display analytics and statistics.

### Features to Test
- ⚠️ **Currently using MOCK DATA**
- Period filter (Daily, Weekly, Monthly)
- Statistics cards
- Top borrowed items
- Inventory summary
- Transaction status

### Steps

**1. Login as SA**

**2. Go to Reports Page**

**3. Verify Statistics Cards**
- Total Items
- Active Borrows
- Completed Returns
- Overdue Items

**4. Test Period Filter**
- Click "Daily" → Should update (currently no effect - mock data)
- Click "Weekly" → Default view
- Click "Monthly" → Should update (currently no effect - mock data)

**5. Verify Top Borrowed Items**
- Should show top 5 most borrowed items
- Each item shows:
  - Rank number
  - Item name
  - Location
  - Borrowed count / Total stock
  - Percentage borrowed
  - Progress bar

**6. Verify Inventory Summary**
- Total Stock count
- Available count (green)
- Borrowed count (yellow)
- Category breakdown (Equipment vs Consumables)

**7. Verify Transaction Status**
- Pending count
- Active count
- Returned count
- Overdue count (red)

### Expected Results
⚠️ **MOCK DATA** - Numbers will NOT match real database  
✅ All widgets display without errors  
✅ Period filter buttons work  
✅ Export button visible (not functional)  

### Data Created
None (read-only page)

### Known Issues
- **CRITICAL:** Reports page uses `mockItems` and `mockTransactions` from `@/lib/mock-data`
- **MUST FIX:** Replace mock data with real hooks:
  - Use `useInventory()` instead of `mockItems`
  - Use `useTransactions()` instead of `mockTransactions`
- Export button is **not functional**

---

## 📋 Test 9: Audit Log

### Purpose
Verify all system actions are logged and searchable.

### Features to Test
- ✅ Display all audit log entries
- ✅ Search functionality
- ✅ Category filtering
- ✅ Chronological order
- ✅ Auto-logging of actions

### Steps

**1. Login as SA**

**2. Go to Audit Log Page**
- Should see "Activity Timeline"
- Should show event count at top

**3. Verify Existing Logs**
After previous tests, should see logs for:
- User signups
- Transaction approvals
- Inventory updates (from Locations test)
- Attendance clock in/out

**4. Verify Log Details**
Each log entry should show:
- ✅ Icon based on category
- ✅ Action name (e.g., "Approved Borrow Request")
- ✅ Category badge (inventory, transaction, user, system)
- ✅ Details text
- ✅ Timestamp
- ✅ "System" as actor

**5. Test Category Filter**
- Click "Inventory" → Shows only inventory-related logs
- Click "Transaction" → Shows only transaction logs
- Click "User" → Shows only user-related logs
- Click "System" → Shows only system logs
- Click "All" → Shows all logs

**6. Test Search**
- Search for "approved" → Should filter to approval actions
- Search for "inventory" → Should filter to inventory actions
- Search for item name → Should filter to logs mentioning that item
- Clear search

**7. Create New Action and Verify**
- Go to Locations page
- Edit an item and save
- Return to Audit Log
- Should see new "Updated Inventory" log entry at top

### Expected Results
✅ All actions are logged automatically  
✅ Logs display in reverse chronological order (newest first)  
✅ Category filter works correctly  
✅ Search filters logs in real-time  
✅ Log details are accurate and complete  
✅ No errors in console  

### Data Created
- ✅ Audit log entries created automatically by system actions

---

## 📚 Test 10: RLE Guide

### Purpose
Test RLE (Related Learning Experience) guide management.

### Features to Test
- ✅ Display guides by year level
- ✅ Create new guide (SA only)
- ✅ Edit existing guide (SA only)
- ✅ Delete guide (SA only)
- ✅ Search and filter functionality

### Steps

**Part A: View Guides**

**1. Login as SA**

**2. Go to RLE Guide Page**
- Should see guides loaded from database (from 03-rle-guides.sql)
- Should see "Add Guide" button (SA only)

**3. Verify Initial Guides**
Should see guides for all year levels:
- 1st Year guides
- 2nd Year guides
- 3rd Year guides
- 4th Year guides

**4. Verify Guide Details**
Each guide card should show:
- ✅ Year level badge
- ✅ Guide title
- ✅ Description
- ✅ Topics as tags
- ✅ Last updated date
- ✅ Edit and Delete buttons (SA only)

**5. Test Year Filter**
- Click "1st Year" → Shows only 1st year guides
- Click "2nd Year" → Shows only 2nd year guides
- Click "3rd Year" → Shows only 3rd year guides
- Click "4th Year" → Shows only 4th year guides
- Click "All" → Shows all guides

**6. Test Search**
- Search for "Vital Signs" → Should filter to guides with that topic
- Search for "Nursing" → Should filter to relevant guides
- Clear search

**Part B: Create New Guide**

**1. Click "Add Guide" Button**
- Dialog should open with form

**2. Fill Out Form**
- **Year Level:** Select "1st Year"
- **Title:** "Test Guide - Wound Care"
- **Description:** "Basic wound care and dressing techniques for first year nursing students"
- **Topics:** "Wound Assessment, Dressing Changes, Infection Control, Documentation"

**3. Click "Create"**
- Should see success toast: "Guide created successfully"
- Dialog should close
- New guide should appear in the list
- Should be in "1st Year" section

**Part C: Edit Guide**

**1. Find the Guide You Created**
- Click Edit (pencil icon) on "Test Guide - Wound Care"
- Dialog should open with existing data pre-filled

**2. Modify Guide**
- Change title to: "Test Guide - Advanced Wound Care"
- Add topic: ", Wound Healing Stages"
- Click "Update"

**3. Verify Update**
- Should see success toast: "Guide updated successfully"
- Guide card should show updated title
- Topics should include new topic
- "Last updated" date should be today

**Part D: Delete Guide**

**1. Delete the Test Guide**
- Click Delete (trash icon) on "Test Guide - Advanced Wound Care"
- Should see browser confirmation: "Are you sure you want to delete this guide?"
- Click "OK"

**2. Verify Deletion**
- Should see success toast: "Guide deleted successfully"
- Guide should disappear from list
- Count should decrease by 1

**Part E: Test as CI User**

**1. Logout and Login as CI**
```
Email: ci@university.edu
```

**2. Go to RLE Guide Page**
- Should see all guides
- Should **NOT** see "Add Guide" button
- Should **NOT** see Edit/Delete buttons on guides
- Can only view guides (read-only)

### Expected Results
✅ All guides display correctly  
✅ Create guide works and adds to database  
✅ Edit guide updates existing guide  
✅ Delete guide removes from database  
✅ Search and filters work correctly  
✅ SA has full CRUD access  
✅ CI has read-only access  
✅ Audit logs created for create/update/delete  

### Data Created
- ✅ RLE guide records in `rle_guides` table
- ✅ Audit log entries for guide operations

---

## 🐛 Known Issues Summary

### Critical Issues (Must Fix)

1. **Reports Page - Mock Data**
   - File: `src/pages/Reports.tsx`
   - Issue: Uses `mockItems` and `mockTransactions` instead of real data
   - Fix: Replace with `useInventory()` and `useTransactions()` hooks

2. **Transactions - No Borrow UI for CI**
   - File: `src/pages/Inventory.tsx` or create new component
   - Issue: CI users cannot create borrow requests from UI
   - Fix: Add "Borrow" button/dialog on Inventory page

3. **Transactions - No Return Functionality**
   - File: `src/pages/Transactions.tsx`
   - Issue: Cannot mark approved transactions as returned
   - Fix: Add "Return" button for approved transactions

### Medium Priority Issues

4. **Inventory - Add Item Not Implemented**
   - File: `src/pages/Inventory.tsx`
   - Issue: "Add Item" button exists but no dialog
   - Fix: Implement add item dialog

5. **Reservations - Create Not Implemented**
   - File: `src/pages/Reservations.tsx`
   - Issue: "New Reservation" button not functional
   - Fix: Implement reservation creation dialog

6. **Users - Add/Edit Not Implemented**
   - File: `src/pages/Users.tsx`
   - Issue: "Add User" and "Edit" buttons not functional
   - Fix: Implement user management dialogs

---

## ✅ Testing Checklist

Use this checklist to track your testing progress:

### Setup
- [ ] Database setup complete (3 SQL files run)
- [ ] SA account created and working
- [ ] CI account created and working
- [ ] App running on http://localhost:8081

### Page Tests
- [ ] Dashboard - Statistics display correctly
- [ ] Dashboard - Low stock items show
- [ ] Inventory - All 66 items display
- [ ] Inventory - Search works
- [ ] Inventory - Filters work
- [ ] Transactions - Can view transactions
- [ ] Transactions - Can approve (SA)
- [ ] Transactions - Can reject (SA)
- [ ] Reservations - Page loads
- [ ] Reservations - Calendar works
- [ ] Locations - Items grouped by location
- [ ] Locations - Inline editing works
- [ ] Locations - Changes persist
- [ ] Users - All users display
- [ ] Users - Search works
- [ ] Users - Role filter works
- [ ] Attendance - Clock in works (SA)
- [ ] Attendance - Clock out works (SA)
- [ ] Attendance - Records display
- [ ] Reports - Page loads (mock data)
- [ ] Audit Log - Logs display
- [ ] Audit Log - Search works
- [ ] Audit Log - Category filter works
- [ ] RLE Guide - Guides display
- [ ] RLE Guide - Create works (SA)
- [ ] RLE Guide - Edit works (SA)
- [ ] RLE Guide - Delete works (SA)
- [ ] RLE Guide - CI has read-only access

### Cross-Feature Tests
- [ ] Audit logs created for all actions
- [ ] Toast notifications appear
- [ ] Green theme consistent across all pages
- [ ] No console errors on any page
- [ ] All pages load within 2 seconds
- [ ] Real-time updates work (if applicable)

---

## 📊 Test Results Template

After completing tests, document results:

```markdown
## Test Results - [Date]

### Environment
- Browser: [Chrome/Firefox/Edge]
- Database: Supabase
- Total Items: 66
- Total Users: 2 (1 SA, 1 CI)

### Passed Tests
- [List all passed tests]

### Failed Tests
- [List all failed tests with details]

### Issues Found
- [List new issues discovered]

### Performance
- Average page load time: [X] seconds
- Slowest page: [Page name]

### Recommendations
- [List recommendations for improvements]
```

---

## 🔧 Next Steps After Testing

1. **Fix Critical Issues**
   - Update Reports page to use real data
   - Implement borrow request UI for CI users
   - Add return functionality for transactions

2. **Implement Missing Features**
   - Add Item dialog on Inventory
   - New Reservation dialog
   - User management dialogs

3. **Performance Optimization**
   - Add loading states where missing
   - Optimize database queries
   - Add pagination for large lists

4. **Polish**
   - Add confirmation dialogs for destructive actions
   - Improve error messages
   - Add success animations

---

## 📞 Support

If you encounter issues during testing:
1. Check browser console (F12) for errors
2. Verify database connection in Supabase dashboard
3. Confirm you're using the correct user role for the feature
4. Check that RLS policies are disabled (bare minimum setup)
