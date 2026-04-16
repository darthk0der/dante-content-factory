const AHREFS_API_URL = 'https://api.ahrefs.com/v3';

async function fetchAhrefs(endpoint, queryParams) {
  const apiKey = process.env.AHREFS_API_KEY;
  if (!apiKey) {
    throw new Error('AHREFS_API_KEY is missing');
  }

  const url = new URL(`${AHREFS_API_URL}${endpoint}`);
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.append(key, value);
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ahrefs API error ${res.status}: ${errText}`);
  }

  return res.json();
}

export async function getMatchingTerms(keywords) {
  const queryWords = Array.isArray(keywords) ? keywords.join(',') : keywords;
  const filter = {
      "and": [
        { "field": "volume", "is": ["gte", 100] },
        { "field": "difficulty", "is": ["lte", 40] },
        { "field": "word_count", "is": ["gte", 3] }
      ]
  };

  return fetchAhrefs('/keywords-explorer/matching-terms', {
    country: 'us',
    select: 'keyword,volume,difficulty,traffic_potential',
    order_by: 'volume:desc',
    limit: 200,
    keywords: queryWords,
    where: JSON.stringify(filter)
  });
}

export async function getVolumeHistory(keyword) {
  // Volume History endpoint for baseline comparison
  return fetchAhrefs('/keywords-explorer/volume-history', {
    country: 'us',
    keyword: keyword
  });
}
