import { redis } from './_lib/redis.js';
import { loadSkill } from './_lib/skills.js';
import { SKILL_MAP, MAX_TOKENS, buildUserPrompt } from './_lib/promptBuilder.js';

export const maxDuration = 300;

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Blog normaliser ────────────────────────────────────────────────────────

function normaliseBlog(parsed) {
  if (!parsed || parsed.title || parsed.body_html) return parsed;

  if (parsed.h1 && !parsed.title) parsed.title = parsed.h1;

  if (parsed.sections?.length) {
    const parts = [];
    for (const s of parsed.sections) {
      if (s.type === 'intro') {
        parts.push(...(s.content || '').split('\n\n').filter(Boolean).map(p => `<p>${p.trim()}</p>`));
      } else if (s.type === 'h2_section') {
        parts.push(`<h2>${s.heading}</h2>`);
        const body = s.content || '';
        const [mainText, callout] = body.split(/\n---\n/);
        parts.push(...(mainText || '').split('\n\n').filter(Boolean).map(p => `<p>${p.trim()}</p>`));
        if (callout) parts.push(`<blockquote>${callout.replace(/\*\*/g, '').trim()}</blockquote>`);
      }
    }
    if (parsed.closing?.content) {
      parts.push(...(parsed.closing.content || '').split('\n\n').filter(Boolean).map(p => `<p>${p.trim()}</p>`));
    }
    const ctaText = parsed.closing?.cta_text || parsed.cta?.text;
    const ctaUrl  = parsed.closing?.cta_url  || parsed.cta?.url || '/genome/';
    if (ctaText) parts.push(`<p><a href="${ctaUrl}">${ctaText}</a></p>`);
    parsed.body_html = parts.join('\n');
  }

  return parsed;
}

// ── Clean email body_html ──────────────────────────────────────────────────

