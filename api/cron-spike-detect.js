import { redis } from './_lib/redis.js';
import { getExistingSlugs } from './_lib/github.js';
import { loadSkill } from './_lib/skills.js';
import { getVolumeHistory } from './_lib/ahrefs.js';

const BRAND_VOICE_SKILL = 'Documentation/02_Brand/Brand_Voice_SKILL.md';

const SEED_SPIKE_KEYWORDS = [
  "genetic testing", "whole genome sequencing", "dna test", 
  "gene mutation", "mthfr", "brca", "apoe"
];

async function checkSerpApi(engine, q, additionalParams={}) {
    if (!process.env.SERPAPI_API_KEY) return null;
    try {
        const url = new URL('https://serpapi.com/search');
        url.searchParams.append('engine', engine);
        url.searchParams.append('q', q);
        url.searchParams.append('api_key', process.env.SERPAPI_API_KEY);
        for (const [k,v] of Object.entries(additionalParams)) {
            url.searchParams.append(k,v);
        }
        const res = await fetch(url.toString());
        if (res.ok) return await res.json();
    } catch {
        // silent
    }
    return null;
}

async function evaluateNewsWithClaude(newsItems, brandVoice) {
    if (!newsItems || newsItems.length === 0) return null;
    
    const headlines = newsItems.slice(0, 10).map(n => `- ${n.title}: ${n.snippet}`).join('\n');
    const systemPrompt = `You are evaluating news headlines for Dante Labs. Determine if any story represents a significant, market-moving event that will generate search demand for genetic testing. 
Exclude competitor product launches unless it's a massive failure or data breach.
If there's a strong opportunity, return a JSON object: {"is_spike": true, "topic": "The exact topic/event", "reason": "Why it matters"}
Otherwise return: {"is_spike": false}`;
    
    try {
        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 500,
                system: systemPrompt,
                messages: [{ role: 'user', content: `Evaluating recent news:\n${headlines}` }],
            }),
        });
        const data = await anthropicRes.json();
        const raw = data.content?.[0]?.text || '';
        const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
        const parsed = JSON.parse(match ? match[1] : raw);
        return parsed.is_spike ? parsed.topic : null;
    } catch {
        return null;
    }
}

