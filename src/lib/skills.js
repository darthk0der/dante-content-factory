// Client-side helper — not used for loading skills (that's server-side only)
// Exposes skill filenames so the Generate tab can pass the right one to the API

export const SKILL_FILES = {
  twitter: 'Twitter_Post_SKILL.md',
  blog: 'Blog_Post_SKILL.md',
  landing_page: 'Landing_Page_Sections_SKILL.md',
};

export const CONTENT_TYPE_LABELS = {
  webpage: 'Webpage',
  twitter: 'Twitter/X Post',
  facebook: 'Facebook',
  reddit: 'Reddit',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  email: 'Email Campaign',
  ad_copy: 'Ads',
  insight_bundle: '360° Content',
  media: 'Standalone image/video',
};

export const CONTENT_TYPES = [
  { id: 'webpage', label: 'Webpage' },
  { id: 'twitter', label: 'Twitter/X Post' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'email', label: 'Email Campaign' },
  { id: 'ad_copy', label: 'Ads' },
  { id: 'insight_bundle', label: '360° Content' },
  { id: 'media', label: 'Standalone image/video' },
];

export const TWITTER_FORMATS = [
  { value: 'educational', label: 'Educational', description: 'One specific, verifiable clinical insight about the condition. Focus on precision and numbers.' },
  { value: 'story_led',   label: 'Story-Led', description: 'Focuses on patient reality and agency. Validating tone reflecting the personal journey.' },
  { value: 'awareness',   label: 'Awareness', description: 'Broader condition awareness or tied to a moment. Extends reach into communities without selling.' },
];

export const EMAIL_TYPES = [
  { value: 'newsletter',      label: 'Newsletter', description: 'Roundup of updates, content, and broader educational value.' },
  { value: 'informational',   label: 'Informational', description: 'Deep dive on a specific genetic condition or sequencing fact.' },
  { value: 'transactional',   label: 'Transactional', description: 'Direct response to user action (purchase, sign up).' },
  { value: 'product_launch',  label: 'Product Launch', description: 'Introducing a new DNA panel or platform functionality.' },
  { value: 're_engagement',   label: 'Re-engagement', description: 'Winning back inactive audiences with a proactive hook.' },
];

export const BLOG_TYPES = [
  { value: 'educational',     label: 'Educational', description: 'Clinical exploration of genetics and predictive health logic.' },
  { value: 'patient_story',   label: 'Patient Story', description: 'A narrative-driven format anchored by a core patient experience.' },
  { value: 'science_tech',    label: 'Science/Tech Breakdown', description: 'Explaining the mechanics behind 30x WGS or Dante platform tools.' },
  { value: 'company_update',  label: 'Company Update', description: 'High-level business, partnership, or PR announcements.' },
];

export const AD_PLATFORMS = [
  { value: 'google', label: 'Google' },
  { value: 'meta',   label: 'Meta' },
];

export const AD_PRODUCTS = [
  { value: 'WGS',      label: 'Whole Genome Sequencing' },
  { value: 'RNA',      label: 'RNA Sequencing' },
  { value: 'Oncology', label: 'Oncology Panel' },
];
