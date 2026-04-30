import { redis } from './_lib/redis.js';

import { verifyAuth } from './_lib/auth.js';

export default async function handler(req, res) {
    try {
        await verifyAuth(req);
    } catch (e) {
        return res.status(403).json({ error: 'Forbidden', message: e.message });
    }
  if (req.method === 'GET') {
    try {
      const rules = await redis.lrange('content:global_rules', 0, -1);
      return res.status(200).json({ rules: rules || [] });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { rule } = req.body;
      if (!rule) return res.status(400).json({ error: 'Missing rule' });
      
      // Remove all occurrences of exactly this rule string
      await redis.lrem('content:global_rules', 0, rule);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
