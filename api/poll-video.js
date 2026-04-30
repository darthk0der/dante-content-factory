import { redis } from './_lib/redis.js';

import { verifyAuth } from './_lib/auth.js';

export default async function handler(req, res) {
    try {
        await verifyAuth(req);
    } catch (e) {
        return res.status(403).json({ error: 'Forbidden', message: e.message });
    }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id parameter' });

  try {
    const raw = await redis.get(`content:${id}`);
    if (!raw) return res.status(404).json({ error: 'Item not found' });

    const item = JSON.parse(raw);

    // If already generated, return early
    if (item.video_url) {
      return res.status(200).json({ status: 'COMPLETED', video_url: item.video_url });
    }

    if (!item.fal_request_id || !item.fal_status_url || !item.fal_response_url) {
      return res.status(400).json({ error: 'No active video generation request found for this item' });
    }

    if (!process.env.FAL_API_KEY) {
      return res.status(500).json({ error: 'FAL_API_KEY not configured' });
    }

    // 1. Check Status
    const statusRes = await fetch(item.fal_status_url, {
      method: 'GET',
      headers: {
        Authorization: `Key ${process.env.FAL_API_KEY}`,
      }
    });

    if (!statusRes.ok) {
       return res.status(502).json({ error: 'Failed to retrieve status from Fal' });
    }

    const statusData = await statusRes.json();

    if (statusData.status === 'FAILED' || statusData.status === 'ERROR') {
      item.video_url = null;
      delete item.fal_request_id;
      delete item.fal_status_url;
      delete item.fal_response_url;
      await redis.set(`content:${item.id}`, JSON.stringify(item));
      return res.status(500).json({ error: `Fal AI Generation Failed: ${statusData.error || statusData.detail || 'Unknown error'}` });
    }

    if (statusData.status === 'COMPLETED') {
      // 2. Fetch Result
      const resultRes = await fetch(item.fal_response_url, {
        method: 'GET',
        headers: { Authorization: `Key ${process.env.FAL_API_KEY}` }
      });
      
      const resultData = await resultRes.json();
      const video_url = resultData?.video?.url || null;

      if (video_url) {
        item.video_url = video_url;
        // Clean up Fal queue tracking fields
        delete item.fal_request_id;
        delete item.fal_status_url;
        delete item.fal_response_url;

        await redis.set(`content:${item.id}`, JSON.stringify(item));
        return res.status(200).json({ status: 'COMPLETED', video_url });
      } else {
        return res.status(500).json({ error: 'FAL completed but returned no video URL' });
      }
    }

    // Still in progress
    return res.status(200).json({ status: statusData.status || 'IN_PROGRESS' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
