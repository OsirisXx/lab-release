# Database Setup Instructions

Run these SQL files in Supabase SQL Editor **in this exact order**:

## 1. Base Schema (01-schema.sql)
Creates all tables, functions, triggers, and RLS policies.

**Tables created:**
- user_profiles
- inventory_items
- transactions
- reservations
- attendance
- audit_logs

**Run this first!**

## 2. Inventory Data (02-inventory-data.sql)
Imports 66 real inventory items from client's Excel files.

**Categories:**
- OR/DR Inventory (21 surgical instruments)
- NP2 Consumables (6 items)
- CSR Borrow (16 items)
- NP2 Borrow (15 items)
- CSR Consumables (8 items)

**Run this second!**

## 3. RLE Guides (03-rle-guides.sql)
Creates the editable RLE Guides table and default guides.

**Features:**
- Student Assistants can add/edit/delete guides
- Default guides for all 4 year levels
- Real-time updates

**Run this third!**

---

## Quick Setup

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste `01-schema.sql` → Run
3. Copy and paste `02-inventory-data.sql` → Run
4. Copy and paste `03-rle-guides.sql` → Run

Done! Your database is ready.

---

## Troubleshooting

**Error: "relation user_profiles does not exist"**
- You skipped step 1. Run `01-schema.sql` first.

**Error: "violates check constraint stock_check"**
- Already fixed in `02-inventory-data.sql`

**Error: "duplicate key value"**
- You already ran this script. Skip it or clear the table first.

## Existing deployment migrations

For an existing deployment that already ran the base scripts, apply these migrations in order:

1. `04-delete-user-function.sql`
2. `05-rename-total-stock.sql`
3. `06-add-equipment-to-rle-guides.sql`
4. `07-fix-user-delete-audit.sql`
5. `08-overdue-extensions.sql`
6. `10-reservation-stock-holds.sql`
7. `11-sa-reservation-ci-tagging.sql`
8. `12-student-tagging.sql`
9. `13-rle-bulk-borrow.sql`
10. `14-stock-validation.sql`
11. `15-two-day-borrow-due-date.sql`

After `08-overdue-extensions.sql` succeeds, the optional Feature 1 seed is `09-feature-1-test-data.sql` and its matching cleanup is `09-remove-feature-1-test-data.sql`.

## 7. User Delete Repair (07-fix-user-delete-audit.sql)

Run this migration on existing deployments after the previous scripts. It repairs the audit-log and RLE-guide foreign keys and replaces the user deletion function so the audit entry is written before deletion, self-deletion is rejected, and only the authenticated Student Assistant can perform the action.

## 8. Overdue and Extension Migration (08-overdue-extensions.sql)

Run this on an existing deployment after `07-fix-user-delete-audit.sql`. It adds the 9:00 PM due timestamp, same-day overdue processing, extension request history, and the CI/SA extension RPCs. The migration assumes the application timezone is `Asia/Manila`.

The Vercel cron also needs the server-only `SUPABASE_SERVICE_ROLE_KEY` environment variable to mark overdue transactions when no user is active in the app.

## Feature 1 Test Data (optional and reversible)

Only run `09-feature-1-test-data.sql` after the Feature 1 migration has succeeded and after recording the target database/run date. It creates four inventory items with `FEATURE1-TEST-*` item codes, three transactions linked to the earliest existing CI profile, one pending extension request, and one marked audit entry. These records are intentionally fake and should not be mixed with real inventory.

Remove only those records with `09-remove-feature-1-test-data.sql`. The cleanup script targets the unique test item codes and `[FEATURE1-TEST]` audit marker; it does not delete ordinary inventory or transactions.

## 10. Reservation Window and Stock Holds (`10-reservation-stock-holds.sql`)

Run this after `08-overdue-extensions.sql` on an existing deployment. It enforces a minimum reservation start date of two local calendar days ahead, holds stock immediately with a row lock, releases held stock on rejection/cancellation/expiry, and automatically issues approved reservations on their start date without deducting the held quantity twice. It also hardens normal borrow approval with a locked stock check.

The Vercel cron uses `process_due_reservations()` when `SUPABASE_SERVICE_ROLE_KEY` is configured. The reversible test fixture is `10-feature-2-test-data.sql`; run it only in the intended test database, exercise the reservation through the UI, and remove it with `10-remove-feature-2-test-data.sql` after testing.

## 11. SA Reservation and CI Tagging (`11-sa-reservation-ci-tagging.sql`)

Run this after `10-reservation-stock-holds.sql`. It adds the SA creator identity, requires a registered CI borrower, makes new SA-created reservations approved in one operation, and exposes the selected CI's reservation through the existing borrower-based visibility rules. The reservation period is shown in both the SA Reservations page and the CI Transactions page.

## 12. Student Tagging and Return Approval (`12-student-tagging.sql`)

Run this after `11-sa-reservation-ci-tagging.sql`. It adds reservation and transaction student-tag records, enforces 1–3 unique student names, stores optional student numbers, copies reservation tags into automatically issued transactions, and records the tagged student selected by the SA when approving a return. The migration replaces the reservation, borrow-approval, and return RPC signatures used by the updated frontend.

## 13. RLE Bulk Borrow Requests (`13-rle-bulk-borrow.sql`)

Run this after `12-student-tagging.sql`. It adds the atomic Student Assistant-authorized database function used by the RLE Procedure's Mark All, Delete Mark, and Borrow Marked workflow. The function creates pending requests for all selected available equipment; stock is still deducted only when the SA approves each transaction and tags the accompanying students.

## 14. Stock Validation (`14-stock-validation.sql`)

Run this after `13-rle-bulk-borrow.sql`. It adds the stock-aware regular borrow RPC, a database trigger and transaction insert policy backstop, nonnegative inventory constraints, and consistent available-stock errors for regular borrowing, RLE bulk requests, reservations, and SA approval.

## 15. Two-Day Borrow Due Date (`15-two-day-borrow-due-date.sql`)

Run this after `14-stock-validation.sql`. It changes regular and RLE borrow requests to use an automatic due date two local calendar days after the request/approval date at 9:00 PM Asia/Manila. Reservation-issued transactions retain their explicitly selected reservation end date and 9:00 PM due time.
