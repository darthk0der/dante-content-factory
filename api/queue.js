import { redis } from './_lib/redis.js';

async function getAllItems() {
  const ids = await redis.lrange('content:index', 0, -1);
  if (!ids || ids.length === 0) return [];
  const items = await Promise.all(
    ids.map(async (id) => {
      const raw = await redis.get(`content:${id}`);
      if (!raw) return null;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    })
  );
  return items.filter(Boolean).sort((a, b) =>
    new Date(b.generated_at) - new Date(a.generated_at)
  );
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const items = await getAllItems();
      return res.status(200).json({ items });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const item = req.body;
      if (!item?.id) return res.status(400).json({ error: 'Missing id' });
      await redis.set(`content:${item.id}`, JSON.stringify(item));
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await redis.del(`content:${id}`);
      await redis.lrem('content:index', 0, id);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
