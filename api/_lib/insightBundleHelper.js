import { redis } from './redis.js';

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toTitleCase(str) {
  return String(str || '').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
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
  let raw = fullText.trim();
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (match) {
    raw = match[1].trim();
  } else {
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
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

  const { SKILL_MAP, buildUserPrompt } = await import('./promptBuilder.js');
  const { loadSkill } = await import('./skills.js');

  async function getSystemPrompt(contentType) {
    const skillFile = SKILL_MAP[contentType];
    if (skillFile) {
      const primary = await loadSkill(skillFile);
      return `${primary}\n\n---\n\nBRAND VOICE REFERENCE:\n${brandVoice}`;
    }
    return `${brandVoice}\n\nReturn ONLY valid JSON. No markdown code fences. No explanation text before or after the JSON.`;
  }

  // 1. Generate Blog Post
  const blogSys = await getSystemPrompt('blog');
  const blogUser = buildUserPrompt({ content_type: 'blog', topic: topicFriendly, blog_type: 'Educational' });
  let blogData = await callAnthropic(blogSys, blogUser);
  
  if (typeof blogData === 'string') {
    blogData = { title: topicFriendly, slug, body_html: blogData };
  } else {
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
        blogData.body_html = bHtml.sections.map(s => `<h2>${s.heading || s.section_label || s.type || ''}</h2><p>${s.content || s.body || (s.body_paragraphs || []).join('</p><p>') || ''}</p>`).join('');
      } else if (bHtml.body_html) {
        blogData.body_html = bHtml.body_html;
      } else {
        blogData.body_html = bHtml.content || bHtml.text || JSON.stringify(bHtml);
      }
    }
    if (!blogData.body_html || typeof blogData.body_html !== 'string' || blogData.body_html.trim() === '' || blogData.body_html.startsWith('{')) {
        if (blogData.sections) {
            blogData.body_html = blogData.sections.map(s => `<h2>${s.heading || s.section_label || s.type || ''}</h2><p>${s.content || s.body || (s.body_paragraphs || []).join('</p><p>') || ''}</p>`).join('');
        } else {
            blogData.body_html = `<p>${JSON.stringify(blogData)}</p>`; // Ultimate fallback
        }
    }
  }

  // 2. Generate Meta Ads
  const metaSys = await getSystemPrompt('ad_copy');
  const metaUser = buildUserPrompt({ content_type: 'ad_copy', ad_platform: 'meta', campaign_objective: `generate awareness about WGS using social trend: ${topicFriendly}` });
  const metaAdData = await callAnthropic(metaSys, metaUser);
  if (metaAdData && metaAdData.variants) {
      metaAdData.variants = metaAdData.variants.map(v => {
          if (v.primary_text) v.primary_text = v.primary_text.substring(0, 125);
          if (v.headline) v.headline = v.headline.substring(0, 40);
          if (v.description) v.description = v.description.substring(0, 30);
          return v;
      });
  }

  // 3. Generate Google Ads
  const googleSys = await getSystemPrompt('ad_copy');
  const googleUser = buildUserPrompt({ content_type: 'ad_copy', ad_platform: 'google', campaign_objective: `generate awareness about WGS using social trend: ${topicFriendly}` });
  const googleAdData = await callAnthropic(googleSys, googleUser);
  if (googleAdData && googleAdData.variants) {
      googleAdData.variants = googleAdData.variants.map(v => {
          if (v.headline_1) v.headline_1 = v.headline_1.substring(0, 30);
          if (v.headline_2) v.headline_2 = v.headline_2.substring(0, 30);
          if (v.headline_3) v.headline_3 = v.headline_3.substring(0, 30);
          if (v.description_1) v.description_1 = v.description_1.substring(0, 90);
          if (v.description_2) v.description_2 = v.description_2.substring(0, 90);
          return v;
      });
  }

  // 4. Generate Organic Social individually for perfect consistency
  const socialData = {};
  for (const plat of ['twitter', 'linkedin', 'reddit', 'facebook', 'instagram']) {
    const sys = await getSystemPrompt(plat);
    const user = buildUserPrompt({ content_type: plat, topic: topicFriendly });
    const res = await callAnthropic(sys, user);
    let socialStr = typeof res === 'object' ? (res.text || res.tweet_text || res.body_html || res.raw_content || res.content) : res;
    if (typeof socialStr === 'object') socialStr = JSON.stringify(socialStr);
    socialData[plat] = socialStr || JSON.stringify(res);
    if (plat === 'reddit' && res && res.relevant_subreddits) {
        socialData.relevant_subreddits = res.relevant_subreddits;
    }
  }

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
    topic: triggerSource === 'manual_ui_trigger' ? topicFriendly : `Trend Hub: ${topicFriendly}`,
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
        hero_headline: blogData.hero_headline || toTitleCase(topicFriendly),
        hero_subhead: blogData.hero_subhead || `Get a full genetic understanding of your health. Guide your prevention with precision regarding ${topicFriendly}.`
      },
      social_organic: socialData.twitter ? socialData : { twitter: '', linkedin: '', reddit: '', facebook: '', instagram: '' }
    },
    flags: blogData.flags || [],
    qa_status: 'READY_FOR_REVIEW'
  };

  if (triggerSource === 'manual_ui_trigger') {
    bundleItem.source = 'manual';
  }

  await redis.set(`content:${bundleId}`, JSON.stringify(bundleItem));
  await redis.lpush('content:index', bundleId);

  // If Ahrefs spike, set the duplicate flag
  if (sourceCategory === 'spike') {
      await redis.set(`spike:published:${slug}`, 'true');
  }

  return bundleItem;
}
