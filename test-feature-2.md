TESTING FEATURE 2: DIRECT BORROW FROM RLE GUIDE

OVERVIEW
This feature allows Clinical Instructors (CI) to borrow equipment directly from the RLE Guide page without navigating to the Inventory page. Each RLE guide shows suggested equipment with real-time availability status and a "Borrow" button.

DATABASE SETUP REQUIRED

Before testing, run this SQL in Supabase:

1. Go to Supabase Dashboard > SQL Editor
2. Open file: database/06-add-equipment-to-rle-guides.sql
3. Copy all contents
4. Paste into SQL Editor
5. Click "Run"
6. Should see "Success. No rows returned"

This adds the equipment field to rle_guides table and populates sample equipment for existing guides.

MANUAL TESTING STEPS

STEP 1: LOGIN AS CLINICAL INSTRUCTOR (CI)
- Email: your CI account
- Password: your CI password
- IMPORTANT: Must be CI role, not SA

STEP 2: NAVIGATE TO RLE GUIDE PAGE
- Go to http://localhost:8080/rle-guide
- Should see list of RLE guides for different year levels

STEP 3: VERIFY EQUIPMENT LIST APPEARS
For each guide card, check:
- "Suggested Equipment" section appears
- Equipment items are listed (e.g., Stethoscope, Blood Pressure Apparatus, etc.)
- Each equipment item shows:
  * Equipment name
  * Package icon
  * Availability status badge

STEP 4: CHECK AVAILABILITY STATUS BADGES

Equipment can show 3 different statuses:

1. AVAILABLE (Green badge with checkmark)
   - Shows: "[X] available" (e.g., "10 available")
   - Borrow button appears
   - Badge is green

2. LOW STOCK (Yellow/Warning badge with alert icon)
   - Shows: "[!] available" (e.g., "3 available")
   - Stock is less than 5 units
   - Borrow button still appears
   - Badge is yellow/orange

3. OUT OF STOCK (Red badge with X icon)
   - Shows: "Out of stock"
   - NO borrow button
   - Badge is red

4. NOT IN INVENTORY (Gray text)
   - Shows: "Not in inventory"
   - Equipment name in RLE guide doesn't match any inventory item
   - NO borrow button

STEP 5: TEST BORROW BUTTON (CI ONLY)

1. Find an equipment item with "available" status
2. Click the "Borrow" button
3. Borrow dialog should open showing:
   - Item name
   - Available stock count
   - Quantity input field (default: 1)

4. Adjust quantity:
   - Try changing quantity
   - Should not allow more than available stock
   - Should not allow less than 1

5. Click "Submit Request"
   - Toast notification: "Borrow request submitted successfully"
   - Dialog closes
   - Request appears in Reservations page as "pending"

STEP 6: VERIFY INVENTORY MATCHING

The system matches RLE equipment names to inventory items using fuzzy matching:

Test cases:
- "Stethoscope" in RLE guide matches "Stethoscope" in inventory ✓
- "Blood Pressure Apparatus" matches "BP Apparatus" ✓
- "Thermometer" matches "Digital Thermometer" ✓
- Partial name matches work

If equipment name doesn't match any inventory item:
- Shows "Not in inventory"
- No borrow button

STEP 7: TEST AS STUDENT ASSISTANT (SA)

1. Logout from CI account
2. Login as SA
3. Go to RLE Guide page
4. Equipment list should appear
5. Availability status should show
6. Borrow buttons should NOT appear (SA cannot borrow from RLE Guide)

STEP 8: VERIFY YEAR LEVEL FILTERING

1. Click different year level tabs: "All", "1st Year", "2nd Year", "3rd Year", "4th Year"
2. Guides should filter correctly
3. Equipment lists should update for each guide

STEP 9: TEST SEARCH FUNCTIONALITY

1. Type equipment name in search box (e.g., "Stethoscope")
2. Guides containing that equipment should appear
3. Search should work for guide titles, descriptions, and topics too

