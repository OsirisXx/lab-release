LABTRACK ADDITIONAL FEATURES - DETAILED EXPLANATION

This document explains exactly what each feature does, where it will be implemented, how to use it, and why it's useful.

FEATURE 2: DIRECT BORROW FROM RLE GUIDE
Price: 3,500 PHP
Complexity: MEDIUM
Development Time: 6-8 hours

WHERE IT WILL BE IMPLEMENTED
Page: RLE Guide page (http://localhost:8080/rle-guide or your-vercel-url/rle-guide)

CURRENT SITUATION
Right now, when Clinical Instructors (CI) want to borrow equipment:
1. They go to RLE Guide to see what equipment they need for their year level
2. They have to remember the equipment names
3. They navigate to Inventory page
4. Search for the equipment
5. Click Borrow button
6. Fill out the borrow form

This is 5 steps and requires switching between pages.

WHAT THIS FEATURE ADDS
After implementation:
1. CI goes to RLE Guide
2. They see equipment list with "Borrow" buttons next to each item
3. They click "Borrow" button directly on the RLE Guide page
4. Borrow dialog opens with item already selected
5. They just enter quantity and submit

This reduces 5 steps to 3 steps and keeps them on one page.

HOW TO ACCESS
1. Login as Clinical Instructor
2. Click "RLE Guide" in sidebar
3. Select your year level (1st Year, 2nd Year, 3rd Year, 4th Year)
4. See list of equipment with availability status
5. Click "Borrow" button next to any equipment

WHAT YOU'LL SEE
Each equipment item will show:
- Equipment name (e.g., "Stethoscope")
- Availability status: 
  * "Available (5 in stock)" - green badge
  * "Low Stock (2 left)" - yellow badge
  * "Out of Stock" - red badge
- "Borrow" button (only if item is available)

EXAMPLE USE CASE
Scenario: CI preparing for 2nd Year RLE session

Without this feature:
- Opens RLE Guide, sees "Stethoscope" is needed
- Closes RLE Guide
- Opens Inventory page
- Searches "Stethoscope"
- Clicks Borrow
- Fills form
- Total time: 2-3 minutes

With this feature:
- Opens RLE Guide
- Sees "Stethoscope - Available (10 in stock)"
- Clicks "Borrow" button
- Enters quantity, submits
- Total time: 30 seconds

WHY IT'S USEFUL
- Saves time for Clinical Instructors
- Reduces navigation between pages
- Shows real-time availability while planning RLE sessions
- Makes borrowing more intuitive
- Reduces errors (no need to remember equipment names)

TECHNICAL COMPLEXITY: MEDIUM
Why medium complexity:
- Need to match RLE Guide equipment names to inventory database items
- Some equipment names might not match exactly (e.g., "BP Apparatus" vs "Blood Pressure Monitor")
- Need to fetch real-time stock data for each equipment
- Must handle cases where equipment doesn't exist in inventory
- Role-based access (only CI can see borrow buttons)

IMPLEMENTATION STEPS
1. Add database query to match RLE equipment to inventory items
2. Add availability status badges
3. Add "Borrow" button component
4. Create borrow dialog that opens on RLE Guide page
5. Handle form submission
6. Test with all 4 year levels

IS IT HARD? 
Moderate difficulty. The main challenge is matching equipment names between RLE Guide and Inventory. Once that's done, the rest is similar to existing borrow functionality.


FEATURE 3: DELETE USER ACCOUNTS (SA ONLY)
Price: 1,500 PHP
Complexity: LOW
Development Time: 2-3 hours

WHERE IT WILL BE IMPLEMENTED
Page: Users page (http://localhost:8080/users or your-vercel-url/users)

CURRENT SITUATION
Right now, Student Assistants (SA) can:
- View all users (CI and SA)
- See user details (name, email, CI ID, role)

They CANNOT:
- Delete users who are no longer needed
- Remove duplicate accounts
- Clean up test accounts

WHAT THIS FEATURE ADDS
After implementation:
- SA can delete user accounts
- Confirmation dialog prevents accidental deletion
- All related data is properly removed
- Audit log records who deleted whom and when

HOW TO ACCESS
1. Login as Student Assistant
2. Click "Users" in sidebar
3. See list of all users
4. Each user row will have a "Delete" button (trash icon)
5. Click delete button
6. Confirmation dialog appears: "Are you sure you want to delete [User Name]? This cannot be undone."
7. Click "Delete" to confirm or "Cancel" to abort

WHAT HAPPENS WHEN YOU DELETE A USER
The system will:
1. Delete the user's account from Supabase Auth (they can't login anymore)
2. Remove user profile data
3. Keep transaction history for audit purposes (but mark user as deleted)
4. Keep attendance records (but mark user as deleted)
5. Create audit log entry: "SA [Your Name] deleted user [Deleted User Name] on [Date]"

EXAMPLE USE CASE

Scenario 1: Removing graduated students
- A CI graduated and no longer needs access
- SA goes to Users page
- Finds the CI's account
- Clicks Delete
- Confirms deletion
- CI can no longer login

Scenario 2: Cleaning up duplicate accounts
- Someone accidentally created 2 accounts with different emails
- SA identifies the duplicate
- Deletes the unused account
- Keeps the active one

Scenario 3: Removing test accounts
- During setup, you created test accounts
- Now you want to clean them up
- SA deletes all test accounts
- Only real users remain

WHY IT'S USEFUL
- Maintains clean user database
- Removes access for people who no longer need it
- Prevents confusion from duplicate accounts
- Improves security (no orphaned accounts)
- Makes user list easier to manage

TECHNICAL COMPLEXITY: LOW
Why low complexity:
- Standard CRUD operation (Delete)
- Similar to existing delete functionality for inventory items
- Just need to add button and confirmation dialog
- Supabase handles most of the deletion logic

IMPLEMENTATION STEPS
1. Add "Delete" button to Users page (SA role only)
2. Create confirmation dialog
3. Call Supabase Auth API to delete user
4. Handle cascade deletion of related data
5. Create audit log entry
6. Refresh user list after deletion

IS IT HARD?
No, this is straightforward. It's the same pattern as deleting inventory items, just applied to users.


FEATURE 4: IMPROVED EXPORT FORMAT + RENAME "TOTAL STOCK" + ADD ITEM CODES
Price: 2,500 PHP
Complexity: LOW-MEDIUM
Development Time: 4-5 hours (increased from 3-4 due to item codes addition)

WHERE IT WILL BE IMPLEMENTED
Page: Reports page (http://localhost:8080/reports or your-vercel-url/reports)

CURRENT SITUATION
Right now, the Reports page has an "Export" button that:
- Downloads a basic CSV file
- Data is not well organized
- No clear sections
- Hard to read in Excel
- Uses "Total Stock" terminology
- Missing item codes

WHAT THIS FEATURE ADDS
After implementation, clicking "Export" will generate a professional Excel file with:

PART A: Rename "Total Stock" to "Maintaining Stock"
This change applies to:
- Database column name
- All UI labels on Inventory page
- Reports page
- Export files
- Add Item form
- Edit Item form

PART B: Enhanced Export Format
The exported file will have 3 sections:

SECTION 1: SUMMARY REPORT (Top of file)
Generated: [Date and Time]

Metric                    Value
Total Items               314
Maintaining Stock         12151
Available Stock           10109
Borrowed Items            1042
Active Borrows            1
Pending Requests          0
Completed Returns         0
Equipment Items           261
Consumable Items          53

SECTION 2: INVENTORY REPORT (Main section, sorted by location)
Organized by location alphabetically, items alphabetized within each location

Item Code    Item Name                           Category      Location         Maintaining Stock    Available    Borrowed    Active Borrow    Condition
CSR-001      Abdomen Injection Model             Equipment     CSR CABINET 7    3                    1            2           0                Good
CSR-002      Absorbent Cotton                    Consumable    CSB              5                    3            2           0                Good
OR-001       Adhesive tape (2.5 cm x 9.1 m)      Consumable    CSA              12                   10           2           0                Good
...

Features:
- Sorted by Location first (alphabetically)
- Within each location, items sorted by name (alphabetically)
- Includes Item Code column (NEW)
- Shows Maintaining Stock instead of Total Stock
- Clear column headers

SECTION 3: TRANSACTION REPORT (Separate sheet or bottom section)
All borrow/return transactions

Date         Time      User Name              CI ID     Item Name                Action    Quantity    Status
2026-03-27   14:30     Juan Dela Cruz         CI0001    Stethoscope              Borrow    2           Approved
2026-03-27   15:45     Maria Santos           CI0002    BP Apparatus             Borrow    1           Pending
2026-03-26   10:00     Juan Dela Cruz         CI0001    Stethoscope              Return    2           Returned
...

Features:
- Sorted by date (most recent first)
- Shows complete transaction history
- Includes user details
- Shows action type and status

EXPORT FORMAT OPTIONS
You can export as:
- Excel (.xlsx) with multiple sheets (Summary, Inventory, Transactions)
- OR CSV with clear section separators

HOW TO ACCESS
1. Login as Student Assistant
2. Click "Reports" in sidebar
3. Click "Export" button at top right
4. File downloads automatically
5. Open in Excel or Google Sheets
6. See organized data in 3 sections

EXAMPLE USE CASE

Scenario 1: Monthly inventory report for administration
- SA needs to submit monthly inventory status
- Goes to Reports page
- Clicks Export
- Gets professionally formatted Excel file
- Shows all metrics, inventory by location, and transactions
- Submits to administration

Scenario 2: Checking stock levels by location
- SA wants to see what's in CSR CABINET 7
- Exports report
- Opens Excel
- Finds CSR CABINET 7 section
- Sees all items in that location with stock levels

Scenario 3: Tracking who borrowed what
- SA needs to verify who borrowed stethoscopes last week
- Exports report
- Goes to Transaction Report section
- Filters by "Stethoscope"
- Sees all borrow/return history

Scenario 4: Updating Google Sheets manually
- Client wants to update their Google Sheets
- SA exports report
- Copies Summary Report section
- Pastes into Google Sheets
- Copies Inventory Report section
- Pastes into separate sheet
- Google Sheets now has current data

WHY IT'S USEFUL
- Professional-looking reports for administration
- Easy to read and understand
- Organized by location for inventory checks
- Transaction history for accountability
- Can be imported to Google Sheets manually
- Item codes help identify specific items
- "Maintaining Stock" terminology matches their standards

TECHNICAL COMPLEXITY: LOW-MEDIUM
Why low-medium complexity:
- Need to rename database column (requires migration)
- Need to update all UI references
- Need to format export data into 3 sections
- Need to sort by location and name
- Need to generate Excel file (not just CSV)
- Need to add item codes to export
- Moderate amount of testing required

IMPLEMENTATION STEPS
1. Update database schema: rename "stock_total" to "maintaining_stock"
2. Update TypeScript interfaces
3. Update all UI components (Inventory, Reports, Add Item, Edit Item)
4. Create new export function with 3 sections
5. Add sorting logic (location alphabetically, then items alphabetically)
6. Add item code column to export
7. Generate Excel file with proper formatting
8. Test export with real data
9. Verify all "Total Stock" references are changed

IS IT HARD?
Not very hard, but requires careful attention to detail. The renaming part is straightforward but needs testing to ensure nothing breaks. The export formatting is moderate complexity - need to organize data into sections and generate Excel file.


SUMMARY COMPARISON

Feature 2: Direct Borrow from RLE Guide
Difficulty: MEDIUM (6-8 hours)
Why: Requires matching equipment names and real-time data fetching
User Impact: HIGH - Saves time for every CI borrow operation
Pages Affected: 1 (RLE Guide)

Feature 3: Delete User Accounts
Difficulty: LOW (2-3 hours)
Why: Standard CRUD operation with confirmation
User Impact: MEDIUM - Useful for maintenance but not daily use
Pages Affected: 1 (Users)

Feature 4: Enhanced Export + Rename + Item Codes
Difficulty: LOW-MEDIUM (4-5 hours)
Why: Database rename + export formatting + item codes
User Impact: HIGH - Better reports and matches their terminology
Pages Affected: 5 (Database, Inventory, Reports, Add Item, Edit Item)


TOTAL DEVELOPMENT TIME: 12-16 hours across 2-3 working days
TOTAL COST: 7,500 PHP

All features are achievable and will significantly improve the system's usability for your client.
