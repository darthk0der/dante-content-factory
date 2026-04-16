import { redis } from './_lib/redis.js';
import { getExistingSlugs } from './_lib/github.js';
import { loadSkill } from './_lib/skills.js';
import { getMatchingTerms } from './_lib/ahrefs.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const BRAND_VOICE_SKILL = 'Documentation/02_Brand/Brand_Voice_SKILL.md';
const BLOG_SKILL = 'Blog_Post_SKILL.md';

const SEED_QUERIES = [
    "is genetic", "is hereditary", "genetic testing for", 
    "gene mutation", "whole genome sequencing"
];

function staggerSchedule(index, baseDate) {
    // max 4 items per day (Mon-Fri)
    // 8am, 11am, 2pm, 5pm ET
    const dayOffset = Math.floor(index / 4);
    const timeIndex = index % 4;
    
    const targetDate = new Date(baseDate);
    targetDate.setUTCDate(targetDate.getUTCDate() + dayOffset);
    
    // Convert to ET-like stagger (rough approximation)
    const hours = [12, 15, 18, 21]; // 8am, 11am, 2pm, 5pm ET in UTC
    targetDate.setUTCHours(hours[timeIndex], 0, 0, 0);
    return targetDate.toISOString();
}

async function generateContentItem(itemConf, brandVoice, blogSkill) {
    const systemPrompt = `${blogSkill}\n\n---\n\nBRAND VOICE REFERENCE:\n${brandVoice}\n\nReturn ONLY a valid JSON object matching the blog post schema. No markdown code fences.
Schema:
{
  "title": "...",
  "slug": "${itemConf.slug}",
  "meta_description": "...",
  "hero_image_alt": "...",
  "primary_keyword": "${itemConf.primary_keyword || itemConf.keyword}",
  "structure_variant": "${itemConf.structure_variant || 'A'}",
  "word_count": ${itemConf.target_word_count || 1500},
  "body_html": "<article HTML>",
  "image_prompt": "Editorial lifestyle photo...",
  "flags": []
}`;

    const userPrompt = `Generate a blog post targeting the primary keyword: "${itemConf.primary_keyword || itemConf.keyword}".
Word count target: ~${itemConf.target_word_count || 1500} words.
Structure variant: ${itemConf.structure_variant || 'A'}.
Ensure internal links and CTA variants are appropriately placed.`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 8000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        }),
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) throw new Error(data.error?.message || 'Anthropic API failed');

    const fullText = data.content?.[0]?.text || '';
    const codeBlockMatch = fullText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = (codeBlockMatch ? codeBlockMatch[1] : fullText).trim();
    
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        parsed = { body_html: raw };
    }

    const id = `content-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const topic = parsed.title || itemConf.primary_keyword || itemConf.keyword;
    const slug = parsed.slug || itemConf.slug;

    const autoImagePrompt = parsed.image_prompt;
    let imageUrl = null;
    if (process.env.FAL_API_KEY && autoImagePrompt) {
        try {
            const falRes = await fetch(`https://fal.run/fal-ai/flux-pro`, {
                method: 'POST',
                headers: {
                    Authorization: `Key ${process.env.FAL_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: autoImagePrompt, image_size: 'landscape_16_9', num_images: 1 }),
            });
            if (falRes.ok) {
                const falData = await falRes.json();
                imageUrl = falData?.images?.[0]?.url || falData?.image?.url || null;
            }
        } catch (e) {
            // silent
        }
    }

    const finalItem = {
        id,
        content_type: 'blog',
        source: 'seo_queue',
        topic,
        slug,
        generated_at: new Date().toISOString(),
        status: 'review',
        published_at: null,
        scheduled_at: itemConf.staggeredDate || null, // UI can default to this when schedule button is clicked
        trigger: `SEO queue item — Week ${itemConf.week_number || itemConf.week}`,
        content: { ...parsed },
        image_prompt: autoImagePrompt || '',
        image_url: imageUrl,
        flags: parsed.flags || [],
        qa_status: parsed.qa_status || 'REQUIRES_REVISION',
    };

    delete finalItem.content.flags;
    delete finalItem.content.qa_status;
    delete finalItem.content.image_prompt;

    await redis.set(`content:${id}`, JSON.stringify(finalItem));
    await redis.lpush('content:index', id);
    return finalItem;
}

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // --- 1. INITIALIZE QUEUE ---
        let queueJson = await redis.get('seo_queue:items');
        let queue = [];
        if (queueJson) {
            queue = typeof queueJson === 'string' ? JSON.parse(queueJson) : queueJson;
        } else {
            const initialData = readFileSync(join(process.cwd(), 'api/_lib/initial_seo_queue.json'), 'utf-8');
            queue = JSON.parse(initialData);
            await redis.set('seo_queue:items', JSON.stringify(queue));
        }

        // --- 2. PART A: PROCESS QUEUE ---
        let currentWeekStr = await redis.get('seo_queue:current_week');
        let currentWeek = currentWeekStr ? parseInt(currentWeekStr, 10) : 1;

        // Extract items for this week
        let weekItems = queue.filter(i => i.week_number === currentWeek);
        
        // If empty, just increment week (or handle missing weeks)
        if (weekItems.length === 0 && currentWeek <= 12) {
            currentWeek++;
            weekItems = queue.filter(i => i.week_number === currentWeek);
            await redis.set('seo_queue:current_week', currentWeek);
        }

        const existingSlugs = await getExistingSlugs('public/blog');
        const toGenerate = [];
        
        // Deduplicate
        for (const item of weekItems) {
            if (!existingSlugs.includes(item.slug)) {
                toGenerate.push(item);
            }
        }

        // Velocity enforcement
        const generateSubset = toGenerate.slice(0, 20); // max 20 per week
        
        const brandVoice = await loadSkill(BRAND_VOICE_SKILL, true).catch(() => '');
        const blogSkill = await loadSkill(BLOG_SKILL).catch(() => '');

        // Stagger generation slightly and use Promise.all in batches to avoid timeout
        const generatedIds = [];
        const baseDate = new Date(); // roughly Monday 8am ET
        
        // Execute in batches of 4
        const BATCH_SIZE = 4;
        for (let i = 0; i < generateSubset.length; i += BATCH_SIZE) {
            const batch = generateSubset.slice(i, i + BATCH_SIZE);
            const promises = batch.map((item, idx) => {
                const staggerInd = i + idx;
                item.staggeredDate = staggerSchedule(staggerInd, baseDate);
                return generateContentItem(item, brandVoice, blogSkill);
            });
            const results = await Promise.allSettled(promises);
            results.forEach(r => { if (r.status === 'fulfilled') generatedIds.push(r.value.id); });
        }

        // Mark items as generated (remove from queue or just keep week moving)
        if (generateSubset.length > 0) {
            await redis.set('seo_queue:current_week', currentWeek + 1);
        }


        // --- 3. PART B: AHREFS SCAN ---
        let newOpportunities = [];
        if (process.env.AHREFS_API_KEY) {
            try {
                for (const seed of SEED_QUERIES) {
                    const data = await getMatchingTerms(seed);
                    if (data && data.keywords) {
                        for (const row of data.keywords) {
                            const priorityScore = (row.volume * 0.6) + ((100 - row.difficulty) * 0.3) + (row.traffic_potential * 0.1);
                            if (priorityScore > 500) {
                                // check existing queue
                                const inQueue = queue.find(q => q.primary_keyword === row.keyword);
                                if (!inQueue) {
                                  newOpportunities.push({
                                      id: Date.now() + Math.floor(Math.random()*100),
                                      week_number: currentWeek + 2, // append to future
                                      slug: row.keyword.replace(/[^a-z0-9]+/g, '-'),
                                      primary_keyword: row.keyword,
                                      structure_variant: ['A','B','C','D','E','F'][Math.floor(Math.random()*6)],
                                      target_word_count: 1500
                                  });
                                }
                            }
                        }
                    }
                }

                if (newOpportunities.length > 0) {
                    const updatedQueue = [...queue, ...newOpportunities];
                    await redis.set('seo_queue:items', JSON.stringify(updatedQueue));
                }
            } catch (err) {
                console.error("Ahrefs scan error:", err.message);
            }
        }

        return res.status(200).json({ 
            ok: true, 
            generated: generatedIds.length, 
            newOpportunities: newOpportunities.length 
        });

    } catch (e) {
        console.error("SEO queue error:", e);
        return res.status(500).json({ error: e.message });
    }
}
