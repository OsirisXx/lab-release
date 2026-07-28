export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.authorization !== `Bearer ${cronSecret}`) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response.status(500).json({ error: 'Supabase environment variables are not configured' });
  }

  try {
    const supabaseResponse = await fetch(
      `${supabaseUrl}/rest/v1/rle_guides?select=id&limit=1`,
      {
        headers: {
          apikey: supabaseAnonKey,
        },
        cache: 'no-store',
      },
    );

    if (!supabaseResponse.ok) {
      return response.status(502).json({
        error: 'Supabase keep-alive query failed',
        status: supabaseResponse.status,
      });
    }

    return response.status(200).json({ ok: true });
  } catch {
    return response.status(502).json({ error: 'Unable to reach Supabase' });
  }
}
