import { loadSkill } from './_lib/skills.js';

// GET /api/skills?file=Twitter_Post_SKILL.md
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { file } = req.query;
  if (!file) return res.status(400).json({ error: 'Missing file param' });
  try {
    const content = await loadSkill(file);
    return res.status(200).json({ content });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
