import { connect } from "framer-api";
import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.FRAMER_API_KEY || !process.env.FRAMER_PROJECT_URL) {
    return res.status(503).json({
      error: "Framer integration not configured. Use Export JSON until CMS is confirmed live.",
      pending: true,
    });
  }

  const { pageId, payload } = req.body;
  if (!payload) {
    return res.status(400).json({ error: "payload required" });
  }

  try {
    const framer = await connect(
      process.env.FRAMER_PROJECT_URL,
      process.env.FRAMER_API_KEY
    );

    const collections = await framer.getCollections();
    const collection = collections.find((c) => c.slug === "condition-pages");

    if (!collection) {
      await framer.disconnect();
      return res.status(404).json({
        error: "Framer collection 'condition-pages' not found. Check CMS setup.",
      });
    }

    await collection.addItems([{ ...payload, published: false }]);
    await framer.disconnect();

    if (pageId) {
      const key = "page:" + payload.condition_slug;
      const existing = await kv.get(key);
      if (existing) {
        const record = typeof existing === "string" ? JSON.parse(existing) : existing;
        await kv.set(
          key,
          JSON.stringify({
            ...record,
            published: true,
            publishedAt: new Date().toISOString(),
          })
        );
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Framer publish error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}