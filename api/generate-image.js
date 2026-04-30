import { redis } from './_lib/redis.js';

import { verifyAuth } from './_lib/auth.js';

export default async function handler(req, res) {
    try {
        await verifyAuth(req);
    } catch (e) {
        return res.status(403).json({ error: 'Forbidden', message: e.message });
    }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, image_prompt, quality } = req.body;
  if (!id || !image_prompt) return res.status(400).json({ error: 'Missing id or image_prompt' });

  if (!process.env.FAL_API_KEY) {
    return res.status(200).json({ pending: true, message: 'Image generation not configured' });
  }

  const model = quality === 'high' ? 'fal-ai/flux-pro' : 'fal-ai/flux/schnell';

  const falRes = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${process.env.FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: image_prompt,
      image_size: 'landscape_16_9',
      num_images: 1,
    }),
  });

  if (!falRes.ok) {
    const err = await falRes.text();
    return res.status(500).json({ error: `fal.ai error: ${err}` });
  }

  const falData = await falRes.json();
  const image_url = falData?.images?.[0]?.url || falData?.image?.url || null;
  if (!image_url) return res.status(500).json({ error: 'No image URL returned from fal.ai' });

  const raw = await redis.get(`content:${id}`);
  if (raw) {
    const item = typeof raw === 'string' ? JSON.parse(raw) : raw;
    item.image_url = image_url;
    await redis.set(`content:${id}`, JSON.stringify(item));
  }

  return res.status(200).json({ image_url });
}
