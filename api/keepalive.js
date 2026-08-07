export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseServiceRoleKey && !cronSecret) {
    return response.status(500).json({ error: 'CRON_SECRET must be configured when automatic overdue processing is enabled' });
  }
  if (cronSecret && request.headers.authorization !== `Bearer ${cronSecret}`) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response.status(500).json({ error: 'Supabase environment variables are not configured' });
  }

  try {
    const publicHeaders = { apikey: supabaseAnonKey };
    const supabaseResponse = await fetch(
      `${supabaseUrl}/rest/v1/rle_guides?select=id&limit=1`,
      { headers: publicHeaders, cache: 'no-store' },
    );

    if (!supabaseResponse.ok) {
      return response.status(502).json({
        error: 'Supabase keep-alive query failed',
        status: supabaseResponse.status,
      });
    }

    let overdueProcessed = null;
    let reservationsProcessed = null;
    if (supabaseServiceRoleKey) {
      const overdueResponse = await fetch(
        `${supabaseUrl}/rest/v1/rpc/mark_overdue_transactions`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseServiceRoleKey,
            Authorization: `Bearer ${supabaseServiceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
        },
      );

      if (!overdueResponse.ok) {
        return response.status(502).json({
          error: 'Automatic overdue processing failed',
          status: overdueResponse.status,
        });
      }

      overdueProcessed = await overdueResponse.json();

      const reservationResponse = await fetch(
        `${supabaseUrl}/rest/v1/rpc/process_due_reservations`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseServiceRoleKey,
            Authorization: `Bearer ${supabaseServiceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
        },
      );

      if (!reservationResponse.ok) {
        return response.status(502).json({
          error: 'Automatic reservation processing failed',
          status: reservationResponse.status,
        });
      }

      reservationsProcessed = await reservationResponse.json();
    }

    return response.status(200).json({
      ok: true,
      overdueProcessed,
      reservationsProcessed,
      warning: supabaseServiceRoleKey ? undefined : 'SUPABASE_SERVICE_ROLE_KEY is not configured; overdue and reservation processing occurs while SA users are active.',
    });
  } catch {
    return response.status(502).json({ error: 'Unable to reach Supabase' });
  }
}
