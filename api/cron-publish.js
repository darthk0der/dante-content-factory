import { redis } from './_lib/redis.js';
import { publishItem } from './publish.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ids = await redis.lrange('content:index', 0, -1);
  if (!ids || ids.length === 0) return res.status(200).json({ processed: 0 });

  const now     = new Date();
  const results = [];

  for (const id of ids) {
    const raw = await redis.get(`content:${id}`);
    if (!raw) continue;
    const item = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (item.status !== 'scheduled' || !item.scheduled_at) continue;
    if (new Date(item.scheduled_at) > now) continue;

    try {
      const result = await publishItem(item, redis);
      results.push({ id, ok: true, ...result });
    } catch (e) {
      results.push({ id, ok: false, error: e.message });
    }
  }

  return res.status(200).json({ processed: results.length, results });
}
