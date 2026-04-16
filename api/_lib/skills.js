import { redis } from './redis.js';

const CACHE_TTL = 3600;
const OWNER = process.env.GITHUB_REPO_OWNER || 'dante-labs';
const REPO  = process.env.GITHUB_REPO_NAME  || 'dante-labs-website';
const SKILLS_PATH = 'Documentation/05_Operations/Content_Factory/skills';

/**
 * Load a skill file.
 * @param {string} filenameOrPath - filename like 'Blog_Post_SKILL.md', OR full repo path when fullPath=true
 * @param {boolean} fullPath - if true, use filenameOrPath as a complete repo path
 */
export async function loadSkill(filenameOrPath, fullPath = false) {
  const repoPath = fullPath ? filenameOrPath : `${SKILLS_PATH}/${filenameOrPath}`;
  const cacheKey = `skill:${repoPath.replace(/\//g, '_')}`;

  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${repoPath}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3.raw',
    },
  });
  if (!res.ok) throw new Error(`Failed to load skill ${repoPath}: ${res.status}`);
  const text = await res.text();
  await redis.setex(cacheKey, CACHE_TTL, text);
  return text;
}
