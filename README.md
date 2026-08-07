# LabTrack - Laboratory Inventory Management System

A comprehensive inventory management system for Clinical Health Sciences laboratory equipment and consumables.

## Features
- Real-time inventory tracking
- Borrow/return workflow management
- Reservation system
- User management (Clinical Instructors & Student Assistants)
- Attendance tracking
- Reports and analytics
- Audit logging
- RLE guide management

## Tech Stack
- React + TypeScript
- Supabase (PostgreSQL + Auth)
- Tailwind CSS + shadcn/ui
- Vite

## Setup
See `SETUP-INSTRUCTIONS.md` for detailed setup guide.

## Supabase keep-alive

The Vercel deployment includes a daily cron request at `/api/keepalive`. It performs a minimal `rle_guides` read and, when `SUPABASE_SERVICE_ROLE_KEY` is configured, invokes the Feature 1 overdue-processing function and Feature 2 reservation-processing function at 13:00 UTC (9:00 PM Asia/Manila). The endpoint uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the read; `SUPABASE_URL` and `SUPABASE_ANON_KEY` may be used instead. Configure `CRON_SECRET` to require the Vercel cron authorization header.
