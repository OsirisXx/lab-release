LABTRACK SYSTEM SETUP GUIDE

SYSTEM REQUIREMENTS

- Modern web browser (Chrome, Firefox, Edge, or Safari)
- Internet connection
- Supabase account (free tier is sufficient)

STEP 1: DATABASE SETUP

1. Go to https://supabase.com and sign in (or create a free account)

2. Create a new project:
   - Click "New Project"
   - Enter project name: "LabTrack"
   - Create a strong database password (save this password)
   - Select a region closest to your location
   - Click "Create new project"
   - Wait 2-3 minutes for project to be ready

3. Get your project credentials:
   - Go to Project Settings (gear icon in sidebar)
   - Click "API" section
   - Copy and save these two values:
     * Project URL (looks like: https://xxxxx.supabase.co)
     * anon/public key (long string starting with "eyJ...")

4. Set up the database tables:
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"
   - Open the file "database/01-schema.sql" from the project folder
   - Copy ALL the contents and paste into the SQL editor
   - Click "Run" button
   - You should see "Success. No rows returned"
   - This creates 7 tables: user_profiles, inventory_items, transactions, reservations, attendance, audit_logs, rle_guides

5. Add RLE guides data (optional):
   - Click "New Query" again
   - Open the file "database/03-rle-guides.sql"
   - Copy ALL contents and paste into SQL editor
   - Click "Run"
   - This adds the RLE guide information for all year levels

STEP 2: CONFIGURE THE APPLICATION

1. Locate the project folder on your computer

2. Find the file named ".env.local" in the root folder
   - If it doesn't exist, create a new file named ".env.local"

3. Open the .env.local file with a text editor (Notepad, VS Code, etc.)

4. Add these two lines (replace with your actual values from Step 1.3):
   VITE_SUPABASE_URL=your_project_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here

   Example:
   VITE_SUPABASE_URL=https://yjuxwzdboxtukfbwixoj.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

5. Save the file

STEP 3: RUN THE APPLICATION

1. Open a terminal or command prompt in the project folder

2. Install dependencies (first time only):
   npm install

3. Start the development server:
   npm run dev

4. The application will open at http://localhost:8080

5. You should see the login page

STEP 4: CREATE YOUR FIRST USER

1. Click "Sign Up" on the login page

2. Fill in the registration form:
   - Email: your email address
   - Password: create a strong password
   - Name: your full name
   - Role: Select "Student Assistant" for admin access

3. Click "Sign Up"

4. You will be automatically logged in

5. Your CI ID will be auto-generated (e.g., CI0001)

STEP 5: ADD INVENTORY DATA

Now you can start adding your inventory items from the Excel files:

1. Click "Inventory" in the sidebar

2. Click "Add Item" button

3. Fill in the form with data from your Excel sheets:
   - Item Code: e.g., OR-001, CSR-CON-CSB-01
   - Item Name: Full name of the item
   - Category: Select "Equipment" or "Consumable"
   - Unit: pcs, box, bottle, etc.
   - Total Stock: Total quantity
   - Available Stock: Currently available quantity
   - Location: OR/DRNCC1L, C1A, CSB, etc.
   - Condition: Good, Mixed, Defective, or Expired
   - Image URL: (optional) Link to item photo
   - Expiration Date: (optional, for consumables)
   - Last Restock Date: (optional)

4. Click "Add Item"

5. Repeat for all items in your Excel files

STEP 6: CREATE ADDITIONAL USERS

To add more Student Assistants or Clinical Instructors:

1. Have them go to http://localhost:8080

2. Click "Sign Up"

3. Fill in their information:
   - Email: their email address
   - Password: they create their own password
   - Name: their full name
   - Role: Select "Student Assistant" or "Clinical Instructor"

4. Click "Sign Up"

5. They will receive an auto-generated CI ID

USING THE SYSTEM

INVENTORY PAGE
- View all inventory items
- Search and filter by category
- Add new items (SA only)
- Edit existing items (SA only)
- Delete items (SA only)
- Borrow items (CI only)

TRANSACTIONS PAGE
- View all borrow/return requests
- Approve or reject requests (SA only)
- Mark items as returned (SA only)
- Track overdue items

RESERVATIONS PAGE
- Create new reservations (CI only)
- View all reservations
- Approve or reject reservations (SA only)

LOCATIONS PAGE
- View inventory organized by location
- See stock levels for each location

ATTENDANCE PAGE
- Time in/out for Student Assistants
- View attendance history
- Track hours worked

REPORTS PAGE
- View inventory statistics
- See top borrowed items
- Export reports to CSV

USERS PAGE
- View all registered users
- See CI IDs and roles

RLE GUIDES PAGE
- Access RLE guides for all year levels
- View topics and descriptions

AUDIT LOGS PAGE
- Track all system activities
- Monitor user actions
- View transaction history

TROUBLESHOOTING

Problem: Cannot connect to database
Solution: Check that your .env.local file has the correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

Problem: Login not working
Solution: Make sure you ran the 01-schema.sql file in Supabase SQL Editor

Problem: Items not appearing after adding
Solution: Hard refresh your browser (Ctrl + Shift + R on Windows, Cmd + Shift + R on Mac)

Problem: "Failed to load resource" errors
Solution: Check your internet connection and verify Supabase project is active

SUPPORT

If you encounter any issues during setup or usage, please contact me with:
- Description of the problem
- Screenshot of any error messages
- What you were trying to do when the error occurred

The system is now ready for your March 24 presentation and daily use.
