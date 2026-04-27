import { redis } from './_lib/redis.js';
import { loadSkill } from './_lib/skills.js';

export const maxDuration = 300;

const SKILL_MAP = {
  twitter:        'Twitter_Post_SKILL.md',
  facebook:       'Facebook_Post_SKILL.md',
  linkedin:       'LinkedIn_Post_SKILL.md',
  instagram:      'Instagram_Post_SKILL.md',
  reddit:         'Reddit_Post_SKILL.md',
  blog:           'Blog_Post_SKILL.md',
  landing_page:   'Landing_Page_Sections_SKILL.md',
  condition_page: 'Condition_Page_SKILL.md',
  email:          'Email_SKILL.md',
};

const BRAND_VOICE_SKILL = 'Documentation/02_Brand/Brand_Voice_SKILL.md';

const MAX_TOKENS = {
  twitter:      1500,
  blog:         8000,
  landing_page: 8000,
  email:        4000,
  ad_copy:      3000,
};

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const PHOTO_PROMPT = "The image_prompt field MUST describe a highly cinematic, photorealistic 8k raw photo, shot on Sony A7R IV, natural light. It should be a real lifestyle scene (e.g. a family, a patient, a doctor). NEVER depict hands in isolation. NEVER depict laboratory equipment or test tubes. Must look like high-end editorial photography.";

// ── Prompt builders ────────────────────────────────────────────────────────

