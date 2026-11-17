/**
 * Cloudflare Pages Function: POST /api/contact
 *
 * Validates contact form submissions, then forwards JSON to an n8n webhook
 * (CONTACT_WEBHOOK_URL). n8n is expected to log to Airtable and email Jesse.
 */

type ContactPayload = {
  requestType?: string;
  name?: string;
  email?: string;
  showOrEvent?: string;
  link?: string;
  proposedDate?: string;
  audienceSize?: string;
  message?: string;
  pageUrl?: string;
  /** Honeypot: must stay empty. */
  companyWebsite?: string;
};

type Env = {
  CONTACT_WEBHOOK_URL?: string;
  CONTACT_WEBHOOK_SECRET?: string;
};

const ALLOWED_TYPES = new Set([
  'podcast',
  'speaking',
  'operator-stack',
  'press',
  'other',
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const contentType = context.request.headers.get('content-type') || '';
  const referer = context.request.headers.get('referer') || '';

  let data: ContactPayload = {};

  try {
    if (contentType.includes('application/json')) {
      data = (await context.request.json()) as ContactPayload;
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const form = await context.request.formData();
      data = {
        requestType: String(form.get('requestType') || ''),
        name: String(form.get('name') || ''),
        email: String(form.get('email') || ''),
        showOrEvent: String(form.get('showOrEvent') || ''),
        link: String(form.get('link') || ''),
        proposedDate: String(form.get('proposedDate') || ''),
        audienceSize: String(form.get('audienceSize') || ''),
        message: String(form.get('message') || ''),
        pageUrl: String(form.get('pageUrl') || ''),
        companyWebsite: String(form.get('companyWebsite') || ''),
      };
    } else {
      return json(
        {
          ok: false,
          error: 'Unsupported content type.',
          message: 'Something went wrong sending that form. Please try again.',
        },
        415,
      );
    }
  } catch {
    return json(
      {
        ok: false,
        error: 'Could not read the request body.',
        message: 'Something went wrong sending that form. Please try again.',
      },
      400,
    );
  }

  // Honeypot: bots fill this; humans should leave it blank.
  if (data.companyWebsite && data.companyWebsite.trim() !== '') {
    return json({
      ok: true,
      message: 'Thanks. Your message is on its way.',
    });
  }

  const requestType = (data.requestType || '').trim();
  const name = (data.name || '').trim();
  const email = (data.email || '').trim();
  const message = (data.message || '').trim();
  const showOrEvent = (data.showOrEvent || '').trim();
  const link = (data.link || '').trim();
  const proposedDate = (data.proposedDate || '').trim();
  const audienceSize = (data.audienceSize || '').trim();
  const pageUrl = (data.pageUrl || referer || '').trim();

  const errors: string[] = [];

  if (!ALLOWED_TYPES.has(requestType)) {
    errors.push('Choose a valid request type.');
  }
  if (name.length < 2) {
    errors.push('Name is required.');
  }
  if (!isEmail(email)) {
    errors.push('A valid email is required.');
  }
  if (message.length < 10) {
    errors.push('Message should be at least a couple of sentences.');
  }
  if (link && !/^https?:\/\//i.test(link)) {
    errors.push('Link should start with http:// or https://.');
  }

  if (errors.length) {
    return json(
      {
        ok: false,
        errors,
        message: errors.join(' '),
      },
      400,
    );
  }

  const webhookUrl = context.env.CONTACT_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.error('CONTACT_WEBHOOK_URL is not set');
    return json(
      {
        ok: false,
        error: 'Webhook not configured.',
        message:
          'The contact form is not fully connected yet. Please email Jesse directly, or try again later.',
      },
      503,
    );
  }

  const payload = {
    site: 'jessepoteet.com',
    requestType,
    name,
    email,
    showOrEvent,
    link,
    proposedDate,
    audienceSize,
    message,
    pageUrl,
    timestamp: new Date().toISOString(),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const secret = context.env.CONTACT_WEBHOOK_SECRET?.trim();
  if (secret) {
    headers['X-Webhook-Secret'] = secret;
  }

  try {
    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('n8n webhook failed', upstream.status, detail.slice(0, 500));
      return json(
        {
          ok: false,
          error: 'Upstream webhook error.',
          message:
            'Could not deliver that message just now. Please try again in a few minutes, or email Jesse directly.',
        },
        502,
      );
    }
  } catch (error) {
    console.error('n8n webhook request failed', error);
    return json(
      {
        ok: false,
        error: 'Upstream webhook unreachable.',
        message:
          'Could not reach the delivery service. Please try again in a few minutes, or email Jesse directly.',
      },
      502,
    );
  }

  return json({
    ok: true,
    message: 'Thanks. Your message is on its way. Jesse will follow up soon.',
  });
}
