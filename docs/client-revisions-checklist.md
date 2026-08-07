# Client Revisions Implementation Checklist

Use this checklist sequentially. A feature is only complete when its database behavior, frontend behavior, permissions, error handling, and validation are finished.

## Confirmed decisions

- Reservations must be created at least two calendar days before the borrowing start date.
- Reservations may be created more than two days in advance; there is no maximum advance window.
- Reserved stock is held immediately when the SA creates the reservation.
- Extensions are granted by the SA one day at a time.
- Students are not currently registered system users; student tags will initially be captured as borrowing records.
- RLE Mark All selects every available equipment item under an RLE procedure; Delete Mark enters a mode for unmarking selected items individually.

## Confirmed automatic issue behavior

- Approved reservations hold stock immediately and automatically create the borrow transaction on the reservation start date. The transaction due date is the reservation end date at 9:00 PM Asia/Manila. Reservations created early are not recorded as borrowed until their start date.

## Technical dependency note

- Stock validation is listed as Feature 6 by the client, but its database/RPC foundation must be completed before reservation holds and RLE bulk borrowing can be trusted.

---

## Feature 1 — Overdue timing and due-date extensions

### Analysis and data model

- [ ] Confirm the application's canonical local timezone.
- [x] Replace the seven-day due-date rule with a due timestamp at 9:00 PM two local calendar days after a regular borrow is requested/approved.
- [ ] Decide whether to store `due_at` directly or derive it from `due_date` plus a fixed 9:00 PM time.
- [ ] Add extension request/history data with requester, approver, decision, old due date, new due date, and audit timestamps.

### Backend and permissions

- [ ] Add automatic overdue processing at 9:00 PM in the canonical timezone.
- [ ] Allow a CI to request one additional day at a time.
- [ ] Allow an SA to approve or reject each extension request.
- [ ] Ensure each approved extension moves the deadline exactly one day while retaining 9:00 PM.
- [ ] Prevent extensions for returned transactions.
- [ ] Add database-level role checks and audit logging.

### Frontend and validation

- [ ] Update borrow, transaction, dashboard, report, and status-display logic.
- [ ] Add CI extension-request controls.
- [ ] Add SA approval/rejection controls.
- [ ] Display extension history and the effective due timestamp.
- [ ] Validate overdue, same-day, future-date, returned, and rejected scenarios.
- [ ] Feature 1 sign-off: [ ]

---

## Feature 2 — Reservation window and automatic stock holding

### Reservation rules

- [x] Enforce `start_date >= local_today + 2 calendar days`.
- [x] Allow reservations with no maximum advance date.
- [x] Validate that the end date is not before the start date.
- [x] Validate positive quantities and available stock under a row lock.

### Stock lifecycle

- [x] Hold reserved quantity immediately when the SA creates the reservation.
- [x] Release the hold when a reservation is rejected, cancelled, expired, or otherwise completed without issue.
- [x] Prevent held quantity from being borrowed by another user through locked borrow approval.
- [x] Link the reservation to the issued transaction.
- [x] Prevent double deduction when a held reservation becomes an issued borrow.
- [x] Return the physical stock only after the issued transaction is returned.

### Automatic issue

- [x] Implement the approved automatic-issue timing decision.
- [x] If issued on the start date, create/activate the borrow transaction automatically on that date.
- [x] Define behavior when the reservation start date arrives but no stock/CI state is valid: only approved reservations issue; pending reservations expire after their end date and release their hold.
- [ ] Feature 2 sign-off: [ ]

---

## Feature 3 — SA-only reservations and CI transaction visibility

- [x] Remove reservation creation controls from the CI interface.
- [x] Allow only an SA to create a reservation.
- [x] Let the SA select the registered CI who will borrow the item.
- [x] Store the SA creator separately from the borrowing CI.
- [x] Remove the redundant SA approval step for newly created reservations; retain legacy approval RPC compatibility.
- [x] Show the reservation in the selected CI's Transactions menu before issuance.
- [x] Display item, quantity, CI, CI ID, reservation status, start date, and end date.
- [x] Add a calendar period indicator and reservation schedule showing the needed-through date.
- [x] Enforce SA/CI visibility and mutation rules at the database level.
- [ ] Validate creation, CI visibility, direct URL access, and unauthorized mutation attempts.
- [ ] Feature 3 sign-off: [ ]

