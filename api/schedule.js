import { redis } from './_lib/redis.js';

import { verifyAuth } from './_lib/auth.js';

export default async function handler(req, res) {
    try {
        await verifyAuth(req);
    } catch (e) {
        return res.status(403).json({ error: 'Forbidden', message: e.message });
    }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, scheduled_at } = req.body;
  if (!id || !scheduled_at) return res.status(400).json({ error: 'Missing id or scheduled_at' });

  const raw = await redis.get(`content:${id}`);
  if (!raw) return res.status(404).json({ error: 'Item not found' });

  const item = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (item.status !== 'approved') return res.status(400).json({ error: 'Item must be approved before scheduling' });

  item.status = 'scheduled';
  item.scheduled_at = scheduled_at;

  await redis.set(`content:${id}`, JSON.stringify(item));
  return res.status(200).json({ item });
}
