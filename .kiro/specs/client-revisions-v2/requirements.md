# Requirements Document

## Introduction

The client has requested a set of revisions to the NUF - CHS Inventory (formerly LabTrack) laboratory inventory management system. The revisions cover four areas: rebranding name/title references, updating the color theme to dark jungle green, displaying actual Student Assistant names and calculated durations on the Attendance page, and implementing client-side overdue detection for transactions and the dashboard.

## Glossary

- **App**: The NUF - CHS Inventory web application (React + TypeScript + Vite + Supabase)
- **Sidebar**: The persistent left-side navigation component (`AppSidebar.tsx`) containing the brand logo, navigation links, and user info
- **Login_Page**: The authentication page (`Login.tsx`) displayed to unauthenticated users
- **Browser_Tab**: The HTML document title shown in the browser tab, defined in `index.html`
- **Reports_Page**: The reports and analytics page (`Reports.tsx`) that includes Excel export functionality
- **RLE_Procedure_Page**: The page (`RleGuide.tsx`) displaying Related Learning Experience procedure guides (formerly "RLE Guide")
- **Inventory_Borrowing_Page**: The page (`Inventory.tsx`) displaying the inventory item list (formerly "Inventory")
- **CSS_Theme**: The set of CSS custom properties in `src/index.css` that define the application's color scheme
- **Attendance_Page**: The page (`Attendance.tsx`) displaying Student Assistant time-in/time-out records
- **Attendance_Record**: A row from the `attendance` table, joined with `user_profiles(name)` via the `useAttendance` hook
- **Transactions_Page**: The page (`Transactions.tsx`) displaying borrow/return transaction records with status filter tabs
- **Transaction**: A row from the `transactions` table with status one of: pending, approved, returned, overdue, rejected
- **Dashboard_Page**: The main dashboard page (`Dashboard.tsx`) displaying stat cards including an "Overdue Items" count
- **Overdue_Threshold**: 7 days — a transaction is overdue when its `due_date` is before today's date and its status is still "approved"
- **Duration**: The elapsed time between an attendance record's `time_in` and `time_out`, displayed in human-readable format (e.g., "2h 15m")

## Requirements

### Requirement 1: Rebrand Application Title from "LabTrack" to "NUF - CHS Inventory"

**User Story:** As a client stakeholder, I want the application name updated from "LabTrack" to "NUF - CHS Inventory" across all visible surfaces, so that the branding matches the official program name.

#### Acceptance Criteria

1. THE Browser_Tab SHALL display "NUF - CHS Inventory" as the document title instead of "LabTrack"
2. THE Browser_Tab SHALL include "NUF - CHS Inventory" in all Open Graph and Twitter meta tags instead of "LabTrack"
3. THE Sidebar SHALL display "NUF - CHS Inventory" as the brand name in the logo area instead of "LabTrack" with "CHS Inventory" subtitle
4. THE Login_Page SHALL display "NUF - CHS Inventory" as the brand name in both the desktop left panel and the mobile header instead of "LabTrack"
5. THE Reports_Page SHALL use "NUF_CHS_Inventory" as the prefix in the exported Excel filename instead of "LabTrack"
6. THE Reports_Page SHALL use "NUF - CHS Inventory Report" as the Excel worksheet tab name instead of "LabTrack Report"

### Requirement 2: Rename "RLE Guide" to "RLE Procedure"

**User Story:** As a client stakeholder, I want the "RLE Guide" label changed to "RLE Procedure" in navigation and page headings, so that the terminology aligns with the institution's preferred naming.

#### Acceptance Criteria

1. THE Sidebar SHALL display "RLE Procedure" as the navigation label for the RLE page instead of "RLE Guide"
2. THE RLE_Procedure_Page SHALL display "RLE Procedure" as the page heading instead of "RLE Guide"

### Requirement 3: Rename "Inventory" to "Inventory/Borrowing"

