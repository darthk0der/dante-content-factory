import { redis } from './_lib/redis.js';
import { buildConditionPage } from './_lib/conditionTemplate.js';

const OWNER = process.env.GITHUB_REPO_OWNER || 'dante-labs';
const REPO  = process.env.GITHUB_REPO_NAME  || 'dante-labs-website';

// ── GitHub helpers ────────────────────────────────────────────────────────────

async function githubGetFile(path) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${path} failed: ${res.status}`);
  return res.json();
}

async function githubPutFile(path, content, message, existingSha) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const body = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
  };
  if (existingSha) body.sha = existingSha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub PUT ${path} failed: ${res.status} — ${err}`);
  }
  return res.json();
}

// ── Twitter OAuth 1.0a ────────────────────────────────────────────────────────

function pct(str) {
  return encodeURIComponent(String(str))
    .replace(/!/g,'%21').replace(/'/g,'%27')
    .replace(/\(/g,'%28').replace(/\)/g,'%29').replace(/\*/g,'%2A');
}

async function makeOAuthHeader(method, url, extraParams = {}) {
  const oauth = {
    oauth_consumer_key:     process.env.TWITTER_API_KEY,
    oauth_nonce:            Math.random().toString(36).slice(2) + Date.now(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            process.env.TWITTER_ACCESS_TOKEN,
    oauth_version:          '1.0',
  };

  const allParams = { ...oauth, ...extraParams };
  const paramStr  = Object.keys(allParams).sort()
    .map((k) => `${pct(k)}=${pct(allParams[k])}`).join('&');
  const sigBase   = `${method}&${pct(url)}&${pct(paramStr)}`;
  const sigKey    = `${pct(process.env.TWITTER_API_SECRET)}&${pct(process.env.TWITTER_ACCESS_TOKEN_SECRET)}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(sigKey), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const sig       = await crypto.subtle.sign('HMAC', key, enc.encode(sigBase));
  const signature = Buffer.from(sig).toString('base64');

  return 'OAuth ' + Object.entries({ ...oauth, oauth_signature: signature })
    .map(([k, v]) => `${pct(k)}="${pct(v)}"`).join(', ');
}

// Upload an image from a URL to Twitter v1.1 media upload; returns media_id_string
async function twitterUploadMedia(imageUrl) {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
  const buf = await imgRes.arrayBuffer();
  const mediaData = Buffer.from(buf).toString('base64');
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

  const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
  const authHeader = await makeOAuthHeader('POST', uploadUrl);

  // Send as multipart form
  const form = new FormData();
  form.append('media_data', mediaData);
  form.append('media_category', 'tweet_image');

  const uRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: authHeader },
    body: form,
  });
  if (!uRes.ok) {
    const err = await uRes.text();
    throw new Error(`Twitter media upload failed ${uRes.status}: ${err}`);
  }
  const uData = await uRes.json();
  return uData.media_id_string;
}

async function twitterPost(text, imageUrl) {
  if (!process.env.TWITTER_API_KEY) {
    return { pending: true, message: 'Twitter not configured' };
  }

  let mediaId;
  if (imageUrl) {
    try {
      mediaId = await twitterUploadMedia(imageUrl);
    } catch (e) {
      console.warn('Media upload failed, posting text-only:', e.message);
    }
  }

  const method = 'POST';
  const url    = 'https://api.twitter.com/2/tweets';
  const authHeader = await makeOAuthHeader(method, url);

  const body = { text };
  if (mediaId) body.media = { media_ids: [mediaId] };

  const tRes = await fetch(url, {
    method,
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!tRes.ok) {
    const err = await tRes.text();
    throw new Error(`Twitter API error ${tRes.status}: ${err}`);
  }
  const data = await tRes.json();
  return {
    tweet_id:  data.data?.id,
    tweet_url: `https://x.com/DanteLabs/status/${data.data?.id}`,
  };
}

// ── Blog HTML builder ─────────────────────────────────────────────────────────

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildBlogHtml(item) {
  const c   = item.content;
  const slug = item.slug;
  const canonical = `https://dantelabs.com/blog/${slug}/`;
  const imgTag = item.image_url
    ? `<img src="${item.image_url}" alt="${esc(c.hero_image_alt || c.title)}" style="width:100%;height:320px;object-fit:cover;border-radius:8px;margin-bottom:32px"/>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(c.title)} | Dante Labs</title>
  <meta name="description" content="${esc(c.meta_description)}"/>
  <link rel="canonical" href="${canonical}"/>
  <meta property="og:title" content="${esc(c.title)}"/>
  <meta property="og:description" content="${esc(c.meta_description)}"/>
  <meta property="og:url" content="${canonical}"/>
  <meta property="og:type" content="article"/>
  ${item.image_url ? `<meta property="og:image" content="${item.image_url}"/>` : ''}
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${esc(c.title)}"/>
  <meta name="twitter:description" content="${esc(c.meta_description)}"/>
  <link rel="stylesheet" href="/base.css"/>
  <link rel="stylesheet" href="/blog.css"/>
</head>
<body>
  <script src="/common.js" defer></script>
  <script src="/currency-switcher.js" defer></script>
  <main style="max-width:720px;margin:60px auto;padding:0 24px">
    ${imgTag}
    <article>
      <h1 style="font-size:clamp(24px,4vw,40px);line-height:1.2;margin-bottom:16px">${esc(c.title)}</h1>
      <p style="color:#888;font-size:14px;margin-bottom:40px">${new Date(item.generated_at).toLocaleDateString('en-GB',{year:'numeric',month:'long',day:'numeric'})}</p>
      ${c.body_html || ''}
    </article>
  </main>
</body>
</html>`;
}

// ── Shared publish logic (used by cron-publish too) ───────────────────────────

export async function publishItem(item, redisClient) {
  const r = redisClient || redis;

  if (item.status !== 'approved' && item.status !== 'scheduled') {
    throw new Error('Item must be approved before publishing');
  }
  const unresolvedFlags = (item.flags || []).filter((f) => !f.resolved);
  if (unresolvedFlags.length > 0) {
    throw new Error(`Cannot publish: ${unresolvedFlags.length} unresolved QA flag(s)`);
  }

  let result = {};

  if (item.content_type === 'twitter') {
    result = await twitterPost(item.content.text, item.image_url || null);

  } else if (item.content_type === 'blog') {
    const html = buildBlogHtml(item);
    const path = `public/blog/${item.slug}/index.html`;
    const existing = await githubGetFile(path);
    await githubPutFile(path, html, `content: add blog post — ${item.content.title}`, existing?.sha);
    result = { live_url: `https://dantelabs.com/blog/${item.slug}/` };

  } else if (item.content_type === 'landing_page') {
    const html = await buildConditionPage(item);
    const condSlug = item.content.condition_slug || item.slug;
    const path = `public/conditions/${condSlug}/index.html`;
    const existing = await githubGetFile(path);
    await githubPutFile(path, html, `content: add condition page — ${item.content.condition_name || item.topic}`, existing?.sha);
    result = { live_url: `https://dantelabs.com/conditions/${condSlug}/` };

  } else if (item.content_type === 'insight') {
    const html = buildBlogHtml(item); // We reuse the blog layout for insights
    const insightSlug = item.slug;
    const path = `public/insights/${insightSlug}/index.html`;
    const existing = await githubGetFile(path);
    await githubPutFile(path, html, `content: add reactive insight — ${item.content.title || item.topic}`, existing?.sha);
    result = { live_url: `https://dantelabs.com/insights/${insightSlug}/` };
  }

  item.status       = 'published';
  item.published_at = new Date().toISOString();
  Object.assign(item, result);
  await r.set(`content:${item.id}`, JSON.stringify(item));

  return result;
}

// ── HTTP handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const raw = await redis.get(`content:${id}`);
  if (!raw) return res.status(404).json({ error: 'Item not found' });
  const item = typeof raw === 'string' ? JSON.parse(raw) : raw;

  try {
    const result = await publishItem(item, redis);
    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}
