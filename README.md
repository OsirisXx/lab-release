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

The Vercel deployment includes a daily read-only cron request at `/api/keepalive`. It selects only one `id` from `rle_guides` to provide minimal database activity and does not write application data. The endpoint uses the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables; `SUPABASE_URL` and `SUPABASE_ANON_KEY` may be used instead.

After deploying, confirm that Vercel has the Supabase environment variables configured for the deployment. Optionally set `CRON_SECRET` in Vercel to require the Vercel cron authorization header. The schedule is once daily at 06:00 UTC.
