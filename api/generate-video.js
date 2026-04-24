import { redis } from './_lib/redis.js';

export const maxDuration = 300; // allow Vercel to wait for Kling Video Generation (up to 5m)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, image_url, prompt } = req.body;
  if (!id || !image_url) return res.status(400).json({ error: 'Missing id or image_url' });
  if (!process.env.FAL_API_KEY) return res.status(500).json({ error: 'FAL_API_KEY not configured' });

  try {
    const falRes = await fetch('https://fal.run/fal-ai/kling-video/v1/standard/image-to-video', {
      method: 'POST',
      headers: {
        Authorization: `Key ${process.env.FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url,
        prompt: prompt || 'Cinematic slow pan, beautiful lighting, subtle natural movement.',
        duration: "5",
        aspect_ratio: "16:9"
      }),
    });

    if (!falRes.ok) {
        const errData = await falRes.json().catch(() => ({}));
        return res.status(parseInt(falRes.status, 10)).json({ error: errData.detail || 'FAL Generation failed' });
    }

    const data = await falRes.json();
    const video_url = data?.video?.url || null;

    if (!video_url) {
      return res.status(500).json({ error: 'FAL returned no video URL' });
    }

    const raw = await redis.get(`content:${id}`);
    if (raw) {
      const item = JSON.parse(raw);
      item.video_url = video_url;
      await redis.set(`content:${item.id}`, JSON.stringify(item));
    }

    res.status(200).json({ video_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
