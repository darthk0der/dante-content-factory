import { redis } from './_lib/redis.js';
import { getExistingSlugs, githubGet } from './_lib/github.js';
import { loadSkill } from './_lib/skills.js';

const BRAND_VOICE_SKILL = 'Documentation/02_Brand/Brand_Voice_SKILL.md';
const TWITTER_SKILL = 'Twitter_Post_SKILL.md';

function extractField(html, fieldName) {
  const regex = new RegExp(`data-cms-field="${fieldName}"[^>]*>([\\s\\S]*?)<\\/`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : '';
}

export default async function handler(req, res) {
  // Can be called via cron GET request
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Fetch condition slugs
    const conditionSlugs = await getExistingSlugs('public/conditions');
    if (!conditionSlugs.length) {
      return res.status(200).json({ message: 'No conditions found' });
    }
    conditionSlugs.sort();

    // 2. Get last tweeted condition
    const lastCondition = await redis.get('auto_tweet:last_condition');
    
    // 3. Find the next eligible condition
    let startIndex = 0;
    if (lastCondition) {
      startIndex = conditionSlugs.indexOf(lastCondition) + 1;
    }
    
    let selectedSlug = null;
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (let i = 0; i < conditionSlugs.length; i++) {
        // Rotate alphabetically
        const index = (startIndex + i) % conditionSlugs.length;
        const candidate = conditionSlugs[index];
        
        // Skip if tweeted in last 30 days
        const historyKey = `auto_tweet:history:${candidate}`;
        const lastTweetedTime = await redis.get(historyKey);
        
        if (!lastTweetedTime || now - parseInt(lastTweetedTime, 10) > thirtyDaysInMs) {
            selectedSlug = candidate;
            break;
        }
    }

    if (!selectedSlug) {
      return res.status(200).json({ message: 'No eligible condition found in rotation' });
    }

    // 4. Fetch the condition's index.html
    const fileData = await githubGet(`public/conditions/${selectedSlug}/index.html`);
    if (!fileData || !fileData.content) {
        return res.status(500).json({ error: `Could not fetch HTML for ${selectedSlug}` });
    }
    const html = Buffer.from(fileData.content, 'base64').toString('utf8');

    // 5. Extract fields
    const hero_headline = extractField(html, 'hero_headline');
    const hero_subhead = extractField(html, 'hero_subhead');
    const condition_name = extractField(html, 'condition_name');
    const why_wgs_card_1_headline = extractField(html, 'why_wgs_card_1_headline');

    const inputData = {
        condition_name,
        condition_slug: selectedSlug,
        hero_headline,
        hero_subhead,
        why_wgs_card_1_headline
    };

    // 6. Call Anthropic API
    const brandVoice = await loadSkill(BRAND_VOICE_SKILL, true).catch(() => '');
    const twitterSkill = await loadSkill(TWITTER_SKILL).catch(() => 'Generate a Twitter post.');
    const systemPrompt = `${twitterSkill}\n\n---\n\nBRAND VOICE REFERENCE:\n${brandVoice}\n\nReturn ONLY a valid JSON object. No explanation text. No markdown code fences.
Schema:
{
  "text": "≤280 character tweet",
  "format": "awareness",
  "character_count": 214,
  "image_prompt": "Editorial lifestyle photo...",
  "brand_check": {
    "no_exclamation_points": true,
    "no_banned_words": true,
    "no_diagnostic_claims": true,
    "patient_is_subject": true,
    "character_count_verified": true
  }
}`;
    
    const userPrompt = `Create an awareness Twitter post for the condition: ${condition_name}.
Data from the landing page:
Headline: ${hero_headline}
Subhead: ${hero_subhead}
Why WGS: ${why_wgs_card_1_headline}

The image_prompt field MUST describe a lifestyle scene — a real person living with or managing the condition, or a family receiving results together. Use natural, warm settings (clinic, home, outdoors). NEVER depict hands in isolation. NEVER depict laboratory equipment or test tubes. Think: editorial photography style, like what you'd see in a health magazine.`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        }),
    });

    const anthropicData = await anthropicRes.json();
    if (!anthropicRes.ok) {
        return res.status(500).json({ error: anthropicData.error?.message || 'Anthropic API error' });
    }

    const fullText = anthropicData.content?.[0]?.text || '';
    const codeBlockMatch = fullText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = (codeBlockMatch ? codeBlockMatch[1] : fullText).trim();
    
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        parsed = { text: raw, format: 'awareness', image_prompt: '' };
    }

    const id = `content-${Date.now()}`;
    const slug = selectedSlug;
    const topic = condition_name || slug;

    const item = {
        id,
        content_type: 'twitter',
        source: 'daily_tweet',
        topic,
        slug,
        format: 'awareness',
        email_type: null,
        ad_platform: null,
        generated_at: new Date().toISOString(),
        status: 'review',
        published_at: null,
        scheduled_at: null,
        trigger: `Daily tweet — condition: ${slug}`,
        content: { ...parsed },
        image_prompt: parsed.image_prompt || '',
        image_url: null,
        flags: parsed.flags || [],
        qa_status: parsed.qa_status || 'REQUIRES_REVISION',
    };
    
    delete item.content.flags;
    delete item.content.qa_status;
    delete item.content.image_prompt;

    // Generate Image via fal
    if (process.env.FAL_API_KEY && item.image_prompt) {
        try {
            const falRes = await fetch(`https://fal.run/fal-ai/flux/schnell`, {
                method: 'POST',
                headers: {
                    Authorization: `Key ${process.env.FAL_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: item.image_prompt,
                    image_size: 'landscape_16_9',
                    num_images: 1,
                }),
            });
            if (falRes.ok) {
                const falData = await falRes.json();
                item.image_url = falData?.images?.[0]?.url || falData?.image?.url || null;
            }
        } catch (e) {
            // fail silently
        }
    }

    // 7. Save to Redis
    await redis.set(`content:${item.id}`, JSON.stringify(item));
    await redis.lpush('content:index', item.id);
    
    // 8. Update state
    await redis.set('auto_tweet:last_condition', selectedSlug);
    await redis.set(`auto_tweet:history:${selectedSlug}`, now.toString());

    return res.status(200).json({ ok: true, item });
  } catch (error) {
      console.error('Error in daily tweet cron:', error);
      return res.status(500).json({ error: error.message });
  }
}
