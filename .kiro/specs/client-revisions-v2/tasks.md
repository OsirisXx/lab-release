# Implementation Plan: Client Revisions V2

## Overview

Implement seven client-requested revisions to the NUF - CHS Inventory system: rebranding (Requirements 1–3), color theme update (Requirement 4), attendance name/duration display (Requirements 5–6), and client-side overdue detection (Requirement 7). All changes are client-side only — no database or API modifications needed.

## Tasks

- [x] 1. Rebrand application title and meta tags in index.html
  - Replace `<title>` from "LabTrack - Laboratory Inventory Management System" to "NUF - CHS Inventory"
  - Update `<meta name="description">` to "NUF - CHS Inventory - Laboratory Inventory Management System"
  - Update `<meta name="author">` from "LabTrack" to "NUF - CHS Inventory"
  - Update `<meta property="og:title">` to "NUF - CHS Inventory"
  - Update `<meta name="twitter:title">` to "NUF - CHS Inventory"
  - _Requirements: 1.1, 1.2_

- [x] 2. Rebrand sidebar, login, reports, and page headings
  - [x] 2.1 Update AppSidebar.tsx brand area and nav labels
    - Change brand `<h1>` from "LabTrack" to "NUF - CHS Inventory"
    - Remove the `<p>CHS Inventory</p>` subtitle line (brand name now includes it)
    - Change nav item label "Inventory" to "Inventory/Borrowing"
    - Change nav item label "RLE Guide" to "RLE Procedure"
    - _Requirements: 1.3, 2.1, 3.1_

  - [x] 2.2 Update Login.tsx brand references
    - Change desktop left panel `<h1>` from "LabTrack" to "NUF - CHS Inventory"
    - Remove the desktop `<p>CHS Inventory System</p>` subtitle
    - Change mobile header `<span>` from "LabTrack" to "NUF - CHS Inventory"
    - _Requirements: 1.4_

  - [x] 2.3 Update Reports.tsx export filename and sheet name
    - Change filename from `LabTrack_Report_${timestamp}.xlsx` to `NUF_CHS_Inventory_Report_${timestamp}.xlsx`
    - Change sheet name from "LabTrack Report" to "NUF - CHS Inventory Report"
    - _Requirements: 1.5, 1.6_

  - [x] 2.4 Update RleGuide.tsx heading and subtitle
    - Change page heading from "RLE Guide" to "RLE Procedure"
    - Change subtitle from "Related Learning Experience guides for all year levels" to "Related Learning Experience procedures for all year levels"
    - _Requirements: 2.2_

  - [x] 2.5 Update Inventory.tsx page heading
    - Change heading from "Inventory" to "Inventory/Borrowing"
    - _Requirements: 3.2_

