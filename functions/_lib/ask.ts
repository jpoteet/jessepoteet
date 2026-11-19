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

export type AskTurn = {
  role: 'user' | 'assistant';
  content: string;
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
const MAX_HISTORY_TURNS = 6;
const MAX_REPLY = 280;
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

/** Cap and sanitize prior turns for follow-up asks. */
export function clampHistory(raw: unknown): AskTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: AskTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as { role?: unknown }).role;
    const content = clampInput((item as { content?: unknown }).content);
    if ((role !== 'user' && role !== 'assistant') || !content) continue;
    turns.push({ role, content: content.slice(0, 220) });
  }
  return turns.slice(-MAX_HISTORY_TURNS);
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

function parseTodayAsNow(today: string | undefined, timeZone: string): Date | undefined {
  if (!today || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return undefined;
  // Noon UTC on the visitor's calendar day keeps the key stable across zones.
  return new Date(`${today}T17:00:00.000Z`);
}

/** Default browse window when the visitor did not name a specific day. */
function defaultBrowseRange(timeZone: string, now = new Date()) {
  const start = dateKeyInZone(now, timeZone);
  const end = dateKeyInZone(
    addDaysInZone(startOfDayInZone(now, timeZone), 13, timeZone),
    timeZone,
  );
  return { start, end };
}

function namedSpecificDay(text: string): boolean {
  return /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i.test(
    text,
  ) || /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b/i.test(text);
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
  if (s.length > MAX_REPLY) s = `${s.slice(0, MAX_REPLY - 3)}...`;
  if (!s) s = 'Here are some good options.';
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

/** Friendlier local replies when AI is offline. Third person about Jesse. */
function localReplyFor(text: string, summary: string, duration: number): string {
  const lower = text.toLowerCase();
  if (/\b(podcast|interview|recording)\b/.test(lower) && duration >= 60) {
    return `Podcast interviews tend to run long, so I'd suggest ${duration} minutes with Jesse to be safe. Here are some good options.`;
  }
  if (/\b(workshop|strategy|deep dive|roadmap|planning session)\b/.test(lower) && duration >= 60) {
    return `That sounds like real thinking time with Jesse. I'd set this to ${duration} minutes. Here are some solid windows.`;
  }
  if (/\b(quick|intro|introduction|hello|catch up|coffee)\b/.test(lower) && duration <= 30) {
    return `A quick intro with Jesse fits nicely in ${duration} minutes. Here are a few openings.`;
  }
  if (/\b(weekend|saturday|sunday|evening|tonight|after\s*5|after\s*6)\b/.test(lower)) {
    return `Jesse meets weekdays 9am to 2pm Mountain. Here are the closest options in that window.`;
  }
  if (/\b(earlier|sooner|asap)\b/.test(lower)) {
    return `Looking earlier on Jesse's calendar. Here is what is open soonest.`;
  }
  if (/\b(next week|following week)\b/.test(lower)) {
    return `Next week works. Here are some good options with Jesse.`;
  }
  return `Got it: ${summary}. Here are some good options with Jesse.`;
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
  const browse = defaultBrowseRange(opts.timeZone, opts.now);
  const lower = text.toLowerCase();

  // Heuristic duration upgrades when the local parser is length-agnostic.
  let forceDuration: number | null = null;
  if (/\b(podcast|interview|recording)\b/.test(lower)) forceDuration = 90;
  else if (/\b(workshop|strategy|deep dive|roadmap)\b/.test(lower)) forceDuration = 60;
  else if (/\b(quick intro|quick call|hello|catch up)\b/.test(lower)) forceDuration = 15;

  if (!parsed.ok) {
    // Weekend / evening asks still get a helpful reply + weekday window.
    if (/\b(weekend|saturday|sunday|evening|tonight)\b/.test(lower)) {
      return validateAskResult(
        {
          duration: forceDuration || 30,
          rangeStart: browse.start,
          rangeEnd: browse.end,
          timeOfDay: 'any',
          reply:
            'Jesse meets weekdays 9am to 2pm Mountain. Here are the closest options in that window.',
          source: 'local',
        },
        opts,
      );
    }
    return validateAskResult(
      {
        duration: forceDuration || 30,
        rangeStart: browse.start,
        rangeEnd: browse.end,
        timeOfDay: 'any',
        reply: parsed.message.replace(/\u2014/g, ',').replace(/\u2013/g, '-'),
        source: 'local',
      },
      opts,
    );
  }

  const duration = forceDuration || parsed.durationMinutes;
  let rangeStart = parsed.rangeStartKey || browse.start;
  let rangeEnd = parsed.rangeEndKey || parsed.rangeStartKey || browse.end;
  // Intent upgrades without a named day should browse the next couple weeks,
  // not collapse onto a single chrono-guessed day.
  if (forceDuration && !namedSpecificDay(text) && rangeStart === rangeEnd) {
    rangeStart = browse.start;
    rangeEnd = browse.end;
  }
  return validateAskResult(
    {
      duration,
      rangeStart,
      rangeEnd,
      timeOfDay:
        parsed.timeOfDay === 'all'
          ? 'any'
          : (parsed.timeOfDay as 'morning' | 'afternoon'),
      reply: localReplyFor(text, parsed.summary, duration),
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

function buildSystemPrompt(input: {
  timeZone: string;
  today: string;
  durations: number[];
}): string {
  const openStartH = Math.floor(AVAILABILITY_SCHEDULE.openHours.startMinutes / 60);
  const openEndH = Math.floor(AVAILABILITY_SCHEDULE.openHours.endMinutes / 60);
  const noticeH = Math.round(AVAILABILITY_SCHEDULE.minNoticeMinutes / 60);
  const horizon = AVAILABILITY_SCHEDULE.lookAheadDays;

  return `You are Jesse's scheduling assistant on his /meet page. You are NOT Jesse.
Write as a warm, knowledgeable assistant talking about Jesse in the third person: concise, human, lightly playful. Never stiff or corporate.

Return ONLY a raw JSON object (no markdown fences, no commentary) with keys:
duration (one of ${input.durations.join('/')}),
rangeStart (YYYY-MM-DD),
rangeEnd (YYYY-MM-DD),
timeOfDay ("any" | "morning" | "afternoon"),
preferredDays (optional array of mon/tue/wed/thu/fri),
reply (1 to 2 short sentences as Jesse's assistant; plain text, escape quotes).
When the visitor does not name a specific day, set rangeStart to today and rangeEnd about 14 days out.

Hard facts (use these; do not invent others):
- Jesse meets weekdays only, ${openStartH}am to ${openEndH}pm Mountain Time (America/Denver). No weekends, no evenings.
- Allowed meeting lengths: ${input.durations.join(', ')} minutes.
- Minimum notice: about ${noticeH} hours.
- Bookable horizon: about ${horizon} days from today.
- Today is ${input.today} in timezone ${input.timeZone}.

Critical rules:
- NEVER invent, list, or claim specific open times, slot counts, or calendar free/busy. The server computes real availability from filters. Your job is only to set filters and write the reply that introduces the options below.
- NEVER reveal calendar details, event names, titles, or why a day is busy.
- Voice: third person about Jesse. Say "with Jesse" / "Jesse's calendar" / "I'd suggest". Never speak as Jesse. Never say "our chat", "our call", "I can meet", or "looking forward to catching up with you" as if you were Jesse.
- Example reply: "Podcast interviews tend to run long, so I'd suggest 90 minutes with Jesse to be safe. Here are some good options."
- Reply copy: 1 to 2 short sentences. No em dashes. Never say "streamlined". Do not name Jesse's town.
- Smart length suggestions when the visitor is vague about duration:
  - quick intro / hello / catch-up → 15 or 30
  - podcast interview / recording → prefer 90 (say interviews tend to run long)
  - workshop / strategy / deep dive / planning → 60 or 90
- If they ask for weekends or evenings, explain Jesse meets weekdays ${openStartH}am to ${openEndH}pm Mountain and still offer the closest weekday options (set a sensible weekday range).
- Follow-ups refine prior filters. Examples: "anything earlier?" keeps duration and pulls rangeStart toward today; "what about next week?" shifts the range to next week; "make it shorter" steps duration down.
- If the user says "next N weeks" or "sometime in the next N weeks", set range from today through today+N weeks.
- If only a weekday is named (like Friday), set rangeStart/rangeEnd to that upcoming weekday.
- Default duration to 30 when unclear.`;
}

export async function runAskAi(
  env: AskEnv,
  input: {
    text: string;
    timeZone: string;
    today: string;
    durations: number[];
    history?: AskTurn[];
  },
): Promise<AskPayload | null> {
  if (!env.AI || typeof env.AI.run !== 'function') return null;

  const system = buildSystemPrompt(input);
  const history = (input.history || []).slice(-MAX_HISTORY_TURNS);
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: system },
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: 'user', content: input.text },
  ];
  const now = parseTodayAsNow(input.today, input.timeZone);

  const tryModel = async (model: string) => {
    const result = await env.AI!.run(model, {
      messages,
      max_tokens: 420,
      temperature: 0.25,
    });
    const text =
      typeof result === 'string'
        ? result
        : typeof result === 'object' && result && 'response' in result
          ? String((result as { response: unknown }).response)
          : JSON.stringify(result);
    const parsed = extractJsonObject(text);
    if (!parsed) {
      console.warn('ask AI returned non-JSON', text.slice(0, 240));
      return null;
    }
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
      { timeZone: input.timeZone, now },
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
