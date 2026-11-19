/**
 * Cloudflare Pages Function: POST /api/ask
 *
 * Parses a plain-English meeting request via Workers AI (env.AI).
 * Falls back to the local chrono/regex parser when AI is missing or errors.
 *
 * Binding: [ai] binding = "AI" in wrangler.toml (or Pages dashboard → Bindings → Workers AI)
 */

import {
  clampInput,
  localAskFallback,
  rateLimitAllow,
  runAskAi,
  type AskEnv,
} from '../_lib/ask';

type Env = AskEnv;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders,
      ...extra,
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}) {
  const allowed = await rateLimitAllow(context.request, caches.default);
  if (!allowed) {
    return json(
      {
        ok: false,
        error: 'rate_limited',
        message: 'Too many asks. Wait a moment and try again.',
      },
      429,
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await context.request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'bad_json', message: 'Expected JSON body.' }, 400);
  }

  const text = clampInput(body.text);
  if (!text) {
    return json(
      {
        ok: false,
        error: 'empty',
        message: 'Type something like “30 minutes sometime in the next 3 weeks”.',
      },
      400,
    );
  }

  const timeZone =
    typeof body.timeZone === 'string' && body.timeZone.trim()
      ? body.timeZone.trim()
      : 'America/Denver';
  const today =
    typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
      ? body.today
      : new Date().toISOString().slice(0, 10);
  const durations = Array.isArray(body.durations)
    ? body.durations.map(Number).filter((n) => [15, 30, 60, 90].includes(n))
    : [15, 30, 60, 90];

  const aiResult = await runAskAi(context.env, {
    text,
    timeZone,
    today,
    durations: durations.length ? durations : [15, 30, 60, 90],
  });

  if (aiResult) {
    return json({ ok: true, ...aiResult, source: 'ai' });
  }

  const local = localAskFallback(text, { timeZone });
  return json({ ok: true, ...local, source: 'local' });
}