- [x] 3. Update color theme to dark jungle green in src/index.css
  - Replace all CSS custom properties using hue 142 with hue 150 values per design spec
  - Set `--sidebar-background: 150 16% 12%` (exact dark jungle green #1A2421)
  - Set `--primary: 150 40% 30%` and `--accent: 150 40% 38%`
  - Set secondary/muted/border variables to hue 150 with low saturation
  - Preserve `--warning`, `--info`, and `--destructive` values unchanged
  - Verify both SA and CI views render correctly with new theme
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Checkpoint - Verify rebranding and theme
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement attendance name display and duration calculation
  - [x] 5.1 Add getInitials() and formatDuration() helper functions to Attendance.tsx
    - Add `getInitials(name: string): string` — splits on whitespace, takes first char of each word, uppercases
    - Add `formatDuration(timeIn: string, timeOut: string | null): string` — calculates elapsed time, returns formatted string or "—"
    - _Requirements: 5.2, 6.1, 6.2, 6.3, 6.4_

  - [x] 5.2 Update Attendance.tsx table rows to use actual SA names and duration
    - Replace hardcoded "Student Assistant" with `record.user_profiles?.name ?? "Student Assistant"`
    - Replace hardcoded "SA" avatar initials with `record.user_profiles?.name ? getInitials(record.user_profiles.name) : "SA"`
    - Replace hardcoded "—" duration with `formatDuration(record.time_in, record.time_out)`
    - Ensure fallback behavior when `user_profiles` is undefined (shows "Student Assistant" / "SA")
    - Verify display from SA perspective (sees all records with names) and CI perspective (if applicable)
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2_

  - [ ]* 5.3 Write property test for getInitials (Property 1)
    - **Property 1: Initials extraction produces first letter of each word**
    - Generate random name strings (1–5 whitespace-separated words, various casing)
    - Verify output length equals number of words
    - Verify each character is the uppercase first letter of the corresponding word
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 5.2**

  - [ ]* 5.4 Write property test for formatDuration (Property 2)
    - **Property 2: Duration formatting correctness**
    - Generate random valid HH:MM pairs where timeOut >= timeIn
    - Verify format matches `"{M}m"` when difference < 60 minutes
    - Verify format matches `"{H}h"` when difference >= 60 with zero remainder
    - Verify format matches `"{H}h {M}m"` when difference >= 60 with non-zero remainder
    - Verify parsing the returned string back into total minutes equals the actual difference
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 6.1, 6.3, 6.4**

- [x] 6. Implement client-side overdue detection
  - [x] 6.1 Add isOverdue() and getEffectiveStatus() helpers to useTransactions.ts
    - Export `isOverdue(transaction: { status: string; due_date: string }): boolean` — returns true only when status is "approved" AND due_date < today (ISO string comparison)
    - Export `getEffectiveStatus(transaction: Transaction): string` — returns "overdue" if isOverdue, otherwise returns transaction.status
    - _Requirements: 7.1, 7.2_

  - [x] 6.2 Update Transactions.tsx to use overdue detection
    - Import `getEffectiveStatus` and `isOverdue` from useTransactions
    - Replace `tx.status` in StatusBadge with `getEffectiveStatus(tx)`
    - Update filter logic: when "overdue" filter is selected, show transactions where `isOverdue(tx)` is true
    - Ensure SA can see overdue items and take action (Return button still works for overdue items)
    - Ensure CI can see their own overdue items in the list
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 6.3 Update Dashboard.tsx overdue count to use isOverdue helper
    - Import `isOverdue` from `@/hooks/useTransactions`
    - Replace `transactions.filter((t) => t.status === "overdue").length` with `transactions.filter(isOverdue).length`
    - Verify overdue count displays correctly for both SA (all transactions) and CI (own transactions)
    - _Requirements: 7.4_

  - [x] 6.4 Update Reports.tsx overdue count and Excel export to use isOverdue helper
    - Import `isOverdue` from `@/hooks/useTransactions`
    - Replace `transactions.filter(t => t.status === 'overdue').length` with `transactions.filter(isOverdue).length` in both the stat card and the Excel export summary row
    - Verify Reports page (SA-only) shows correct overdue count matching Dashboard
    - _Requirements: 7.5_

  - [ ]* 6.5 Write property test for isOverdue (Property 3)
    - **Property 3: Overdue detection correctness**
    - Generate random transaction objects with varied statuses ("pending", "approved", "returned", "overdue", "rejected") and due_dates (past, today, future in YYYY-MM-DD format)
    - Verify `isOverdue` returns true if and only if status === "approved" AND due_date < today
    - Verify returns false for all other statuses regardless of due_date
    - Verify returns false when due_date is today or in the future even with status "approved"
    - Use fast-check with minimum 100 iterations
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify the system works correctly from both SA and CI perspectives:
    - SA sees all attendance records with actual names and durations
    - SA sees all overdue transactions across all users
    - CI sees their own overdue transactions in the transaction list
    - Both roles see the updated branding and color theme throughout the app

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- All changes are client-side only — no database schema or API changes required
- The project uses TypeScript, React, Vite, Vitest, and fast-check for property-based tests
- Install fast-check before running property tests: `npm install --save-dev fast-check`
