import { redis } from './_lib/redis.js';
import { loadSkill } from './_lib/skills.js';

const BRAND_VOICE_SKILL = 'Documentation/02_Brand/Brand_Voice_SKILL.md';

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function callAnthropicForAd(topic, platform, brandVoice) {
  const objective = `generate awareness about WGS using social trend: ${topic}`;
  
  let userPrompt = '';
  if (platform === 'meta') {
    userPrompt = `Generate Meta (Facebook/Instagram) ad copy for Dante Labs.
Campaign objective: ${objective}
Product: WGS
Target audience: Adults following or impacted by the trend: ${topic}

Meta ads have a different format from Google. Return ONLY a valid JSON object — no markdown, no code fences.
Use this exact schema:
{
  "platform": "meta",
  "campaign_objective": "${objective}",
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

Rules: No exclamation points. No diagnostic claims. No competitor mentions. Connect the trend to WGS seamlessly. Each variant must have a clearly different angle.

Also include a top-level "image_prompt" field describing the ideal ad image: a lifestyle editorial photo of a real person or family relevant to the campaign objective. Warm, natural setting. No hands in isolation, no lab equipment, no text overlays.`;
  } else {
    userPrompt = `Generate Google Search ad copy for Dante Labs.
Campaign objective: ${objective}
Product: WGS
Target audience: Adults searching for the trend: ${topic}

Return ONLY a valid JSON object — no markdown, no code fences.
Use this exact schema:
{
  "platform": "google",
  "campaign_objective": "${objective}",
  "variants": [
    {
      "variant_focus": "Benefit-led",
      "headline_1": "Max 30 chars",
      "headline_2": "Max 30 chars",
      "headline_3": "Max 30 chars",
      "description_1": "Max 90 chars",
      "description_2": "Max 90 chars"
    },
    {
      "variant_focus": "Problem-aware",
      "headline_1": "Max 30 chars",
      "headline_2": "Max 30 chars",
      "headline_3": "Max 30 chars",
      "description_1": "Max 90 chars",
      "description_2": "Max 90 chars"
    },
    {
      "variant_focus": "Social proof",
      "headline_1": "Max 30 chars",
      "headline_2": "Max 30 chars",
      "headline_3": "Max 30 chars",
      "description_1": "Max 90 chars",
      "description_2": "Max 90 chars"
    }
  ]
}

Rules: Enforce character limits strictly. No exclamation points. No diagnostic claims. No competitor mentions. Connect the trend to WGS seamlessly.`;
  }

  const systemPrompt = `${brandVoice}\n\nReturn ONLY valid JSON. No markdown code fences. No explanation text before or after the JSON.`;

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
  return JSON.parse(raw);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ARRCC_URL || !process.env.ARRCC_API_SECRET) {
    return res.status(500).json({ error: 'ARRCC configuration missing' });
  }

  try {
    const brandVoice = await loadSkill(BRAND_VOICE_SKILL, true).catch(() => '');

    // 1. Fetch trends from ARRCC
    const arrccRes = await fetch(`${process.env.ARRCC_URL}/api/social-trending`, {
      headers: { 'Authorization': `Bearer ${process.env.ARRCC_API_SECRET}` }
    });
    
    if (!arrccRes.ok) {
      throw new Error(`Failed to fetch ARRCC trends: ${arrccRes.status}`);
    }

    const { trending } = await arrccRes.json();
    if (!trending || trending.length === 0) {
      return res.status(200).json({ ok: true, message: 'No trends found', items: [] });
    }

    const createdItems = [];

    // 2. Generate content for top trends
    for (const trend of trending) {
      const topicFriendly = trend.topic;
      const slug = slugify(topicFriendly);
      // We will generate a unique promo code for the campaign
      const promoSuffix = slug.substring(0, 4).toUpperCase();
      const promoCode = 'TREND' + promoSuffix; 

      // -- A. Google Ads --
      let googleAdData;
      try {
        googleAdData = await callAnthropicForAd(topicFriendly, 'google', brandVoice);
        const gId = `content-${Date.now()}-g`;
        const googleItem = {
          id: gId,
          content_type: 'ad_copy',
          source: 'social_ads',
          topic: `Google Search Ads: ${topicFriendly}`,
          slug: `${slug}-google`,
          ad_platform: 'google',
          generated_at: new Date().toISOString(),
          status: 'review',
          trigger: `Social Trend: ${trend.mention_count} mentions (urgency: ${trend.urgency_score})`,
          content: { ...googleAdData },
          flags: [],
          qa_status: 'READY_FOR_REVIEW'
        };
        delete googleItem.content.image_prompt;
        
        await redis.set(`content:${gId}`, JSON.stringify(googleItem));
        await redis.lpush('content:index', gId);
        createdItems.push(gId);
      } catch (e) {
        console.warn(`Failed Google ad for ${topicFriendly}`, e.message);
      }

      // -- B. Meta Ads --
      let metaAdData;
      try {
        metaAdData = await callAnthropicForAd(topicFriendly, 'meta', brandVoice);
        const mId = `content-${Date.now()}-m`;
        const metaItem = {
          id: mId,
          content_type: 'ad_copy',
          source: 'social_ads',
          topic: `Meta Ads: ${topicFriendly}`,
          slug: `${slug}-meta`,
          ad_platform: 'meta',
          generated_at: new Date().toISOString(),
          status: 'review',
          trigger: `Social Trend: ${trend.mention_count} mentions (urgency: ${trend.urgency_score})`,
          content: { ...metaAdData },
          image_prompt: metaAdData.image_prompt || '',
          image_url: null,
          flags: [],
          qa_status: 'READY_FOR_REVIEW'
        };
        delete metaItem.content.image_prompt;

        // Optionally generate image if FAL_API_KEY is available
        if (process.env.FAL_API_KEY && metaItem.image_prompt) {
          try {
            const falRes = await fetch(`https://fal.run/fal-ai/flux/schnell`, {
              method: 'POST',
              headers: { Authorization: `Key ${process.env.FAL_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: metaItem.image_prompt, image_size: 'landscape_16_9', num_images: 1 }),
            });
            if (falRes.ok) {
              const falData = await falRes.json();
              metaItem.image_url = falData?.images?.[0]?.url || falData?.image?.url || null;
            }
          } catch(e) {}
        }
        
        await redis.set(`content:${mId}`, JSON.stringify(metaItem));
        await redis.lpush('content:index', mId);
        createdItems.push(mId);
      } catch (e) {
        console.warn(`Failed Meta ad for ${topicFriendly}`, e.message);
      }

      // -- C. Campaign Landing Page --
      const cId = `content-${Date.now()}-c`;
      const lpItem = {
        id: cId,
        content_type: 'campaign_landing_page',
        source: 'social_ads',
        topic: `Campaign Funnel: ${topicFriendly}`,
        slug: `${slug}-campaign`,
        generated_at: new Date().toISOString(),
        status: 'review',
        trigger: `Social Trend: ${trend.mention_count} mentions (urgency: ${trend.urgency_score})`,
        content: {
          seo_title: `${topicFriendly} | Dante Labs`,
          seo_description: `Learn how whole genome sequencing can provide actionable health insights for ${topicFriendly}.`,
          canonical_url: `https://dantelabs.com/${slug}-campaign/`,
          promo_code: promoCode,
          offer_label: '10% off'
        },
        flags: [],
        qa_status: 'READY_FOR_REVIEW'
      };
      await redis.set(`content:${cId}`, JSON.stringify(lpItem));
      await redis.lpush('content:index', cId);
      createdItems.push(cId);
    }

    return res.status(200).json({ ok: true, created: createdItems.length, items: createdItems });

  } catch (err) {
    console.error('Social ads error:', err);
    return res.status(500).json({ error: err.message });
  }
}
