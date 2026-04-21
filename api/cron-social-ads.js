import { redis } from './_lib/redis.js';
import { loadSkill } from './_lib/skills.js';
import { generateInsightBundle } from './_lib/insightBundleHelper.js';

const BRAND_VOICE_SKILL = 'Documentation/02_Brand/Brand_Voice_SKILL.md';

// Anthropic calls handled by insightBundleHelper

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
      const bundle = await generateInsightBundle(
        trend.topic,
        `Social Trend: ${trend.mention_count} mentions (urgency: ${trend.urgency_score})`,
        'social_ads',
        brandVoice
      );
      createdItems.push(bundle.id);
    }

    return res.status(200).json({ ok: true, created: createdItems.length, items: createdItems });

  } catch (err) {
    console.error('Social ads error:', err);
    return res.status(500).json({ error: err.message });
  }
}
