# Documentation

This folder contains all project documentation files.



## Feature 1 deployment configuration

Feature 1 uses `Asia/Manila` as the application timezone and treats 9:00 PM as the daily overdue cutoff. The Vercel cron at `13:00 UTC` invokes `/api/keepalive` daily. Configure `SUPABASE_SERVICE_ROLE_KEY` in Vercel so the cron can call `mark_overdue_transactions()` in the background. The browser also calls the function while users are active, but that is only a fallback when the service-role cron key is unavailable.

Feature 1 test records are created only by `database/09-feature-1-test-data.sql` and removed by `database/09-remove-feature-1-test-data.sql`. The seed includes one available fake item for submitting a same-day borrow request. Do not run the seed against production without explicitly recording the target database and test run.

## Feature 2 deployment configuration

Run `database/10-reservation-stock-holds.sql` after the Feature 1 migration. The same Vercel cron now processes both overdue transactions and approved reservations whose start date has arrived. `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` must be configured in Vercel. The Feature 2 fixture is `database/10-feature-2-test-data.sql`, with cleanup in `database/10-remove-feature-2-test-data.sql`.
