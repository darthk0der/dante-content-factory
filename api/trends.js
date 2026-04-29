import { redis } from './_lib/redis.js';

export default async function handler(req, res) {
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
            const parsed = JSON.parse(storedSpikes);
            signals.push(...parsed);
        }
    } catch(e) {}

    // 3. Fallback / Mock Data if no external connections yet
    if (signals.length === 0) {
        signals = [
            { source: 'Ahrefs SEO', topic: 'MTHFR gene mutation', metric: '2.4x Volume Spike', sentiment: 'neutral' },
            { source: 'Google Trends', topic: 'whole genome sequencing cost', metric: '+250% Breakout', sentiment: 'neutral' },
            { source: 'Social Listening', topic: 'EDS diagnosis journey', metric: '42 mentions', sentiment: 'frustration' }
        ];
    }

    return res.status(200).json({ signals: signals.slice(0, 5) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
