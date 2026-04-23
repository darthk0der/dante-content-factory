// Client-side helper — not used for loading skills (that's server-side only)
// Exposes skill filenames so the Generate tab can pass the right one to the API

export const SKILL_FILES = {
  twitter: 'Twitter_Post_SKILL.md',
  blog: 'Blog_Post_SKILL.md',
  landing_page: 'Landing_Page_Sections_SKILL.md',
};

export const CONTENT_TYPE_LABELS = {
  landing_page: 'Landing Page',
  condition_page: 'Condition Page',
  blog: 'Blog Post',
  twitter: 'Twitter/X Post',
  email: 'Email Campaign',
  ad_copy: 'Ad Copy',
};

export const CONTENT_TYPES = [
  { id: 'landing_page', label: 'Landing Page' },
  { id: 'condition_page', label: 'Condition Page' },
  { id: 'blog', label: 'Blog Post' },
  { id: 'twitter', label: 'Twitter/X Post' },
  { id: 'email', label: 'Email Campaign' },
  { id: 'ad_copy', label: 'Ad Copy' },
  { id: 'insight_bundle', label: 'Trend Insight Bundle (8-piece)' },
];

export const TWITTER_FORMATS = [
  { value: 'educational', label: 'Educational' },
  { value: 'story_led',   label: 'Story-Led' },
  { value: 'awareness',   label: 'Awareness' },
];

export const EMAIL_TYPES = [
  { value: 'newsletter',      label: 'Newsletter' },
  { value: 'informational',   label: 'Informational' },
  { value: 'transactional',   label: 'Transactional' },
  { value: 'product_launch',  label: 'Product Launch' },
  { value: 're_engagement',   label: 'Re-engagement' },
];

export const BLOG_TYPES = [
  { value: 'educational',     label: 'Educational' },
  { value: 'patient_story',   label: 'Patient Story' },
  { value: 'science_tech',    label: 'Science/Tech Breakdown' },
  { value: 'company_update',  label: 'Company Update' },
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
