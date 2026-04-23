import { redis } from './redis.js';

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function callAnthropic(systemPrompt, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Anthropic API error');

  const fullText = data.content?.[0]?.text || '';
  const match = fullText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (match ? match[1] : fullText).trim();
  try {
    return JSON.parse(raw);
  } catch(e) {
    // If it fails to parse, return raw for debugging or fallback
    return raw;
  }
}

export async function generateInsightBundle(topic, triggerSource, sourceCategory, brandVoice) {
  const topicFriendly = topic;
  const slug = slugify(topicFriendly);
  const promoSuffix = slug.substring(0, 4).toUpperCase();
  const promoCode = 'TREND' + promoSuffix;

  // 1. Generate Blog Post
  const blogSystem = `Generate a fast-reacting, campaign-style insight page about: ${topicFriendly}.
Target audience: Consumers seeing this news/trend.
Length: 400-800 words. Focus on how Dante Labs' Whole Genome Sequencing relates to this securely and medically.

CRITICAL: Do NOT return the complex condition_insight schema. Return a simple JSON with a standard stringified 'body_html' property containing clean HTML tags.

Return ONLY valid JSON:
{
  "title": "...",
  "slug": "${slug}",
  "meta_description": "...",
  "body_html": "<article HTML without main H1 title tag>",
  "hero_headline": "Short landing page H1 headline...",
  "hero_subhead": "1-2 sentence landing page subhead...",
  "image_prompt": "Editorial lifestyle photo...",
  "flags": []
}`;
  let blogData = await callAnthropic(`${brandVoice}\n\n${blogSystem}\n\nReturn ONLY valid JSON. No markdown code fences.`, `News/Trend Trigger: ${triggerSource}. Create insight page for ${topicFriendly}`);
  
  if (typeof blogData === 'string') {
    blogData = { title: topicFriendly, slug, body_html: blogData };
  } else {
    // Rescue raw condition_insight JSON if Claude hallucinates it into body_html
    let bHtml = blogData.body_html;
    if (typeof bHtml === 'string' && bHtml.trim().startsWith('```json')) bHtml = bHtml.replace(/```json/g, '').replace(/```/g, '').trim();
    if (typeof bHtml === 'string' && bHtml.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(bHtml);
        if (parsed.sections) bHtml = parsed;
      } catch (e) {}
    }
    if (typeof bHtml === 'object') {
      if (bHtml.sections) {
        blogData.body_html = bHtml.sections.map(s => `<h2>${s.heading || s.section_label || ''}</h2>` + (s.body_paragraphs || []).map(p => `<p>${p}</p>`).join('')).join('');
      } else {
        blogData.body_html = JSON.stringify(bHtml);
      }
    }
  }

  // 2. Generate Meta Ads
  const metaObjective = `generate awareness about WGS using social trend: ${topicFriendly}`;
  const metaUser = `Generate Meta (Facebook/Instagram) ad copy for Dante Labs.
Campaign objective: ${metaObjective}
Target audience: Adults impacted by the trend: ${topicFriendly}
Return ONLY a valid JSON object matching this schema:
{
  "variants": [
    {
      "variant_focus": "Benefit-led",
      "primary_text": "Main ad body copy shown in feed (max 125 chars)",
      "headline": "Bold headline under the image (max 40 chars)",
      "description": "Supporting line under headline (max 30 chars)",
      "cta_button": "Learn More"
    },
    ... (include Problem-aware and Social proof variants too)
  ],
  "image_prompt": "editorial lifestyle photo..."
}
Rules: No exclamation points. No diagnostic claims. No competitor mentions.`;
  const metaAdData = await callAnthropic(`${brandVoice}\n\nReturn ONLY valid JSON.`, metaUser);

  // 3. Generate Google Ads
  const googleUser = `Generate Google Search ad copy for Dante Labs for trend: ${topicFriendly}.
Return ONLY a valid JSON object matching:
{
  "variants": [
    {
      "variant_focus": "Benefit-led",
      "headline_1": "Max 30 chars", "headline_2": "Max 30 chars", "headline_3": "Max 30 chars",
      "description_1": "Max 90 chars", "description_2": "Max 90 chars"
    },
    ... (include Problem-aware and Social proof variants too)
  ]
}
Rules: strict char limits.`;
  const googleAdData = await callAnthropic(`${brandVoice}\n\nReturn ONLY valid JSON.`, googleUser);

  // 4. Generate Organic Social
  const socialUser = `Generate an organic social media bundle for Dante Labs discussing the trend: ${topicFriendly}.
Return ONLY a valid JSON object matching:
{
  "twitter": "Educational concise tweet (max 280 chars)",
  "linkedin": "Professional post aimed at adults concerned about hereditary risk.",
  "reddit": "Title and body for r/genetics or r/health. Must be conversational, educational, not a hard sell.",
  "facebook": "Engaging, conversational post for families.",
  "instagram": "Caption for the generated image, including 3-5 relevant exact hashtags."
}
Rules: No exclamation points. No diagnostic claims. No competitor mentions.`;
  const socialData = await callAnthropic(`${brandVoice}\n\nReturn ONLY valid JSON.`, socialUser);

  let imageUrl = null;
  const targetPrompt = "A highly cinematic, photorealistic 8k raw photo, shot on Sony A7R IV, natural light. It should be a real lifestyle scene (e.g. a family, a patient). NEVER depict hands in isolation. NEVER depict laboratory equipment. " + (metaAdData.image_prompt || blogData.image_prompt);
  if (process.env.FAL_API_KEY && targetPrompt) {
    try {
      const falRes = await fetch(`https://fal.run/fal-ai/flux/schnell`, {
        method: 'POST',
        headers: { Authorization: `Key ${process.env.FAL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: targetPrompt, image_size: 'landscape_16_9', num_images: 1 }),
      });
      if (falRes.ok) {
        const falData = await falRes.json();
        imageUrl = falData?.images?.[0]?.url || falData?.image?.url || null;
      }
    } catch(e) {}
  }

  const bundleId = `bundle-${Date.now()}`;
  const bundleItem = {
    id: bundleId,
    content_type: 'insight_bundle',
    source: sourceCategory, // 'spike' or 'social_ads'
    topic: `Trend Hub: ${topicFriendly}`,
    slug: slug,
    generated_at: new Date().toISOString(),
    status: 'review',
    trigger: triggerSource,
    image_url: imageUrl,
    content: {
      blog: {
        title: blogData.title || topicFriendly,
        slug: blogData.slug || slug,
        meta_description: blogData.meta_description || '',
        body_html: blogData.body_html || ''
      },
      meta_ads: metaAdData.variants ? metaAdData : { variants: [] },
      google_ads: googleAdData.variants ? googleAdData : { variants: [] },
      landing_page: {
        seo_title: `${topicFriendly} | Dante Labs`,
        seo_description: `Learn how whole genome sequencing can provide actionable health insights for ${topicFriendly}.`,
        canonical_url: `https://dantelabs.com/${slug}-campaign/`,
        promo_code: promoCode,
        offer_label: '10% off',
        hero_headline: blogData.hero_headline || topicFriendly,
        hero_subhead: blogData.hero_subhead || `Get a full genetic understanding of your health. Guide your prevention with precision regarding ${topicFriendly}.`
      },
      social_organic: socialData.twitter ? socialData : { twitter: '', linkedin: '', reddit: '', facebook: '', instagram: '' }
    },
    flags: blogData.flags || [],
    qa_status: 'READY_FOR_REVIEW'
  };

  await redis.set(`content:${bundleId}`, JSON.stringify(bundleItem));
  await redis.lpush('content:index', bundleId);

  // If Ahrefs spike, set the duplicate flag
  if (sourceCategory === 'spike') {
      await redis.set(`spike:published:${slug}`, 'true');
  }

  return bundleItem;
}
