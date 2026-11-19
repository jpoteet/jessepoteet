# jessepoteet.com

Personal hub for **Jesse Poteet**: expertise, brands, writing, and clear ways to work together. Astro + Tailwind static site on Cloudflare Pages, with Pages Functions for the contact form and live availability.

## Local development

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

Note: `astro preview` serves the static `dist/` output only. Pages Functions (`/api/contact`, `/api/availability`) run on Cloudflare Pages (or via Wrangler Pages). To exercise them locally:

```bash
npm run build
npx wrangler pages dev dist
```

For availability without a Reclaim token, put `ALLOW_MOCK_AVAILABILITY=true` in `.dev.vars` (gitignored). On `localhost`, the `/meet` page also falls back to mock data if the API is unreachable so `astro dev` still shows a working UI.

## Cloudflare Pages settings

Connect this GitHub repo in the Cloudflare dashboard (**Workers & Pages** → **Create** → **Pages** → import the repo), then use:

| Setting | Value |
| --- | --- |
| Framework preset | Astro (or None) |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (repository root) |
| Node.js version | `22` (or current LTS; set via environment variable `NODE_VERSION=22` if needed) |

Static assets included for Pages:

- `public/_redirects` (e.g. `/ventures` → `/work`)
- `public/_headers` (security and cache headers)
- `functions/api/contact.ts` → `POST /api/contact`
- `functions/api/availability.ts` → `GET /api/availability`

Custom domain: `jessepoteet.com` on the Cloudflare Pages project **jessepoteet**. Preview deployments appear on pull requests.

## Environment variables

Set these in the Cloudflare Pages project (**Settings** → **Environment variables**), for Production and Preview as needed. Never commit secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `CONTACT_WEBHOOK_URL` | Yes (for form delivery) | n8n webhook URL. The function POSTs validated JSON here. |
| `CONTACT_WEBHOOK_SECRET` | No | If set, sent as the `X-Webhook-Secret` request header so n8n can verify the caller. |
| `RECLAIM_API_TOKEN` | Yes (for live availability) | Bearer token for `GET https://api.app.reclaim.ai/api/events`. Set as an encrypted Pages secret. Never expose to the client. |
| `ALLOW_MOCK_AVAILABILITY` | No (dev only) | When `true` and `RECLAIM_API_TOKEN` is missing, `/api/availability` returns mock busy intervals. Do not enable in production. |
| `NODE_VERSION` | No | Pin Node for builds, e.g. `22`. |

### Availability API

`GET /api/availability` returns merged busy intervals only (no titles, attendees, descriptions, or calendar ids), plus schedule meta (open hours, timezone, look-ahead). The `/meet` page computes open slots in the browser and re-filters instantly when length or window changes. Responses are edge-cached for about 7 minutes.

### Contact webhook payload

`POST /api/contact` validates the form (and honeypot), then forwards JSON like:

```json
{
  "site": "jessepoteet.com",
  "requestType": "podcast",
  "name": "Alex Host",
  "email": "alex@example.com",
  "showOrEvent": "Shop Floor Podcast",
  "link": "https://example.com/show",
  "proposedDate": "2026-05-12",
  "audienceSize": "2k downloads / episode",
  "message": "Would love to have you on…",
  "pageUrl": "https://jessepoteet.com/contact?type=podcast",
  "timestamp": "2026-05-01T18:22:11.000Z"
}
```

n8n should log the row to Airtable and email Jesse. The form UI shows a friendly success or error message based on the function response.

## Site config

| File | Purpose |
| --- | --- |
| `src/config/site.ts` | Site name, tagline, newsletter URL |
| `src/config/brands.ts` | Standalone brands (Alpine, Operator Stack), PrintPro Strategies family, beliefs, press |
| `src/config/contact.ts` | Request types, work-with-me paths, speaker bios and topics |
| `src/config/social.ts` | Person JSON-LD `sameAs` (verified brand URLs only) |
| `src/config/nav.ts` | Main nav |
| `src/config/availability.ts` | Personal availability profile + open-hours schedule (easy to extend for branded URLs later) |
| `src/lib/availability/` | Busy merge, slot math, mock fixture |
| `src/content/writing/` | Writing collection |
| `functions/api/contact.ts` | Contact form API → n8n webhook |
| `functions/api/availability.ts` | Live Reclaim busy intervals |

Newsletter CTA points to Gathered via `NEWSLETTER_URL`.

Default Open Graph image: `public/images/og-default.png` (1200×630). Optional logo files can later drop into `public/images/logos/` (monograms show until then).

## License

Private personal site. The prior Odyssey theme license no longer applies to this rebuild; keep your own copyright on content and media.
