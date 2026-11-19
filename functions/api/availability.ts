/**
 * Cloudflare Pages Function: GET /api/availability
 *
 * Fetches Jesse's connected calendar events from Reclaim, merges busy blocks,
 * and returns ONLY start/end busy intervals plus schedule meta.
 * Never returns titles, attendees, descriptions, or calendar ids.
 *
 * Secret: RECLAIM_API_TOKEN (Pages encrypted secret)
 * Optional (dev only): ALLOW_MOCK_AVAILABILITY=true
 */

import {
  CACHE_SECONDS,
  fetchReclaimBusy,
  isMockAllowed,
  mockSuccess,
  unavailable,
  type Env,
} from '../_lib/availability';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestGet(context: {
  request: Request;
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
}) {
  const cache = caches.default;
  const cacheUrl = new URL(context.request.url);
  // Stable cache key: ignore query noise
  cacheUrl.search = '';
  cacheUrl.pathname = '/api/availability';
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });

  const cached = await cache.match(cacheKey);
  if (cached) {
    const hit = new Response(cached.body, cached);
    hit.headers.set('X-Availability-Cache', 'hit');
    return hit;
  }

  const token = context.env.RECLAIM_API_TOKEN?.trim();

  try {
    let payload;
    if (token) {
      payload = await fetchReclaimBusy(token);
    } else if (isMockAllowed(context.env)) {
      console.warn('RECLAIM_API_TOKEN missing; serving mock availability (ALLOW_MOCK_AVAILABILITY)');
      payload = mockSuccess();
    } else {
      return json(
        unavailable(
          'missing_token',
          'Availability is unavailable right now. You can still book a time on Jesse’s scheduling page.',
        ),
        503,
        { 'Cache-Control': 'no-store' },
      );
    }

    const response = json(payload, 200, {
      'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, max-age=60, stale-while-revalidate=120`,
      'X-Availability-Cache': 'miss',
      'X-Availability-Source': payload.source,
    });

    // Cache successful payloads only (never cache errors / mock unless desired).
    // Caching mock in preview is fine when ALLOW_MOCK is on.
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    console.error('availability endpoint failed', error);
    return json(
      unavailable(
        'upstream_error',
        'Availability is unavailable right now. You can still book a time on Jesse’s scheduling page.',
      ),
      502,
      { 'Cache-Control': 'no-store' },
    );
  }
}