async function generateReactivePage(topic, triggerSource, brandVoice) {
    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const systemPrompt = `Generate a fast-reacting, campaign-style insight page about: ${topic}.
Target audience: Consumers seeing this news/trend.
Length: 400-800 words. Focus on how Dante Labs' Whole Genome Sequencing relates to this securely and medically.
Return ONLY valid JSON:
{
  "title": "...",
  "slug": "${slug}",
  "meta_description": "...",
  "body_html": "<article HTML>",
  "image_prompt": "Editorial lifestyle photo...",
  "flags": []
}`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
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
            messages: [{ role: 'user', content: `News/Trend Trigger: ${triggerSource}. Create insight page for ${topic}` }],
        }),
    });

    const data = await anthropicRes.json();
    const fullText = data.content?.[0]?.text || '';
    const codeBlockMatch = fullText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = codeBlockMatch ? codeBlockMatch[1] : fullText;
    
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = { title: topic, slug, body_html: raw }; }

    const id = `content-${Date.now()}`;
    const item = {
        id,
        content_type: 'insight', // Special content type handled by modified publish routes
        source: 'spike',
        topic: parsed.title || topic,
        slug: parsed.slug || slug,
        generated_at: new Date().toISOString(),
        status: 'review',
        published_at: null,
        scheduled_at: null,
        trigger: triggerSource,
        content: { ...parsed },
        image_prompt: parsed.image_prompt || '',
        image_url: null,
        flags: parsed.flags || [],
        qa_status: parsed.qa_status || 'REQUIRES_REVISION',
    };

    delete item.content.flags;
    delete item.content.qa_status;
    delete item.content.image_prompt;

    // Optional Fal Generation
    if (process.env.FAL_API_KEY && item.image_prompt) {
        try {
            const falRes = await fetch(`https://fal.run/fal-ai/flux-pro`, {
                method: 'POST',
                headers: { Authorization: `Key ${process.env.FAL_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: item.image_prompt, image_size: 'landscape_16_9', num_images: 1 }),
            });
            if (falRes.ok) {
                const falData = await falRes.json();
                item.image_url = falData?.images?.[0]?.url || falData?.image?.url || null;
            }
        } catch (e) {}
    }

    await redis.set(`content:${id}`, JSON.stringify(item));
    await redis.lpush('content:index', id);
    await redis.set(`spike:published:${slug}`, 'true');

    return item;
}

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const brandVoice = await loadSkill(BRAND_VOICE_SKILL, true).catch(() => '');
        let generatedCount = 0;
        const spikesDetected = [];

        // --- 1. Ahrefs Volume Spikes ---
        if (process.env.AHREFS_API_KEY) {
            for (const kw of SEED_SPIKE_KEYWORDS) {
                if (generatedCount >= 2) break; // Limit 2 per day

                const baselineStr = await redis.get(`spike:baseline:${kw}`);
                const baseline = baselineStr ? parseInt(baselineStr, 10) : 1000; // Mock baseline fallback

                try {
                    const data = await getVolumeHistory(kw);
                    // Assuming data returns { metrics: [{ volume }] } shape based on typical Ahrefs responses
                    // Here we simply simulate parsing the current volume
                    const currentVol = data?.metrics?.[0]?.volume || (baseline * 0.5); 
                    
                    if (currentVol >= (baseline * 2)) {
                        const slug = kw.replace(/[^a-z0-9]+/g, '-');
                        const alreadyExists = await redis.get(`spike:published:${slug}`);
                        const conditionDirs = await getExistingSlugs('public/conditions');
                        const blogDirs = await getExistingSlugs('public/blog');
                        
                        if (!alreadyExists && !conditionDirs.includes(slug) && !blogDirs.includes(slug)) {
                            // Valid spike
                            await generateReactivePage(kw, `Ahrefs spike: ${kw} ${currentVol} vol`, brandVoice);
                            spikesDetected.push(kw);
                            generatedCount++;
                        }
                    }
                    
                    // Update baseline dynamically for next time
                    if (currentVol > 10) await redis.set(`spike:baseline:${kw}`, currentVol.toString());
                } catch (e) {
                    console.warn(`Ahrefs volume check failed for ${kw}:`, e.message);
                }
            }
        }

        // --- 2. News Monitoring (via SERP API -> Claude) ---
        if (process.env.SERPAPI_API_KEY && generatedCount < 2) {
            const newsData = await checkSerpApi('google', 'genetic testing news OR genomics OR gene discovery', { tbm: 'nws' });
            if (newsData && newsData.news_results) {
                const topic = await evaluateNewsWithClaude(newsData.news_results, brandVoice);
                if (topic) {
                    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    const alreadyExists = await redis.get(`spike:published:${slug}`);
                    if (!alreadyExists) {
                        await generateReactivePage(topic, `News Trending: ${topic}`, brandVoice);
                        spikesDetected.push(topic);
                        generatedCount++;
                    }
                }
            }
            
            // --- 3. Google Trends ---
            if (generatedCount < 2) {
                const trendsData = await checkSerpApi('google_trends', 'genetic testing');
                if (trendsData && trendsData.related_queries?.rising) {
                    for (const rising of trendsData.related_queries.rising) {
                        if (rising.extracted_value > 200) { // 200% increase
                           const slug = rising.query.replace(/[^a-z0-9]+/g, '-');
                           const alreadyExists = await redis.get(`spike:published:${slug}`);
                           if (!alreadyExists) {
                               await generateReactivePage(rising.query, `Google Trends breakout: ${rising.query} (+${rising.extracted_value}%)`, brandVoice);
                               spikesDetected.push(rising.query);
                               generatedCount++;
                               break;
                           }
                        }
                    }
                }
            }
        }

        return res.status(200).json({ ok: true, generated: generatedCount, spikes: spikesDetected });

    } catch (e) {
        console.error("Spike detect error:", e);
        return res.status(500).json({ error: e.message });
    }
}
