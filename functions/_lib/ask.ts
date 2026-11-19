/**
 * Ask endpoint helpers: Workers AI call, JSON clamp, light rate limit.
 */

import { AVAILABILITY_SCHEDULE } from '../../src/config/availability';
import { parseAvailabilityAsk } from '../../src/lib/availability/parseQuery';
import {
  addDaysInZone,
  dateKeyInZone,
  startOfDayInZone,
} from '../../src/lib/availability/time';

export type AskEnv = {
  AI?: {
    run: (model: string, inputs: Record<string, unknown>) => Promise<unknown>;
  };
};

export type AskPayload = {
  duration: number;
  rangeStart: string;
  rangeEnd: string;
  timeOfDay: 'any' | 'morning' | 'afternoon';
  preferredDays?: string[];
  reply: string;
  source: 'ai' | 'local';
};

const ALLOWED_DURATIONS = [15, 30, 60, 90] as const;
const MAX_INPUT = 300;
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MODEL_FALLBACK = '@cf/meta/llama-3.1-8b-instruct';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;

/** In-memory limiter (per isolate). Cache API backs it across requests when available. */
const memoryHits = new Map<string, { count: number; resetAt: number }>();

export function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export async function rateLimitAllow(
  request: Request,
  cache: Cache,
): Promise<boolean> {
  const ip = clientIp(request);
  const now = Date.now();
  const mem = memoryHits.get(ip);
  if (mem && mem.resetAt > now && mem.count >= RATE_LIMIT_MAX) return false;
  if (!mem || mem.resetAt <= now) {
    memoryHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    mem.count += 1;
  }

  try {
    const keyUrl = new URL('https://ask-rate-limit.internal/');
    keyUrl.searchParams.set('ip', ip);
    const key = new Request(keyUrl.toString(), { method: 'GET' });
    const hit = await cache.match(key);
    if (hit) {
      const body = (await hit.json()) as { count: number; resetAt: number };
      if (body.resetAt > now && body.count >= RATE_LIMIT_MAX) return false;
      const next = {
        count: body.resetAt > now ? body.count + 1 : 1,
        resetAt: body.resetAt > now ? body.resetAt : now + RATE_LIMIT_WINDOW_MS,
      };
      await cache.put(
        key,
        new Response(JSON.stringify(next), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `max-age=${Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)}`,
          },
        }),
      );
      return next.count <= RATE_LIMIT_MAX;
    }
    await cache.put(
      key,
      new Response(
        JSON.stringify({ count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `max-age=${Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)}`,
          },
        },
      ),
    );
  } catch {
    // Cache optional; memory limiter still applies.
  }
  return true;
}

export function clampInput(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  if (trimmed.length > MAX_INPUT) return trimmed.slice(0, MAX_INPUT);
  return trimmed;
}

function bookableBounds(timeZone: string, now = new Date()) {
  const start = dateKeyInZone(now, timeZone);
  const endDate = addDaysInZone(
    startOfDayInZone(now, timeZone),
    AVAILABILITY_SCHEDULE.lookAheadDays,
    timeZone,
  );
  const end = dateKeyInZone(endDate, timeZone);
  return { start, end };
}

function clampDateKey(key: string, min: string, max: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return min;
  if (key < min) return min;
  if (key > max) return max;
  return key;
}

function normalizeTimeOfDay(raw: unknown): 'any' | 'morning' | 'afternoon' {
  const v = String(raw || 'any').toLowerCase();
  if (v === 'morning') return 'morning';
  if (v === 'afternoon') return 'afternoon';
  return 'any';
}