**User Story:** As a client stakeholder, I want the "Inventory" label changed to "Inventory/Borrowing" in navigation and page headings, so that the label better reflects the page's dual purpose.

#### Acceptance Criteria

1. THE Sidebar SHALL display "Inventory/Borrowing" as the navigation label for the inventory page instead of "Inventory"
2. THE Inventory_Borrowing_Page SHALL display "Inventory/Borrowing" as the page heading instead of "Inventory"

### Requirement 4: Update Color Theme to Dark Jungle Green

**User Story:** As a client stakeholder, I want the application's color scheme changed to dark jungle green, so that the visual identity matches the institution's preferred palette.

#### Acceptance Criteria

1. THE CSS_Theme SHALL use dark jungle green (approximately HSL 150 16% 12%) as the base hue for primary color variables instead of the current green (HSL 142)
2. THE CSS_Theme SHALL update the sidebar background, sidebar accent, and sidebar border variables to use the dark jungle green hue family
3. THE CSS_Theme SHALL update the primary, secondary, muted, accent, border, input, and ring variables to use the dark jungle green hue family
4. THE CSS_Theme SHALL update the success color variable to use the dark jungle green hue family
5. THE CSS_Theme SHALL preserve the existing warning, info, and destructive color values without modification

### Requirement 5: Display Actual Student Assistant Name on Attendance Page

**User Story:** As a Student Assistant manager, I want the Attendance page to show each SA's actual name instead of the hardcoded text "Student Assistant", so that I can identify who clocked in and out.

#### Acceptance Criteria

1. WHEN an Attendance_Record has a joined `user_profiles.name` value, THE Attendance_Page SHALL display that name as the record's label instead of the hardcoded text "Student Assistant"
2. WHEN an Attendance_Record has a joined `user_profiles.name` value, THE Attendance_Page SHALL display the user's initials (first letter of each word in the name) inside the avatar circle instead of the hardcoded text "SA"
3. IF an Attendance_Record does not have a joined `user_profiles.name` value, THEN THE Attendance_Page SHALL fall back to displaying "Student Assistant" as the label and "SA" as the avatar initials

### Requirement 6: Calculate and Display Duration on Attendance Page

**User Story:** As a Student Assistant manager, I want the Attendance page to show the calculated duration between time-in and time-out, so that I can track how long each SA worked.

#### Acceptance Criteria

1. WHEN an Attendance_Record has both `time_in` and `time_out` values, THE Attendance_Page SHALL calculate and display the elapsed duration in human-readable format (e.g., "2h 15m")
2. WHILE an Attendance_Record has a `time_in` value but no `time_out` value, THE Attendance_Page SHALL display "—" in the Duration column
3. WHEN the calculated duration is less than 60 minutes, THE Attendance_Page SHALL display the duration using only minutes (e.g., "45m")
4. WHEN the calculated duration is 60 minutes or more, THE Attendance_Page SHALL display the duration using hours and minutes (e.g., "2h 15m")

### Requirement 7: Client-Side Overdue Detection for Transactions

**User Story:** As a Student Assistant, I want transactions that are past their due date to be visually flagged as overdue in the transaction list, so that I can identify and follow up on late returns.

#### Acceptance Criteria

1. WHEN a Transaction has status "approved" and its `due_date` is before today's date, THE Transactions_Page SHALL display that transaction with an "overdue" status badge instead of "approved"
2. WHEN a Transaction has status "approved" and its `due_date` is today or in the future, THE Transactions_Page SHALL continue to display the "approved" status badge
3. WHEN the "Overdue" filter tab is selected on the Transactions_Page, THE Transactions_Page SHALL show all transactions that are detected as overdue (approved with `due_date` before today)
4. THE Dashboard_Page "Overdue Items" stat card SHALL display the count of transactions that have status "approved" and a `due_date` before today's date
5. THE Reports_Page overdue item count SHALL reflect the same client-side overdue detection logic used by the Dashboard_Page and Transactions_Page
