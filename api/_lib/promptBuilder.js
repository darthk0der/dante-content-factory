export const SKILL_MAP = {
  twitter:        'Twitter_Post_SKILL.md',
  facebook:       'Facebook_Post_SKILL.md',
  linkedin:       'LinkedIn_Post_SKILL.md',
  instagram:      'Instagram_Post_SKILL.md',
  reddit:         'Reddit_Post_SKILL.md',
  blog:           'Blog_Post_SKILL.md',
  landing_page:   'Landing_Page_Sections_SKILL.md',
  condition_page: 'Condition_Page_SKILL.md',
  email:          'Email_SKILL.md',
};

export const MAX_TOKENS = {
  twitter:      1500,
  blog:         8000,
  landing_page: 8000,
  email:        4000,
  ad_copy:      3000,
};

export const PHOTO_PROMPT = "The image_prompt field MUST describe a highly cinematic, photorealistic 8k raw photo, shot on Sony A7R IV, natural light. It should be a real lifestyle scene (e.g. a family, a patient, a doctor). NEVER depict hands in isolation. NEVER depict laboratory equipment or test tubes. Must look like high-end editorial photography.";

export function buildUserPrompt(body) {
  const { content_type, topic, format, email_type, ad_platform, campaign_objective, product, target_audience, goal, blog_type, patient_story } = body;

  const targetStr = target_audience ? `\nTarget Audience: ${target_audience}` : '';
  const goalStr = goal ? `\nGoal: ${goal}` : '';
  const globalContext = targetStr || goalStr ? `\n---CONTEXT---${targetStr}${goalStr}\n-------------\n` : '';

  if (content_type === 'twitter') {
    return `Generate a Twitter/X post for Dante Labs about: ${topic}
Format: ${format || 'educational'}${globalContext}

${PHOTO_PROMPT}`;
  }

  if (content_type === 'blog') {
    return `Generate a blog post for Dante Labs about: ${topic}
Type of post: ${blog_type || 'Educational'}${blog_type === 'patient_story' ? `\nPatient Story Focus: ${patient_story || 'None'}` : ''}${globalContext}

Important: The hero_image_alt field must be a descriptive alt text for the hero image. Do not leave it empty.
${PHOTO_PROMPT}`;
  }

  if (content_type === 'landing_page') {
    return `Generate a promotional conversion landing page for Dante Labs for: ${topic}${globalContext}

${PHOTO_PROMPT}`;
  }

  if (content_type === 'condition_page') {
    return `Generate a comprehensive medical condition page for Dante Labs for: ${topic}${globalContext}

${PHOTO_PROMPT}`;
  }

  if (content_type === 'email') {
    const typeLabel = { newsletter: 'Newsletter', product_launch: 'Product Launch', re_engagement: 'Re-engagement', transactional: 'Transactional', informational: 'Informational' }[email_type] || email_type;
    return `Generate a Dante Labs ${typeLabel} email campaign.
Key message: ${topic}${globalContext}
${email_type === 'transactional' ? 'CRITICAL: This is a transactional/promotional email. It MUST be extremely short, punchy, and direct (max 2 short paragraphs).' : ''}

Return ONLY a valid JSON object — no markdown, no code fences, no explanation. Use this exact schema:
{
  "subject": "A compelling subject line (max 60 chars)",
  "preview_text": "Preview text shown in inbox (max 90 chars)",
  "headline": "Main email headline",
  "body_html": "<p>First paragraph of email body.</p><p>Second paragraph.</p><p>Third paragraph.</p>",
  "cta_text": "CTA button label",
  "cta_url": "https://dantelabs.com/genome/"
}

Rules:
- body_html must be real HTML — use <p>, <strong>, <ul>, <li> tags. No raw newlines (\\n). No placeholder text.
- subject and preview_text must be actual compelling copy, not empty.
- No exclamation points. No diagnostic claims. No competitor mentions.
- Write from Dante Labs brand voice: clear, scientific, empathetic.`;
  }

  if (content_type === 'ad_copy') {
    if (ad_platform === 'meta') {
      return `Generate Meta (Facebook/Instagram) ad copy for Dante Labs.
Campaign objective: ${campaign_objective || topic}
Product: ${product || 'WGS'}
Target audience: ${target_audience || 'adults concerned about hereditary health risk'}

Meta ads have a different format from Google. Return ONLY a valid JSON object — no markdown, no code fences.
Use this exact schema:
{
  "platform": "meta",
  "campaign_objective": "${campaign_objective || topic}",
  "variants": [
    {
      "variant_focus": "Benefit-led",
      "primary_text": "Main ad body copy shown in feed (max 125 chars). Hook the reader in the first line.",
      "headline": "Bold headline under the image (max 40 chars)",
      "description": "Supporting line under headline (max 30 chars)",
      "cta_button": "Learn More"
    },
    {
      "variant_focus": "Problem-aware",
      "primary_text": "Opens with the problem/pain point the audience feels (max 125 chars)",
      "headline": "Bold headline under the image (max 40 chars)",
      "description": "Supporting line under headline (max 30 chars)",
      "cta_button": "Get Started"
    },
    {
      "variant_focus": "Social proof",
      "primary_text": "Opens with credibility/proof point (max 125 chars)",
      "headline": "Bold headline under the image (max 40 chars)",
      "description": "Supporting line under headline (max 30 chars)",
      "cta_button": "Find Out More"
    }
  ]
}

Rules: 
- Meta Ad Primary Text MUST NEVER exceed 125 characters. 
- Meta Ad Headlines MUST NEVER exceed 40 characters. Ensure all text falls strictly under these limits.
- No exclamation points. No diagnostic claims. No competitor mentions. Each variant must have a clearly different angle.
Also include a top-level "image_prompt" field describing the ideal ad image: ${product === 'WGS' ? 'A photorealistic lifestyle photo of a person holding or looking at the physical Dante Labs WGS testing kit box in a nice home setting.' : 'A lifestyle editorial photo of a real person or family relevant to the campaign objective.'} ${PHOTO_PROMPT}`;
    }

    // Google ads
    return `Generate Google Search ad copy for Dante Labs.
Campaign objective: ${campaign_objective || topic}
Product: ${product || 'WGS'}
Target audience: ${target_audience || 'adults with family history of genetic conditions'}

Return ONLY a valid JSON object — no markdown, no code fences.
Use this exact schema:
{
  "platform": "google",
  "campaign_objective": "${campaign_objective || topic}",
  "variants": [
    {
      "variant_focus": "Benefit-led",
      "headline_1": "Max 30 chars",
      "headline_2": "Max 30 chars",
      "headline_3": "Max 30 chars",
      "description_1": "Max 90 chars — benefit angle",
      "description_2": "Max 90 chars — supporting detail"
    },
    {
      "variant_focus": "Problem-aware",
      "headline_1": "Max 30 chars",
      "headline_2": "Max 30 chars",
      "headline_3": "Max 30 chars",
      "description_1": "Max 90 chars — problem/question angle",
      "description_2": "Max 90 chars — solution detail"
    },
    {
      "variant_focus": "Social proof",
      "headline_1": "Max 30 chars",
      "headline_2": "Max 30 chars",
      "headline_3": "Max 30 chars",
      "description_1": "Max 90 chars — credibility/proof angle",
      "description_2": "Max 90 chars — CTA detail"
    }
  ]
}

Rules: Enforce character limits strictly. No exclamation points. No diagnostic claims. Each variant must have a clearly different angle and approach.`;
  }

  if (['facebook', 'linkedin', 'instagram', 'reddit'].includes(content_type)) {
    return `Generate a ${content_type.charAt(0).toUpperCase() + content_type.slice(1)} post for Dante Labs.
Topic: ${topic}${globalContext}

Return ONLY a valid JSON object:
{
  "text": "The highly engaging copy tailored exactly to ${content_type}'s native audience behavior and algorithms",
  "image_prompt": "A prompt for a lifestyle image if needed, else empty"
}
${content_type === 'linkedin' ? '\nCRITICAL: NEVER use hashtags in LinkedIn posts under any circumstances.' : ''}`;
  }

  if (content_type === 'media') {
     return `You are a prompt engineering specialist. I want to generate a standalone image or video based on this brief: "${topic}".
Image Style requested: ${body.media_type || 'photographic'}
Is it going to be animated?: ${body.is_animated ? 'Yes' : 'No'}
Target Audience context: ${target_audience || 'None provided'}
Goal context: ${goal || 'None provided'}

Expand this into a highly cinematic, photorealistic 8k raw prompt (if photographic), or a sleek editorial design (if pattern/logo).
Return ONLY a valid JSON object:
{
  "image_prompt": "Your incredibly detailed image prompt here",
  "media_type": "${body.media_type}",
  "is_animated": ${body.is_animated}
}`;
  }

  return `Generate content about: ${topic}${globalContext}`;
}