function buildUserPrompt(body) {
  const { content_type, topic, format, email_type, ad_platform, campaign_objective, product, target_audience, goal, blog_type, patient_story } = body;

  const targetStr = target_audience ? `\nTarget Audience: ${target_audience}` : '';
  const goalStr = goal ? `\nGoal: ${goal}` : '';
  const globalContext = targetStr || goalStr ? `\n---CONTEXT---${targetStr}${goalStr}\n-------------\n` : '';

  if (content_type === 'twitter') {
    return `Generate a Twitter/X post for Dante Labs about: ${topic}
Format: ${format || 'educational'}${globalContext}

${PHOTO_PROMPT}`;
  }

  if (content_type === 'blog') {
    return `Generate a blog post for Dante Labs about: ${topic}
Type of post: ${blog_type || 'Educational'}${blog_type === 'patient_story' ? `\nPatient Story Focus: ${patient_story || 'None'}` : ''}${globalContext}

Important: The hero_image_alt field must be a descriptive alt text for the hero image. Do not leave it empty.
${PHOTO_PROMPT}`;
  }

  if (content_type === 'landing_page') {
    return `Generate a promotional conversion landing page for Dante Labs for: ${topic}${globalContext}

${PHOTO_PROMPT}`;
  }

  if (content_type === 'condition_page') {
    return `Generate a comprehensive medical condition page for Dante Labs for: ${topic}${globalContext}

${PHOTO_PROMPT}`;
  }

  if (content_type === 'email') {
    const typeLabel = { newsletter: 'Newsletter', product_launch: 'Product Launch', re_engagement: 'Re-engagement', transactional: 'Transactional', informational: 'Informational' }[email_type] || email_type;
    return `Generate a Dante Labs ${typeLabel} email campaign.
Key message: ${topic}${globalContext}
${email_type === 'transactional' ? 'CRITICAL: This is a transactional/promotional email. It MUST be extremely short, punchy, and direct (max 2 short paragraphs).' : ''}

Return ONLY a valid JSON object — no markdown, no code fences, no explanation. Use this exact schema:
{
  "subject": "A compelling subject line (max 60 chars)",
  "preview_text": "Preview text shown in inbox (max 90 chars)",
  "headline": "Main email headline",
  "body_html": "<p>First paragraph of email body.</p><p>Second paragraph.</p><p>Third paragraph.</p>",
  "cta_text": "CTA button label",
  "cta_url": "https://dantelabs.com/genome/"
}

Rules:
- body_html must be real HTML — use <p>, <strong>, <ul>, <li> tags. No raw newlines (\\n). No placeholder text.
- subject and preview_text must be actual compelling copy, not empty.
- No exclamation points. No diagnostic claims. No competitor mentions.
- Write from Dante Labs brand voice: clear, scientific, empathetic.`;
  }

  if (content_type === 'ad_copy') {
    if (ad_platform === 'meta') {
      return `Generate Meta (Facebook/Instagram) ad copy for Dante Labs.
Campaign objective: ${campaign_objective || topic}
Product: ${product || 'WGS'}
Target audience: ${target_audience || 'adults concerned about hereditary health risk'}

Meta ads have a different format from Google. Return ONLY a valid JSON object — no markdown, no code fences.
Use this exact schema:
{
  "platform": "meta",
  "campaign_objective": "${campaign_objective || topic}",
  "variants": [
    {
      "variant_focus": "Benefit-led",
      "primary_text": "Main ad body copy shown in feed (max 125 chars). Hook the reader in the first line.",
      "headline": "Bold headline under the image (max 40 chars)",
      "description": "Supporting line under headline (max 30 chars)",
      "cta_button": "Learn More"
    },
    {
      "variant_focus": "Problem-aware",
      "primary_text": "Opens with the problem/pain point the audience feels (max 125 chars)",
      "headline": "Bold headline under the image (max 40 chars)",
      "description": "Supporting line under headline (max 30 chars)",
      "cta_button": "Get Started"
    },
    {
      "variant_focus": "Social proof",
      "primary_text": "Opens with credibility/proof point (max 125 chars)",
      "headline": "Bold headline under the image (max 40 chars)",
      "description": "Supporting line under headline (max 30 chars)",
      "cta_button": "Find Out More"
    }
  ]
}

Rules: 
- Meta Ad Primary Text MUST NEVER exceed 125 characters. 
- Meta Ad Headlines MUST NEVER exceed 40 characters. Ensure all text falls strictly under these limits.
- No exclamation points. No diagnostic claims. No competitor mentions. Each variant must have a clearly different angle.
Also include a top-level "image_prompt" field describing the ideal ad image: ${product === 'WGS' ? 'A photorealistic lifestyle photo of a person holding or looking at the physical Dante Labs WGS testing kit box in a nice home setting.' : 'A lifestyle editorial photo of a real person or family relevant to the campaign objective.'} ${PHOTO_PROMPT}`;
    }

    // Google ads
    return `Generate Google Search ad copy for Dante Labs.
Campaign objective: ${campaign_objective || topic}
Product: ${product || 'WGS'}
Target audience: ${target_audience || 'adults with family history of genetic conditions'}

Return ONLY a valid JSON object — no markdown, no code fences.
Use this exact schema:
{
  "platform": "google",
  "campaign_objective": "${campaign_objective || topic}",
  "variants": [
    {
      "variant_focus": "Benefit-led",
      "headline_1": "Max 30 chars",
      "headline_2": "Max 30 chars",
      "headline_3": "Max 30 chars",
      "description_1": "Max 90 chars — benefit angle",
      "description_2": "Max 90 chars — supporting detail"
    },
    {
      "variant_focus": "Problem-aware",
      "headline_1": "Max 30 chars",
      "headline_2": "Max 30 chars",
      "headline_3": "Max 30 chars",
      "description_1": "Max 90 chars — problem/question angle",
      "description_2": "Max 90 chars — solution detail"
    },
    {
      "variant_focus": "Social proof",
      "headline_1": "Max 30 chars",
      "headline_2": "Max 30 chars",
      "headline_3": "Max 30 chars",
      "description_1": "Max 90 chars — credibility/proof angle",
      "description_2": "Max 90 chars — CTA detail"
    }
  ]
}

Rules: Enforce character limits strictly. No exclamation points. No diagnostic claims. Each variant must have a clearly different angle and approach.`;
  }

  if (['facebook', 'linkedin', 'instagram', 'reddit'].includes(content_type)) {
    let platformSpecifics = '';
    if (content_type === 'reddit') {
       platformSpecifics = '\nCRITICAL: In your JSON output, beside the POST content, you MUST include an array called "relevant_subreddits" containing a list of 3 deeply researched, specific subreddits (e.g. r/genetics, r/mthfr) where this post would organically fit perfectly without looking like spam.';
    }
    return `Generate a ${content_type.charAt(0).toUpperCase() + content_type.slice(1)} post for Dante Labs.
Topic: ${topic}${globalContext}${platformSpecifics}

Return ONLY a valid JSON object:
{
  "text": "The highly engaging copy tailored exactly to ${content_type}'s native audience behavior and algorithms",
  "image_prompt": "A prompt for a lifestyle image if needed, else empty"${content_type === 'reddit' ? ',\n  "relevant_subreddits": ["r/Example"]' : ''}
}`;
  }

  if (content_type === 'media') {
     return `You are a prompt engineering specialist. I want to generate a standalone image or video based on this brief: "${topic}".
Image Style requested: ${body.media_type || 'photographic'}
Is it going to be animated?: ${body.is_animated ? 'Yes' : 'No'}
Target Audience context: ${target_audience || 'None provided'}
Goal context: ${goal || 'None provided'}

Expand this into a highly cinematic, photorealistic 8k raw prompt (if photographic), or a sleek editorial design (if pattern/logo).
Return ONLY a valid JSON object:
{
  "image_prompt": "Your incredibly detailed image prompt here",
  "media_type": "${body.media_type}",
  "is_animated": ${body.is_animated}
}`;
  }

  return `Generate content about: ${topic}${globalContext}`;
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

export default async function handler(req, res) {
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

    if (content_type === 'twitter' && parsed.tweet_text && !parsed.text) {
      parsed.text = parsed.tweet_text;
    }
    if (content_type === 'blog') {
      parsed = normaliseBlog(parsed);
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
  const autoImageTypes = ['twitter', 'blog', 'landing_page', 'media'];
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
