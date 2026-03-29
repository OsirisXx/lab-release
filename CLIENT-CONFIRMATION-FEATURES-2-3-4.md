LABTRACK ADDITIONAL FEATURES - CONFIRMED SCOPE

Client Confirmation Date: March 27, 2026
Start Date: Monday, March 30, 2026

CONFIRMED FEATURES (Bundle B Equivalent)

Feature 2: Direct Borrow from RLE Guide
Price: 3,500 PHP
Status: CONFIRMED

Feature 3: Delete User Accounts (SA Only)
Price: 1,500 PHP
Status: CONFIRMED

Feature 4: Improved Export Format and Rename "Total Stock"
Price: 2,500 PHP
Status: CONFIRMED

TOTAL: 7,500 PHP

EXCLUDED FEATURES

Feature 1: Google Sheets Integration
Status: NOT INCLUDED (client decision - budget constraints)
Note: Client will manually update Google Sheets from exported reports instead

DETAILED IMPLEMENTATION PLAN

Feature 3: Delete User Accounts
- Add "Delete" button in Users page (SA role only)
- Confirmation dialog before deletion
- Delete from Supabase Auth
- Cascade delete related data
- Audit log entry

Feature 4: Improved Export Format
Part A: Rename "Total Stock" to "Maintaining Stock"
- Update database schema column name
- Update all UI labels and references
- Update TypeScript interfaces
- Test all pages for correct display

Part B: Enhanced Export Format (Based on Client's Excel Template)
The export will generate a structured report with 3 sections:

Section 1: Summary Report
- Total Items
- Total Stock (Maintaining Stock)
- Available Stock
- Borrowed Items
- Active Borrows
- Pending Requests
- Completed Returns
- Equipment Items count
- Consumable Items count

Section 2: Inventory Report (Main Sheet)
- Sorted by Location (alphabetically)
- Within each location, items sorted alphabetically
- Columns: Item Name, Category, Location, Maintaining Stock, Available, Borrowed, Active Borrow, Condition
- Color coding for low stock and out of stock items

Section 3: Transaction Report (Separate Sheet/Section)
- All transactions with details
- Columns: Date, User, Item, Action (Borrow/Return), Quantity, Status
- Sorted by date (most recent first)

Export Format: Excel (.xlsx) with multiple sheets OR CSV with clear section separators

Feature 2: Direct Borrow from RLE Guide
- Add "Borrow" button next to each equipment item in RLE Guide
- Show availability status (Available/Out of Stock)
- Click button opens borrow dialog
- Pre-fill item information
- Submit creates borrow request
- Only visible to CI users

TECHNICAL NOTES

The export functionality will:
- Pull live data from Supabase database
- Generate formatted output dynamically
- NOT use hardcoded values
- Update automatically as data changes
- Be accessible from Reports page

Client can export anytime and data will reflect current system state.

TIMELINE

Start: Monday, March 30, 2026
Estimated Completion: 2-3 working days
- Day 1: Features 3 & 4
- Day 2: Feature 2
- Day 3: Testing and deployment

PAYMENT TERMS

Total: 7,500 PHP
Down Payment (50%): 3,750 PHP - due before starting Monday
Final Payment (50%): 3,750 PHP - due upon completion and approval

DELIVERABLES

1. Delete user functionality in Users page
2. "Maintaining Stock" renamed throughout system
3. Enhanced export with 3 sections (Summary, Inventory by Location, Transactions)
4. Direct borrow buttons in RLE Guide
5. Updated deployment to Vercel
6. Testing documentation

Client will handle manual Google Sheets updates using the exported reports.
