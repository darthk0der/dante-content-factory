import { redis } from './_lib/redis.js';
import { buildConditionPage, buildCampaignLandingPageHtml } from './_lib/conditionTemplate.js';

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildBlogPreview(item) {
  const c = item.content;
  const slug = item.slug;
  const canonical = `https://dantelabs.com/blog/${slug}/`;
  const imgTag = item.image_url
    ? `<img src="${item.image_url}" alt="${esc(c.hero_image_alt || c.title)}" style="width:100%;height:320px;object-fit:cover;border-radius:8px;margin-bottom:32px"/>`
    : '';

  let finalBodyHtml = c.body_html || '<p>No content yet.</p>';
  try {
    let bHtml = finalBodyHtml;
    if (bHtml.trim().startsWith('```json')) bHtml = bHtml.replace(/```json/g, '').replace(/```/g, '').trim();
    if (bHtml.trim().startsWith('{')) {
      const parsed = JSON.parse(bHtml);
      if (parsed.sections) {
        finalBodyHtml = parsed.sections.map(s => `<h2>${s.heading || s.section_label || ''}</h2>` + (s.body_paragraphs || []).map(p => `<p>${p}</p>`).join('')).join('');
      } else {
         finalBodyHtml = JSON.stringify(parsed, null, 2).replace(/\n/g, '<br/>');
      }
    }
  } catch (e) {}

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(c.title)} | Dante Labs</title>
  <meta name="description" content="${esc(c.meta_description)}"/>
  <link rel="canonical" href="${canonical}"/>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; background: #f4f3f1; color: #0a0e17; }
    main { max-width: 720px; margin: 60px auto; padding: 0 24px; }
    h1 { font-size: clamp(24px, 4vw, 40px); line-height: 1.2; margin-bottom: 16px; }
    h2 { font-size: 22px; margin: 32px 0 12px; }
    p { line-height: 1.7; margin-bottom: 16px; color: #444; }
    blockquote { border-left: 3px solid #593159; padding-left: 16px; margin: 24px 0; color: #444; font-style: italic; }
    a { color: #593159; }
    .meta { color: #888; font-size: 14px; margin-bottom: 40px; }
    .badge { display: inline-block; background: #593159; color: #fff; font-size: 11px; padding: 2px 10px; border-radius: 4px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <main>
    <span class="badge">PREVIEW</span>
    ${imgTag}
    <article>
      <p class="meta">${new Date(item.generated_at).toLocaleDateString('en-GB',{year:'numeric',month:'long',day:'numeric'})}</p>
      ${finalBodyHtml}
    </article>
  </main>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    const raw = await redis.get(`content:${id}`);
    if (!raw) return res.status(404).send('Not found');
    const item = typeof raw === 'string' ? JSON.parse(raw) : raw;

    let html = '';
    const view = req.query.view; // e.g. 'blog' or 'landing_page'

    if (item.content_type === 'insight_bundle' || item.content_type === 'social_campaign') {
      if (view === 'landing_page') {
        const lpItem = { ...item, content: { ...item.content.landing_page } };
        if (!lpItem.content.hero_headline) lpItem.content.hero_headline = item.topic.replace(/^Trend Hub: /, '');
        if (!lpItem.content.hero_subhead) lpItem.content.hero_subhead = `Get a full genetic understanding of your health. Guide your prevention with precision regarding ${lpItem.content.hero_headline}.`;
        html = await buildCampaignLandingPageHtml(lpItem);
      } else {
        // default to blog view
        const blogItem = { ...item, content: item.content.blog };
        html = buildBlogPreview(blogItem);
      }
    } else if (item.content_type === 'landing_page') {
      html = await buildConditionPage(item);
    } else if (item.content_type === 'campaign_landing_page') {
      html = await buildCampaignLandingPageHtml(item);
    } else if (item.content_type === 'blog' || item.content_type === 'insight') {
      html = buildBlogPreview(item);
    } else {
      html = '<p>Preview unavailable for this type.</p>';
    }

    if (item.content_type === 'landing_page' || item.content_type === 'campaign_landing_page' || (item.content_type === 'insight_bundle' && view === 'landing_page')) {
      // Inject base href so relative CSS/images load from the live site
      html = html.replace('<head>', '<head>\n<base href="https://dantelabs.com/" />');
      // Inject preview banner into the HTML
      html = html.replace('<body', `<body data-preview="true"`);
      html = html.replace(/<body[^>]*>/, (match) => `${match}\n<div style="position:fixed;top:0;left:0;right:0;background:#593159;color:#fff;text-align:center;font-size:12px;padding:6px;z-index:9999;font-family:system-ui">CONTENT FACTORY PREVIEW — NOT PUBLISHED</div><div style="height:30px"></div>`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
