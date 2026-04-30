import { redis } from './_lib/redis.js';

import { verifyAuth } from './_lib/auth.js';

export default async function handler(req, res) {
    try {
        await verifyAuth(req);
    } catch (e) {
        return res.status(403).json({ error: 'Forbidden', message: e.message });
    }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const authHeader = req.headers.authorization || '';
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Only internal allowed
    if (!req.headers.host.includes('localhost')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { original, edited, type } = req.body;
  if (!original || !edited) return res.status(400).json({ error: 'Missing content' });

  const systemPrompt = `You are a brand voice analyst. The user has manually edited AI-generated content.
Compare the "Original AI Content" with the "Human Edited Content".
Identify EXACTLY 1 concise, actionable rule that the AI failed to follow, which the human corrected.
Focus on tone, formatting, length, or compliance. Ignore typos or minor factual corrections.
If the edit implies a stylistic preference, extract it as a directive rule.
Return ONLY valid JSON matching this schema:
{
  "rule": "Always do X instead of Y" // or null if the change was purely factual/minor
}`;

  const userPrompt = `Type: ${type}\n\nOriginal AI Content: ${JSON.stringify(original)}\n\nHuman Edited Content: ${JSON.stringify(edited)}`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) throw new Error(data.error?.message || 'Anthropic API failed');
    
    const fullText = data.content?.[0]?.text || '';
    const match = fullText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = (match ? match[1] : fullText).trim();
    const parsed = JSON.parse(raw);

    if (parsed.rule) {
      const formattedRule = `[Learned Rule for ${type}]: ${parsed.rule}`;
      // Max 10 rules to avoid context bloat
      await redis.lpush('content:global_rules', formattedRule);
      await redis.ltrim('content:global_rules', 0, 9);
    }

    return res.status(200).json({ extracted: parsed.rule });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
