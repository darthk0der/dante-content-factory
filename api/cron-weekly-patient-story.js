import { redis } from './_lib/redis.js';

// Temporary mock bank of patient stories
const PATIENT_STORIES = [
  {
    author: "Sarah M.",
    condition: "Ehlers-Danlos Syndrome",
    story: "For 15 years, doctors told me my joint pain was psychosomatic. I was given anti-anxiety meds instead of a diagnosis. It wasn't until I got a 30x whole genome sequencing test that the COL5A1 mutation was found. Finally having the classical EDS diagnosis changed my treatment plan entirely and validated my reality."
  },
  {
    author: "David R.",
    condition: "Hypertrophic Cardiomyopathy",
    story: "My dad passed away suddenly at 45. Standard cardiac panels found nothing for me. But after I did WGS, they found a rare intronic MYBPC3 variant that standard panels missed. I'm now on beta blockers and living a normal life, but I think about how close I was to missing this."
  },
  {
    author: "Elena G.",
    condition: "Pharmacogenomics / Unknown Odyssey",
    story: "I had severe adverse reactions to almost every SSRI I tried. WGS showed I am a CYP2D6 poor metabolizer. If I had known this 10 years ago, I could have avoided a decade of 'trial and error' psychiatry."
  }
];

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const authHeader = req.headers.authorization || '';
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Pick a random story
  const storyObj = PATIENT_STORIES[Math.floor(Math.random() * PATIENT_STORIES.length)];

  // Generate a Twitter thread
  const systemPrompt = `You are the content generation engine for Dante Labs. 
Generate a compelling, empathetic Twitter Thread (max 5 tweets) telling this patient's story.
Focus on the diagnostic odyssey and how Whole Genome Sequencing (WGS) provided the answer when standard panels failed.
Do NOT use exclamation points or make diagnostic claims.
Return ONLY valid JSON matching this schema:
{
  "text": "The full text of the twitter thread",
  "image_prompt": "A highly cinematic, photorealistic 8k raw photo, shot on Sony A7R IV, natural light. It should be a real lifestyle scene of a patient managing their health."
}`;

  const userPrompt = `Patient: ${storyObj.author}\nCondition: ${storyObj.condition}\nStory: ${storyObj.story}`;

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
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const anthropicData = await anthropicRes.json();
    if (!anthropicRes.ok) throw new Error(anthropicData.error?.message || 'Anthropic API failed');
    
    const fullText = anthropicData.content?.[0]?.text || '';
    const match = fullText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = (match ? match[1] : fullText).trim();
    const parsed = JSON.parse(raw);

    const id = `content-${Date.now()}`;
    const item = {
      id,
      content_type: 'twitter',
      source: 'patient_story_cron',
      topic: `Patient Story: ${storyObj.condition}`,
      slug: `patient-story-${Date.now()}`,
      format: 'story_led',
      generated_at: new Date().toISOString(),
      status: 'review',
      trigger: 'Weekly Patient Story Cron',
      content: { text: parsed.text || raw, format: 'story_led' },
      image_prompt: parsed.image_prompt,
      flags: [],
      qa_status: 'READY_FOR_REVIEW'
    };

    // Auto generate image
    if (process.env.FAL_API_KEY && item.image_prompt) {
      try {
        const falRes = await fetch(`https://fal.run/fal-ai/flux/schnell`, {
          method: 'POST',
          headers: { Authorization: `Key ${process.env.FAL_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: item.image_prompt, image_size: 'landscape_16_9', num_images: 1 }),
        });
        if (falRes.ok) {
          const falData = await falRes.json();
          const imageUrl = falData?.images?.[0]?.url || falData?.image?.url || null;
          if (imageUrl) item.image_url = imageUrl;
        }
      } catch(e) {}
    }

    await redis.set(`content:${item.id}`, JSON.stringify(item));
    await redis.lpush('content:index', item.id);

    return res.status(200).json({ success: true, item });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