---

## Feature 4 — Student tagging and return approval

### Data and constraints

- [ ] Add a transaction-student tagging table or equivalent child-record model.
- [ ] Store student name and an identifier/student number if available.
- [ ] Enforce a minimum of one tagged student.
- [ ] Enforce a maximum of three tagged students.
- [ ] Prevent duplicate tags within the same borrowing transaction.

### Frontend workflow

- [ ] Add SA controls for tagging accompanying students during borrowing/issuance.
- [ ] Support tagging for regular borrowing, reservation issuance, and RLE bulk borrowing.
- [ ] Display tagged students in the CI transaction view and SA transaction view.
- [ ] Let the SA record which tagged student returned the equipment.
- [ ] Allow the SA to approve the return and release stock.
- [ ] Add audit details for student tags and the returning student.
- [ ] Validate zero, one, three, and four-student cases.
- [ ] Feature 4 sign-off: [ ]

---

## Feature 5 — RLE Mark All and Delete Mark

- [x] Confirm the final labels: `Mark All`, `Delete Mark`, and modal `Done`.
- [ ] Add bulk selection state for equipment under the selected RLE procedure.
- [ ] Add a Mark All action.
- [x] Add a Delete Mark mode with individual unmark controls for selected equipment.
- [ ] Preserve individual selection and deselection.
- [ ] Add a bulk Borrow/Request action for selected equipment.
- [ ] Validate each selected item's stock before creating requests.
- [ ] Make bulk creation atomic or clearly report partial failures.
- [ ] Include student tagging in the bulk borrowing flow.
- [ ] Confirm selected equipment remains visible in the procedure and transaction views.
- [ ] Validate empty selection, unavailable equipment, mixed availability, and successful bulk borrowing.
- [ ] Feature 5 sign-off: [ ]

---

## Feature 6 — Stock validation and availability integrity

### Database integrity

- [ ] Resolve the `stock_total` versus `maintaining_stock` schema/type mismatch.
- [ ] Enforce non-negative maintaining and available stock.
- [ ] Enforce available stock not exceeding maintaining stock.
- [ ] Include active reservation holds in borrowable availability.
- [ ] Add a transactional stock-validation RPC/function with row locking.
- [ ] Return a clear error containing the currently available quantity.

### All stock-changing paths

- [ ] Validate regular borrow requests.
- [ ] Validate SA transaction approvals.
- [ ] Validate reservation creation and holding.
- [ ] Validate automatic reservation issuance.
- [ ] Validate RLE bulk borrowing.
- [ ] Validate returns and prevent stock inflation or duplicate returns.
- [ ] Validate manual inventory edits and restocking.
- [ ] Add concurrency/race-condition coverage.
- [ ] Feature 6 sign-off: [ ]

---

## Feature 7 — Student Assistant attendance bug fix

- [x] Reproduce and document the current attendance failure scenario.
- [x] Scope clock-out updates to the authenticated SA and an open attendance record.
- [x] Prevent clocking out another user's attendance record.
- [x] Normalize local date/time and timezone handling.
- [x] Decide how overnight attendance durations should behave.
- [x] Display attendance fetch and mutation errors in the page.
- [x] Add route-level and database-level SA access enforcement.
- [ ] Validate clock-in, duplicate clock-in, clock-out, duplicate clock-out, midnight, and unauthorized cases.
- [ ] Feature 7 sign-off: [ ]

---

## Final integration and release checks

- [ ] Add and apply ordered Supabase migrations without editing deployed history destructively.
- [ ] Update TypeScript database types and shared interfaces.
- [ ] Verify SA and CI permissions from both UI and direct-request paths.
- [ ] Verify reservation, borrowing, overdue, extension, return, and stock state transitions together.
- [ ] Verify dashboard, transactions, reservation, RLE, inventory, reports, and audit-log consistency.
- [ ] Add focused automated tests for each completed feature.
- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Resolve or document existing lint failures, then run `npm run lint`.
- [ ] Update the new spec requirements, design, and task dependency graph.
- [ ] Final client acceptance sign-off: [ ]
