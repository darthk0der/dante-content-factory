import { Redis } from "@upstash/redis";
import { SCAFFOLD_PROMPT } from "../src/lib/scaffold.js";

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

import { verifyAuth } from './_lib/auth.js';

export default async function handler(req, res) {
    try {
        await verifyAuth(req);
    } catch (e) {
        return res.status(403).json({ error: 'Forbidden', message: e.message });
    }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { condition_name } = req.body;
  if (!condition_name) {
    return res.status(400).json({ error: "condition_name required" });
  }
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: SCAFFOLD_PROMPT,
        messages: [
          {
            role: "user",
            content: "Generate a landing page for: " + condition_name,
          },
        ],
      }),
    });

    const data = await response.json();
    const raw = (data.content && data.content[0] && data.content[0].text) || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const page = {
      id: "page-" + Date.now(),
      conditionName: condition_name,
      generatedAt: new Date().toISOString(),
      qa_status: "REQUIRES_REVISION",
      published: false,
      resolvedFlags: [],
      editedFields: {},
      ...parsed,
    };

    const key = "page:" + (page.condition_slug || Date.now());
    await kv.set(key, JSON.stringify(page));
    await kv.lpush("pages:queue", key);

    return res.status(200).json(page);
  } catch (err) {
    console.error("Generation error:", err);
    return res.status(500).json({ error: err.message });
  }
}