STEP 10: VERIFY REAL-TIME UPDATES

1. Open RLE Guide page in one tab
2. Open Inventory page in another tab
3. As SA, change stock quantity of an equipment item
4. Go back to RLE Guide tab
5. Availability status should update automatically (real-time)

EXPECTED BEHAVIOR

✓ Equipment list appears in each RLE guide card
✓ Availability status shows correctly:
  - Green badge for available (>= 5 stock)
  - Yellow badge for low stock (1-4 stock)
  - Red badge for out of stock (0 stock)
  - Gray text for not in inventory
✓ Borrow button appears ONLY for CI users
✓ Borrow button appears ONLY when item is available
✓ Borrow dialog opens with correct item details
✓ Quantity validation works (min 1, max available stock)
✓ Borrow request submits successfully
✓ Toast notifications appear
✓ Real-time updates work
✓ SA users see equipment list but NO borrow buttons

EDGE CASES TO TEST

1. Equipment with 0 stock:
   - Should show "Out of stock" badge
   - Should NOT show borrow button

2. Equipment not in inventory:
   - Should show "Not in inventory" text
   - Should NOT show borrow button

3. Borrow all available stock:
   - Set quantity to maximum available
   - Submit request
   - Status should update to "Out of stock" after approval

4. Multiple equipment items in one guide:
   - All should show correct individual statuses
   - Each should have its own borrow button

5. User with unreturned items:
   - Try to borrow from RLE Guide
   - Should show error: "Cannot borrow new items while you have unreturned items"

VERIFICATION CHECKLIST

VISUAL CHECKS:
- [ ] Equipment section appears in guide cards
- [ ] Equipment items have package icon
- [ ] Availability badges show correct colors
- [ ] Borrow buttons appear for CI users only
- [ ] Borrow buttons appear only for available items
- [ ] UI is clean and well-organized

FUNCTIONAL CHECKS:
- [ ] Borrow dialog opens when clicking button
- [ ] Dialog shows correct item details
- [ ] Quantity input validates correctly
- [ ] Submit request works
- [ ] Toast notifications appear
- [ ] Request appears in Reservations page
- [ ] Real-time updates work

ROLE-BASED CHECKS:
- [ ] CI users see borrow buttons
- [ ] SA users do NOT see borrow buttons
- [ ] Both roles see equipment list and availability

COMMON ISSUES

Issue: Equipment list doesn't appear
Solution: Run the SQL migration (06-add-equipment-to-rle-guides.sql) in Supabase

Issue: All equipment shows "Not in inventory"
Solution: Check that inventory items exist with similar names to RLE equipment

Issue: Borrow button doesn't appear for CI
Solution: Verify you're logged in as CI role, not SA

Issue: "Cannot borrow new items while you have unreturned items"
Solution: Return your unreturned items first, or use a different CI account

Issue: Availability status doesn't update
Solution: Hard refresh the page (Ctrl + Shift + R)

SUCCESS CRITERIA

✓ Equipment list displays in RLE guides
✓ Availability status shows real-time stock levels
✓ CI users can borrow directly from RLE Guide
✓ Borrow dialog works correctly
✓ Borrow requests are created successfully
✓ Inventory matching works (fuzzy matching)
✓ Role-based access control works (CI only)
✓ Real-time updates work
✓ No errors in console
✓ No TypeScript errors

COMPARISON: BEFORE vs AFTER

BEFORE (Without Feature 2):
1. CI goes to RLE Guide
2. Sees equipment list (just names)
3. Remembers equipment name
4. Navigates to Inventory page
5. Searches for equipment
6. Clicks Borrow button
7. Fills out form
Total: 7 steps, 2 page navigations

AFTER (With Feature 2):
1. CI goes to RLE Guide
2. Sees equipment with availability
3. Clicks Borrow button
4. Submits request
Total: 4 steps, 0 page navigations

TIME SAVED: ~60-70% reduction in steps
CONVENIENCE: No need to remember equipment names or switch pages
