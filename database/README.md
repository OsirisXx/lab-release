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
