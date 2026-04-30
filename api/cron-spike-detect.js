import { redis } from './_lib/redis.js';
import { getExistingSlugs } from './_lib/github.js';
import { loadSkill } from './_lib/skills.js';
import { getVolumeHistory } from './_lib/ahrefs.js';
import { generateInsightBundle } from './_lib/insightBundleHelper.js';

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
Assess the relevance of the news on a scale of 0 to 100.
If there's a strong opportunity, return a JSON object: {"is_spike": true, "topic": "The exact topic/event", "relevance_score": 85}
Otherwise return: {"is_spike": false, "relevance_score": 0}`;
    
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
        return parsed.is_spike || parsed.relevance_score > 0 ? { topic: parsed.topic, score: parsed.relevance_score || 0 } : null;
    } catch {
        return null;
    }
}

// Handled by insightBundleHelper

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const brandVoice = await loadSkill(BRAND_VOICE_SKILL, true).catch(() => '');
        let generatedCount = 0;
        const spikesDetected = [];
        const uiSignals = [];
        const debugLogs = [];

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
                    
                    const multiplier = Math.round((currentVol/baseline)*100)/100; // e.g. 1.05
                    if (multiplier >= 1.01) {
                        uiSignals.push({ source: 'Ahrefs SEO', topic: kw, metric: `${multiplier}x Volume`, sentiment: 'neutral' });
                    }
                    
                    if (currentVol >= (baseline * 2)) {
                        const slug = kw.replace(/[^a-z0-9]+/g, '-');
                        const alreadyExists = await redis.get(`spike:published:${slug}`);
                        const conditionDirs = await getExistingSlugs('public/conditions');
                        const blogDirs = await getExistingSlugs('public/blog');
                        
                        if (!alreadyExists && !conditionDirs.includes(slug) && !blogDirs.includes(slug)) {
                            // Valid spike
                            try {
                                await generateInsightBundle(kw, `Ahrefs spike: ${kw} ${currentVol} vol`, 'spike', brandVoice);
                                spikesDetected.push(kw);
                                generatedCount++;
                            } catch (e) {
                                debugLogs.push(`Bundle generation failed for Ahrefs: ${e.message}`);
                                console.warn(`Bundle generation failed for ${kw}:`, e.message);
                            }
                        }
                    }
                    
                    // Update baseline dynamically for next time
                    if (currentVol > 10) await redis.set(`spike:baseline:${kw}`, currentVol.toString());
                } catch (e) {
                    debugLogs.push(`Ahrefs error for ${kw}: ${e.message}`);
                    console.warn(`Ahrefs volume check failed for ${kw}:`, e.message);
                }
            }
        }

        // --- 2. News Monitoring (via SERP API -> Claude) ---
        if (process.env.SERPAPI_API_KEY && generatedCount < 2) {
            debugLogs.push("SERPAPI_API_KEY is present, running news check.");
            const newsData = await checkSerpApi('google', 'genetic testing news OR genomics OR gene discovery', { tbm: 'nws' });
            if (!newsData) debugLogs.push("checkSerpApi returned null for news");
            if (newsData && newsData.news_results) {
                const topic = await evaluateNewsWithClaude(newsData.news_results, brandVoice);
                if (topic && topic.score >= 1) {
                    const topicStr = topic.topic || 'General News';
                    const slug = topicStr.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    const alreadyExists = await redis.get(`spike:published:${slug}`);
                    if (!alreadyExists) {
                        try {
                            await generateInsightBundle(topicStr, `News Trending: ${topicStr}`, 'spike', brandVoice);
                            spikesDetected.push(topicStr);
                            generatedCount++;
                        } catch (e) {
                            debugLogs.push(`Bundle generation failed for Claude AI: ${e.message}`);
                            console.warn(`Bundle generation failed for ${topicStr}:`, e.message);
                        }
                        uiSignals.push({ source: 'Claude AI', topic: topicStr, metric: `${topic.score}% Relevance`, sentiment: 'neutral' });
                    }
                }
            }
            
            // --- 3. Google Trends ---
            if (generatedCount < 2) {
                const trendsData = await checkSerpApi('google_trends', 'genetic testing');
                if (trendsData && trendsData.related_queries?.rising) {
                    for (const rising of trendsData.related_queries.rising) {
                        if (rising.extracted_value >= 1) {
                            uiSignals.push({ source: 'Google Trends', topic: rising.query, metric: `+${rising.extracted_value}% Breakout`, sentiment: 'neutral' });
                        }
                        if (rising.extracted_value >= 200 && generatedCount < 2) { // 200% increase
                           const slug = rising.query.replace(/[^a-z0-9]+/g, '-');
                           const alreadyExists = await redis.get(`spike:published:${slug}`);
                           if (!alreadyExists) {
                               try {
                                   await generateInsightBundle(rising.query, `Google Trends breakout: ${rising.query} (+${rising.extracted_value}%)`, 'spike', brandVoice);
                                   spikesDetected.push(rising.query);
                                   generatedCount++;
                               } catch (e) {
                                   debugLogs.push(`Bundle generation failed for Google Trends: ${e.message}`);
                                   console.warn(`Bundle generation failed for ${rising.query}:`, e.message);
                               }
                           }
                        }
                    }
                }
            }
        }

        if (uiSignals.length > 0) {
            // Keep the last 10 signals in Redis
            let existingSignals = [];
            try {
                const stored = await redis.get('content:daily_signals');
                if (stored) {
                    existingSignals = typeof stored === 'string' ? JSON.parse(stored) : stored;
                    if (!Array.isArray(existingSignals)) existingSignals = [];
                }
            } catch(e) {
                debugLogs.push(`Redis error: ${e.message}`);
            }
            
            const newSignals = [...uiSignals, ...existingSignals].slice(0, 30);
            await redis.set('content:daily_signals', JSON.stringify(newSignals));
        }

        return res.status(200).json({ ok: true, generated: generatedCount, spikes: spikesDetected, uiSignals: uiSignals.length, debugLogs });

    } catch (e) {
        console.error("Spike detect error:", e);
        return res.status(500).json({ error: e.message });
    }
}