function normalizeDuration(raw: unknown): number {
  const n = Number(raw);
  if (ALLOWED_DURATIONS.includes(n as (typeof ALLOWED_DURATIONS)[number])) return n;
  let best = 30;
  let bestDist = Infinity;
  for (const d of ALLOWED_DURATIONS) {
    const dist = Math.abs(d - n);
    if (dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return best;
}

function sanitizeReply(raw: unknown): string {
  let s = String(raw || '').trim().replace(/\s+/g, ' ');
  // Copy rules: no em dashes
  s = s.replace(/\u2014/g, ',').replace(/\u2013/g, '-');
  s = s.replace(/\bstreamlined\b/gi, 'simple');
  if (s.length > 180) s = `${s.slice(0, 177)}...`;
  if (!s) s = 'Here is what I found.';
  return s;
}

export function validateAskResult(
  raw: Partial<AskPayload> | null | undefined,
  opts: { timeZone: string; now?: Date },
): AskPayload {
  const bounds = bookableBounds(opts.timeZone, opts.now);
  const duration = normalizeDuration(raw?.duration ?? 30);
  let rangeStart = clampDateKey(String(raw?.rangeStart || bounds.start), bounds.start, bounds.end);
  let rangeEnd = clampDateKey(String(raw?.rangeEnd || rangeStart), bounds.start, bounds.end);
  if (rangeEnd < rangeStart) rangeEnd = rangeStart;
  const timeOfDay = normalizeTimeOfDay(raw?.timeOfDay);
  const preferredDays = Array.isArray(raw?.preferredDays)
    ? raw!.preferredDays!
        .map((d) => String(d).toLowerCase().slice(0, 3))
        .filter((d) => ['mon', 'tue', 'wed', 'thu', 'fri'].includes(d))
        .slice(0, 5)
    : undefined;
  return {
    duration,
    rangeStart,
    rangeEnd,
    timeOfDay,
    preferredDays: preferredDays?.length ? preferredDays : undefined,
    reply: sanitizeReply(raw?.reply),
    source: raw?.source === 'local' ? 'local' : 'ai',
  };
}

export function localAskFallback(
  text: string,
  opts: { timeZone: string; now?: Date },
): AskPayload {
  const parsed = parseAvailabilityAsk(text, {
    visitorTimeZone: opts.timeZone,
    now: opts.now,
    durations: ALLOWED_DURATIONS,
  });
  const bounds = bookableBounds(opts.timeZone, opts.now);
  if (!parsed.ok) {
    return validateAskResult(
      {
        duration: 30,
        rangeStart: bounds.start,
        rangeEnd: bounds.end,
        timeOfDay: 'any',
        reply: parsed.message.replace(/\u2014/g, ',').replace(/\u2013/g, '-'),
        source: 'local',
      },
      opts,
    );
  }
  return validateAskResult(
    {
      duration: parsed.durationMinutes,
      rangeStart: parsed.rangeStartKey || bounds.start,
      rangeEnd: parsed.rangeEndKey || parsed.rangeStartKey || bounds.start,
      timeOfDay:
        parsed.timeOfDay === 'all'
          ? 'any'
          : (parsed.timeOfDay as 'morning' | 'afternoon'),
      reply: `Got it: ${parsed.summary}.`,
      source: 'local',
    },
    opts,
  );
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] || text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function runAskAi(
  env: AskEnv,
  input: {
    text: string;
    timeZone: string;
    today: string;
    durations: number[];
  },
): Promise<AskPayload | null> {
  if (!env.AI || typeof env.AI.run !== 'function') return null;

  const system = `You parse calendar availability requests for Jesse Poteet.
Return ONLY a JSON object with keys:
duration (one of ${input.durations.join('/')}),
rangeStart (YYYY-MM-DD),
rangeEnd (YYYY-MM-DD),
timeOfDay ("any" | "morning" | "afternoon"),
preferredDays (optional array of mon/tue/wed/thu/fri),
reply (one short friendly sentence, no em dashes, never say streamlined).
Today is ${input.today} in timezone ${input.timeZone}.
Jesse is bookable weekdays only. Keep rangeStart/rangeEnd within about ${AVAILABILITY_SCHEDULE.lookAheadDays} days from today.
If the user says "next N weeks" or "sometime in the next N weeks", set range from today through today+N weeks.
If only a weekday is named (like Friday), set rangeStart/rangeEnd to that upcoming weekday.
Default duration to 30 when unclear.`;

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: input.text },
  ];

  const tryModel = async (model: string) => {
    const result = await env.AI!.run(model, {
      messages,
      max_tokens: 280,
      temperature: 0.2,
    });
    const text =
      typeof result === 'string'
        ? result
        : typeof result === 'object' && result && 'response' in result
          ? String((result as { response: unknown }).response)
          : JSON.stringify(result);
    const parsed = extractJsonObject(text);
    if (!parsed) return null;
    return validateAskResult(
      {
        duration: Number(parsed.duration),
        rangeStart: String(parsed.rangeStart || ''),
        rangeEnd: String(parsed.rangeEnd || ''),
        timeOfDay: parsed.timeOfDay as AskPayload['timeOfDay'],
        preferredDays: parsed.preferredDays as string[] | undefined,
        reply: String(parsed.reply || ''),
        source: 'ai',
      },
      { timeZone: input.timeZone },
    );
  };

  try {
    const primary = await tryModel(MODEL);
    if (primary) return primary;
  } catch (err) {
    console.warn('ask AI primary model failed', err);
  }
  try {
    return await tryModel(MODEL_FALLBACK);
  } catch (err) {
    console.warn('ask AI fallback model failed', err);
    return null;
  }
}
