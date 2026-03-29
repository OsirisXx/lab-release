TESTING FEATURE 4: ENHANCED EXPORT + RENAME TOTAL STOCK

PART A: RENAME "TOTAL STOCK" TO "MAINTAINING STOCK"

MANUAL TESTING STEPS

1. Start the development server:
   npm run dev

2. Login as Student Assistant (SA)

3. Test Inventory Page:
   - Go to http://localhost:8080/inventory
   - Check table header: should say "Maintaining Stock" not "Stock" or "Total Stock"
   - Click "Add Item" button
   - Check form label: should say "Maintaining Stock"
   - Fill out form and submit
   - Verify item is added with correct maintaining_stock value

4. Test Edit Item:
   - Click Edit (pencil icon) on any item
   - Check form label: should say "Maintaining Stock"
   - Update the value
   - Save and verify

5. Test Dashboard Page:
   - Go to http://localhost:8080
   - Check "Low Stock Items" section
   - Stock display should use maintaining_stock values
   - Progress bars should calculate correctly

6. Test Reports Page:
   - Go to http://localhost:8080/reports
   - Check metrics display
   - Should show "Maintaining Stock" in calculations

7. Test Locations Page:
   - Go to http://localhost:8080/locations
   - Check stock totals per location
   - Should use maintaining_stock values

DATABASE SETUP REQUIRED

Before testing, run the database migration:

1. Go to Supabase Dashboard > SQL Editor
2. Open file: database/05-rename-total-stock.sql
3. Copy all contents
4. Paste into SQL Editor
5. Click "Run"
6. Should see "Success. No rows returned"

EXPECTED BEHAVIOR

✓ All UI labels show "Maintaining Stock" instead of "Total Stock"
✓ Database column is renamed from stock_total to maintaining_stock
✓ All calculations use maintaining_stock correctly
✓ Add Item form has "Maintaining Stock" label
✓ Edit Item form has "Maintaining Stock" label
✓ Table headers show "Maintaining Stock"
✓ No TypeScript errors
✓ No runtime errors


PART B: ENHANCED EXPORT FORMAT

MANUAL TESTING STEPS

1. Login as Student Assistant (SA)

2. Go to Reports Page:
   - Navigate to http://localhost:8080/reports

3. Click "Export" Button:
   - Click the Download icon button at top right
   - File should download: LabTrack_Report_YYYY-MM-DD.csv
   - Toast notification: "Report exported successfully with 3 sections..."

4. Open Downloaded CSV File:
   - Open in Excel or Google Sheets
   - Verify file structure

EXPECTED FILE STRUCTURE

SECTION 1: SUMMARY REPORT
Generated: [Date and Time]

Metric                    Value
Total Items               [number]
Maintaining Stock         [number]
Available Stock           [number]
Borrowed Items            [number]
Active Borrows            [number]
Pending Requests          [number]
Completed Returns         [number]
Overdue Items             [number]
Equipment Items           [number]
Consumable Items          [number]

[blank lines]

SECTION 2: INVENTORY REPORT
Generated: [Date and Time]

Item Code    Item Name                Category      Location         Maintaining Stock    Available    Borrowed    Active Borrow    Condition
OR-001       Stethoscope              Equipment     CSR CABINET 7    10                   8            2           0                Good
CSR-002      Absorbent Cotton         Consumable    CSB              5                    3            2           0                Good
...

Features to verify:
✓ Items are sorted by Location (alphabetically)
✓ Within each location, items are sorted by Name (alphabetically)
✓ Item Code column is included (shows "N/A" if no code)
✓ Shows "Maintaining Stock" not "Total Stock"
✓ All columns are present and aligned

[blank lines]

SECTION 3: TRANSACTION REPORT
Generated: [Date and Time]

Date         Time      User Name              CI ID     Item Name                Action    Quantity    Status
2026-03-29   14:30     Juan Dela Cruz         CI0001    Stethoscope              Borrow    2           Approved
2026-03-29   15:45     Maria Santos           CI0002    BP Apparatus             Borrow    1           Pending
...

Features to verify:
✓ Transactions are sorted by date (most recent first)
✓ Date and Time are in separate columns
✓ User Name and CI ID are included
✓ Action shows "Borrow" or "Return"
✓ Status is capitalized (Approved, Pending, Returned, etc.)

EDGE CASES TO TEST

1. Export with no inventory items:
   - Should still generate file with headers
   - Summary should show 0 values

2. Export with no transactions:
   - Should still generate file with headers
   - Transaction section should be empty except headers

3. Items without item codes:
   - Should show "N/A" in Item Code column

4. Items with same location:
   - Should be grouped together
   - Should be alphabetized by name within location

5. Special characters in item names:
   - Should be properly escaped in CSV
   - Should not break file format

VERIFICATION CHECKLIST

✓ File downloads successfully
✓ File opens in Excel/Google Sheets without errors
✓ All 3 sections are present and clearly separated
✓ Summary Report shows correct metrics
✓ Inventory Report is sorted by location then name
✓ Inventory Report includes Item Code column
✓ Inventory Report shows "Maintaining Stock"
✓ Transaction Report is sorted by date (newest first)
✓ Transaction Report includes Date, Time, User Name, CI ID
✓ All data is accurate and matches database
✓ CSV format is clean and readable
✓ Toast notification appears after export

COMMON ISSUES

Issue: File doesn't download
Solution: Check browser pop-up blocker, allow downloads from localhost

Issue: CSV opens with garbled text
Solution: Open with UTF-8 encoding in Excel (Data > From Text/CSV)

Issue: Columns not aligned
Solution: Use "Text to Columns" feature in Excel with comma delimiter

Issue: Items not sorted correctly
Solution: Check that location and name sorting is working in code

SUCCESS CRITERIA

✓ All "Total Stock" references changed to "Maintaining Stock"
✓ Database column renamed successfully
✓ Export generates 3-section report
✓ Export includes Item Code column
✓ Export sorts inventory by location alphabetically
✓ Export sorts transactions by date
✓ File is readable and well-formatted
✓ No errors in console
✓ No TypeScript errors