function cleanEmailBody(html) {
  if (!html) return '';
  // Remove literal \n escape sequences that leak through JSON stringification
  return html
    .replace(/\\n/g, '')
    .replace(/\\t/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Auto image generation ──────────────────────────────────────────────────

async function generateImageForItem(item, customAspectRatio) {
  if (!process.env.FAL_API_KEY || !item.image_prompt) return item;

  let model = item.content_type === 'landing_page' ? 'fal-ai/flux-pro' : 'fal-ai/flux/schnell';
  
  let isVideo = false;
  if (item.content_type === 'media' && item.is_animated) {
    model = 'fal-ai/kling-video/v1/standard/text-to-video';
    isVideo = true;
  }

  // Mapping from our frontend 16:9 format to fal.run parameter
  const sizeMap = {
    '16:9': 'landscape_16_9',
    '1:1': 'square_hd',
    '4:5': 'portrait_4_5',
    '9:16': 'portrait_16_9'
  };
  const targetSize = sizeMap[customAspectRatio] || 'landscape_16_9';

  try {
    const urlPrefix = isVideo ? 'https://queue.fal.run/' : 'https://fal.run/';
    const falRes = await fetch(`${urlPrefix}${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${process.env.FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item.is_animated ? { prompt: item.image_prompt, aspect_ratio: targetSize.includes('16_9') ? '16:9' : targetSize.includes('9_16') ? '9:16' : '1:1' } : {
        prompt: item.image_prompt,
        image_size: targetSize,
        num_images: 1,
        enable_safety_checker: false,
        image_url: (item.content_type === 'ad_copy' || item.content_type === 'media') ? 'https://dante-content-factory.vercel.app/packaging.png' : undefined
      }),
    });

    if (!falRes.ok) return item;

    const falData = await falRes.json();
    
    // If it's a queue response, save the request_id and URLs and return
    if (isVideo && falData.request_id) {
      item.fal_request_id = falData.request_id;
      item.fal_status_url = falData.status_url;
      item.fal_response_url = falData.response_url;
      return item;
    }

    const media_url = falData?.video?.url || falData?.images?.[0]?.url || falData?.image?.url || null;
    if (media_url) {
      if (item.is_animated) item.video_url = media_url;
      else item.image_url = media_url;
    }
  } catch {
    // fail silently
  }

  return item;
}

// ── Main handler ───────────────────────────────────────────────────────────

import { verifyAuth } from './_lib/auth.js';

export default async function handler(req, res) {
    try {
        await verifyAuth(req);
    } catch (e) {
        return res.status(403).json({ error: 'Forbidden', message: e.message });
    }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { content_type, topic, format, email_type, ad_platform, campaign_objective, product, target_audience, source, aspect_ratio, is_animated } = req.body;
  if (!content_type || !topic) return res.status(400).json({ error: 'Missing content_type or topic' });

  const validTypes = ['landing_page', 'condition_page', 'blog', 'twitter', 'email', 'ad_copy', 'insight_bundle', 'facebook', 'linkedin', 'instagram', 'reddit', 'media'];
  if (!validTypes.includes(content_type)) return res.status(400).json({ error: `Unknown content_type: ${content_type}` });

  // Load skill(s)
  let systemPrompt = '';
  const skillFile = SKILL_MAP[content_type];

  try {
    const brandVoice = await loadSkill(BRAND_VOICE_SKILL, true);
    if (skillFile) {
      const primary = await loadSkill(skillFile);
      systemPrompt = `${primary}\n\n---\n\nBRAND VOICE REFERENCE:\n${brandVoice}`;
    } else {
      systemPrompt = `${brandVoice}\n\nReturn ONLY valid JSON. No markdown code fences. No explanation text before or after the JSON.`;
    }
  } catch (e) {
    console.warn('Skill load failed, using fallback:', e.message);
    systemPrompt = `You are a content writer for Dante Labs, a clinical whole genome sequencing company. Generate high-quality, accurate content. Return valid JSON only. No exclamation points. No diagnostic claims.`;
  }

  // Inject learned feedback rules into the prompt
  try {
    const { redis } = await import('./_lib/redis.js');
    const rulesList = await redis.lrange('content:global_rules', 0, -1);
    if (rulesList && rulesList.length > 0) {
      systemPrompt += `\n\n--- HUMAN FEEDBACK RULES ---\n*CRITICAL INSTRUCTIONS LEARNED FROM PAST HUMAN EDITS*:\n` + rulesList.map((r, i) => `${i+1}. ${r}`).join('\n');
    }
  } catch(e) {
    // fail silently if redis fails
  }

  // Handle Insight Bundle routing
    // Strict requirement for character counts
    systemPrompt += `\n\nSTRICT REQUIREMENT: You must ruthlessly obey any character or word count limits specified in the prompt for this platform or format. Do not exceed the limits under any circumstances.`;

  if (content_type === 'insight_bundle') {
    const { generateInsightBundle } = await import('./_lib/insightBundleHelper.js');
    const brandVoiceOnly = systemPrompt; // The full system prompt with learned rules
    try {
      const item = await generateInsightBundle(topic, 'manual_ui_trigger', 'spike', brandVoiceOnly);
      return res.status(200).json({ item });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: MAX_TOKENS[content_type] || 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: buildUserPrompt(req.body) }],
    }),
  });

  const anthropicData = await anthropicRes.json();
  if (!anthropicRes.ok) {
    return res.status(500).json({ error: anthropicData.error?.message || 'Anthropic API error' });
  }

  const fullText = anthropicData.content?.[0]?.text || '';

  // Extract JSON — try code fence first, then raw
  const codeBlockMatch = fullText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (codeBlockMatch ? codeBlockMatch[1] : fullText).trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);

    if (content_type === 'twitter') {
      if (parsed.tweet_text && !parsed.text) parsed.text = parsed.tweet_text;
      if (parsed.tweet && !parsed.text) parsed.text = parsed.tweet;
      if (!parsed.text && typeof parsed === 'object') {
        const textKey = Object.keys(parsed).find(k => k.includes('text') || k.includes('tweet') || k === 'content' || k === 'body');
        if (textKey) parsed.text = parsed[textKey];
      }
    }
    if (content_type === 'blog') {
      parsed = normaliseBlog(parsed);
    }
    if (content_type === 'webpage' && body.webpage_type === 'blog') {
      parsed.body_html = cleanEmailBody(parsed.body_html);
    }

    if (content_type === 'ad_copy' && parsed.variants && Array.isArray(parsed.variants)) {
      parsed.variants = parsed.variants.map(v => {
        if (parsed.platform === 'meta' || ad_platform === 'meta') {
           if (v.primary_text) v.primary_text = v.primary_text.substring(0, 125);
           if (v.headline) v.headline = v.headline.substring(0, 40);
           if (v.description) v.description = v.description.substring(0, 30);
        } else if (parsed.platform === 'google' || ad_platform === 'google') {
           if (v.headline_1) v.headline_1 = v.headline_1.substring(0, 30);
           if (v.headline_2) v.headline_2 = v.headline_2.substring(0, 30);
           if (v.headline_3) v.headline_3 = v.headline_3.substring(0, 30);
           if (v.description_1) v.description_1 = v.description_1.substring(0, 90);
           if (v.description_2) v.description_2 = v.description_2.substring(0, 90);
        }
        return v;
      });
    }

    if (content_type === 'email' && parsed.body_html) {
      parsed.body_html = cleanEmailBody(parsed.body_html);
    }
  } catch {
    if (content_type === 'twitter') {
      parsed = { text: raw, format: format || 'educational', image_prompt: '' };
    } else if (content_type === 'email') {
      parsed = { subject: '', preview_text: '', headline: '', body_html: `<p>${raw}</p>`, cta_text: 'Learn more', cta_url: 'https://dantelabs.com/genome/' };
    } else if (content_type === 'ad_copy') {
      parsed = { platform: ad_platform || 'google', campaign_objective: campaign_objective || topic, variants: [] };
    } else {
      parsed = { raw_content: raw };
    }
  }

  const id   = `content-${Date.now()}`;
  const slug = slugify(topic);

  if (content_type === 'reddit') {
    try {
      const redditRes = await fetch(`https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(topic)}&limit=3`);
      if (redditRes.ok) {
        const rData = await redditRes.json();
        parsed.relevant_subreddits = rData?.data?.children?.map(c => c.data.display_name_prefixed) || [];
      }
    } catch(e) {
      console.warn("Reddit API search failed", e);
    }
  }

  const item = {
    id,
    content_type,
    source:        source || 'manual',
    topic,
    slug,
    format:        format || null,
    email_type:    email_type || null,
    ad_platform:   ad_platform || null,
    generated_at:  new Date().toISOString(),
    status:        'review',
    published_at:  null,
    scheduled_at:  null,
    trigger:       null,
    content:       { ...parsed },
    image_prompt:  parsed.image_prompt || '',
    image_url:     null,
    flags:         parsed.flags || [],
    qa_status:     parsed.qa_status || 'REQUIRES_REVISION',
  };

  delete item.content.flags;
  delete item.content.qa_status;
  delete item.content.image_prompt;

  // Auto-generate image for Twitter, blog, landing_page, Meta ads, and Standalone Media
  const autoImageTypes = ['twitter', 'blog', 'landing_page', 'media', 'facebook', 'instagram', 'linkedin'];
  const isMetaAd = content_type === 'ad_copy' && ad_platform === 'meta';
  
  if (content_type === 'media') {
    item.is_animated = is_animated || parsed.is_animated;
  }

  if ((autoImageTypes.includes(content_type) || isMetaAd) && item.image_prompt) {
    await generateImageForItem(item, aspect_ratio);
  }

  await redis.set(`content:${item.id}`, JSON.stringify(item));
  await redis.lpush('content:index', item.id);

  return res.status(200).json({ item });
}
