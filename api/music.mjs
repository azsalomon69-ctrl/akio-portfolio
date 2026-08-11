const AUDIUS_API_URL = 'https://api.audius.co/v1';
const MAX_RESULTS = 24;

function allowedOrigins() {
  return [process.env.FRONTEND_URL, ...(process.env.ALLOWED_ORIGINS || '').split(',')]
    .map(value => value?.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function corsHeaders(request) {
  const origin = request.headers.get('origin');
  if (!origin) return {};
  const localOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (!localOrigin && !allowedOrigins().includes(origin.replace(/\/$/, ''))) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin'
  };
}

function json(data, status, cors, cacheControl = 'no-store') {
  return Response.json(data, {
    status,
    headers: {
      ...cors,
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function apiKey() {
  return String(process.env.AUDIUS_API_KEY || '').trim();
}

function normalizeArtwork(artwork) {
  if (!artwork || typeof artwork !== 'object') return null;
  return {
    _150x150: artwork['150x150'] || artwork._150x150 || '',
    _480x480: artwork['480x480'] || artwork._480x480 || ''
  };
}

function normalizeTrack(track) {
  return {
    id: String(track?.id || ''),
    title: String(track?.title || 'Untitled track'),
    duration: Number(track?.duration || 0),
    genre: String(track?.genre || ''),
    mood: String(track?.mood || ''),
    permalink: String(track?.permalink || ''),
    artwork: normalizeArtwork(track?.artwork),
    user: {
      name: String(track?.user?.name || ''),
      handle: String(track?.user?.handle || '')
    },
    isStreamable: track?.is_streamable ?? track?.isStreamable ?? true,
    isStreamGated: track?.is_stream_gated ?? track?.isStreamGated ?? false,
    streamConditions: track?.stream_conditions ?? track?.streamConditions ?? null
  };
}

async function audiusRequest(pathname, searchParams = {}) {
  const endpoint = new URL(`${AUDIUS_API_URL}${pathname}`);
  endpoint.searchParams.set('api_key', apiKey());
  for (const [name, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== '') endpoint.searchParams.set(name, String(value));
  }
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    const error = new Error(`Audius returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export default {
  async fetch(request) {
    const cors = corsHeaders(request);
    if (cors === null) return json({ error: 'Origin not allowed.' }, 403, {});
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, cors);
    if (!apiKey()) return json({ error: 'Music service is not configured.' }, 503, cors);

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    try {
      if (action === 'trending') {
        const payload = await audiusRequest('/tracks/trending', { time: 'week', limit: MAX_RESULTS });
        return json({ data: (payload?.data || []).map(normalizeTrack) }, 200, cors, 'public, max-age=120');
      }
      if (action === 'search') {
        const query = String(url.searchParams.get('query') || '').trim().slice(0, 80);
        if (!query) return json({ error: 'A search query is required.' }, 400, cors);
        const payload = await audiusRequest('/tracks/search', { query, limit: MAX_RESULTS, sort_method: 'relevant' });
        return json({ data: (payload?.data || []).map(normalizeTrack) }, 200, cors, 'public, max-age=60');
      }
      if (action === 'stream') {
        const trackId = String(url.searchParams.get('id') || '').trim();
        if (!/^[a-zA-Z0-9_-]{1,80}$/.test(trackId)) return json({ error: 'A valid track ID is required.' }, 400, cors);
        const payload = await audiusRequest(`/tracks/${encodeURIComponent(trackId)}/stream`, {
          no_redirect: 'true',
          skip_play_count: 'false'
        });
        const streamUrl = typeof payload?.data === 'string' ? payload.data : '';
        if (!/^https:\/\//i.test(streamUrl)) return json({ error: 'Audius did not provide a playable stream.' }, 502, cors);
        return new Response(null, {
          status: 302,
          headers: {
            ...cors,
            Location: streamUrl,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
          }
        });
      }
      return json({ error: 'Unknown music action.' }, 400, cors);
    } catch (error) {
      console.warn('Audius request failed', { action, status: error?.status || 'network' });
      const status = [401, 403, 404, 429].includes(error?.status) ? error.status : 502;
      return json({ error: 'The music catalog is temporarily unavailable.' }, status, cors);
    }
  }
};
