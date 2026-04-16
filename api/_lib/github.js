const OWNER = process.env.GITHUB_REPO_OWNER || 'dante-labs';
const REPO  = process.env.GITHUB_REPO_NAME  || 'dante-labs-website';

/**
 * Fetch a file or directory from the GitHub API.
 * @param {string} path - e.g. "public/conditions"
 * @returns {Promise<Array|Object|null>} Array for dir, Object for file, null if 404
 */
export async function githubGet(path) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${path} failed: ${res.status}`);
  return res.json();
}

/**
 * Get all slugs from a given directory on github
 */
export async function getExistingSlugs(directory) {
  const items = await githubGet(directory);
  if (!items || !Array.isArray(items)) return [];
  // For directories like public/blog/slug/index.html -> the slug is the item name
  return items.filter(i => i.type === 'dir').map(i => i.name);
}
