import { redis } from './_lib/redis.js';

import { verifyAuth } from './_lib/auth.js';

export default async function handler(req, res) {
    try {
        await verifyAuth(req);
    } catch (e) {
        return res.status(403).json({ error: 'Forbidden', message: e.message });
    }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let signals = [];
    
    // 1. Fetch from ARRCC if possible (Social signals)
    if (process.env.ARRCC_URL && process.env.ARRCC_API_SECRET) {
        try {
            const arrccRes = await fetch(`${process.env.ARRCC_URL}/api/social-trending`, {
                headers: { 'Authorization': `Bearer ${process.env.ARRCC_API_SECRET}` }
            });
            if (arrccRes.ok) {
                const arrccData = await arrccRes.json();
                if (arrccData.trending) {
                    signals.push(...arrccData.trending.map(t => ({
                        source: 'Social Listening',
                        topic: t.topic,
                        metric: `${t.mention_count} mentions`,
                        sentiment: t.sentiment
                    })));
                }
            }
        } catch(e) {
            console.warn("ARRCC fetch failed", e);
        }
    }

    // 2. Fetch Ahrefs/Google Trends recorded by cron-spike-detect
    try {
        const storedSpikes = await redis.get('content:daily_signals');
        if (storedSpikes) {
            // Upstash automatically parses JSON
            const parsed = typeof storedSpikes === 'string' ? JSON.parse(storedSpikes) : storedSpikes;
            if (Array.isArray(parsed)) {
                // Filter out old "1x Volume" entries from previous sessions
                const validSignals = parsed.filter(s => !s.metric.includes('1x Volume') && s.topic !== 'General News');
                signals.push(...validSignals);
            }
        }
    } catch(e) {
        console.error("Redis get failed:", e);
    }

    // 3. Removed misleading fallback mock data so the UI accurately reflects actual signals.

    return res.status(200).json({ signals: signals.slice(0, 5) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
