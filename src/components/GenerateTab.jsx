import { useState } from 'react';
import { CONTENT_TYPE_LABELS, TWITTER_FORMATS, EMAIL_TYPES, AD_PLATFORMS, AD_PRODUCTS, BLOG_TYPES } from '../lib/skills.js';

const PATIENT_STORIES = {
  john_doe: "John (42) had unexplained chest pains for years. Standard cardiac panels showed nothing. Dante WGS identified a rare MYBPC3 variant associated with Hypertrophic Cardiomyopathy, changing his entire clinical management.",
  jane_smith: "Jane (34) watched her mother and aunt battle breast cancer. Her standard BRCA1/2 panel was negative. Dante WGS sequenced all 20,000 genes and found a pathogenic variant in PALB2, giving her the answer she needed for preventative care.",
  michael_t: "Michael (6) suffered from unexplained seizures and developmental delays. His diagnostic odyssey lasted 4 years. Dante WGS finally pinpointed a de novo SCN1A variant, ending the search and unlocking specific therapies.",
  sarah_l: "Sarah (55) had early-onset cognitive decline symptoms. Standard tests were inconclusive. Dante WGS identified an APOE e4/e4 genotype, allowing her to enroll in targeted clinical trials immediately.",
  david_w: "David (28) is a healthy athlete who wanted a proactive baseline. Dante WGS uncovered an elevated risk for Familial Hypercholesterolemia (FH) despite his perfect diet. He is now managing it before any plaque buildup occurs."
};

const CONTENT_TYPES = [
  { id: 'webpage', label: 'Webpage', title: 'Generate structural SEO or Campaign webpages' },
  { id: 'twitter', label: 'Twitter/X Post', title: 'Generate high-performance X threads or single posts' },
  { id: 'facebook', label: 'Facebook', title: 'Generate Facebook timeline posts' },
  { id: 'reddit', label: 'Reddit', title: 'Generate highly customized Reddit posts for specific communities' },
  { id: 'linkedin', label: 'LinkedIn', title: 'Generate professional thought-leadership posts' },
  { id: 'instagram', label: 'Instagram', title: 'Generate robust IG captions and visual prompts' },
  { id: 'email', label: 'Email Campaign', title: 'Generate CRM lifecycle and newsletter emails' },
  { id: 'ad_copy', label: 'Ads', title: 'Generate 3 Meta and Google Ads variants simultaneously' },
  { id: 'insight_bundle', label: '360° Content', title: 'Generate a full stack campaign matching Dante trends' },
  { id: 'media', label: 'Standalone image/video', title: 'Generate naked Fal API visual assets without copy' },
];

export default function GenerateTab({ onGenerated }) {
  const [contentType, setContentType] = useState('');

  // Shared topic
  const [topic, setTopic] = useState('');

  // Common Context
  const [goal, setGoal] = useState('Educate and drive kit orders');
  const [targetAudience, setTargetAudience] = useState('Adults 30–60 with family history');

  const TARGET_AUDIENCES = [
    'Adults 30–60 with family history',
    'Proactive health optimizers',
    'Patients with undiagnosed symptoms',
    'Physicians and clinical specialists',
    'Broader wellness consumers'
  ];

  const GOALS = [
    'Educate and drive kit orders',
    'Build brand authority',
    'Generate engagement and community discussion',
    'Address medical skepticism'
  ];

  // Webpage Subtype
  const [webpageType, setWebpageType] = useState('landing_page');

  // Twitter
  const [format, setFormat] = useState('educational');

  // Media
  const [mediaType, setMediaType] = useState('photographic');
  const [mediaAnimation, setMediaAnimation] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] = useState('16:9');

  // Blog
  const [blogType, setBlogType] = useState('educational');
  const [patientStory, setPatientStory] = useState('john_doe'); // placeholder

  // Email
  const [emailType, setEmailType] = useState('newsletter');
  const [keyMessage, setKeyMessage] = useState('');

  // Ads
  const [adPlatform, setAdPlatform] = useState('google');
  const [campaignObjective, setCampaignObjective] = useState('');
  const [product, setProduct] = useState('WGS');

  const [generating, setGenerating] = useState(false);

  async function generate(payload) {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'manual', ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      onGenerated(data.item);
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleGenerate() {
    const basePayload = { target_audience: targetAudience.trim(), goal: goal.trim() };

    if (contentType === 'webpage') {
      if (!topic.trim()) { alert('Please enter a topic.'); return; }
      generate({ ...basePayload, content_type: webpageType, topic: topic.trim(), blog_type: blogType, patient_story: blogType === 'patient_story' ? PATIENT_STORIES[patientStory] : undefined });
    } else if (['twitter', 'facebook', 'reddit', 'linkedin', 'instagram'].includes(contentType)) {
      if (!topic.trim()) { alert('Please enter a topic.'); return; }
      generate({ ...basePayload, content_type: contentType, topic: topic.trim(), format: contentType === 'twitter' ? format : undefined });
    } else if (contentType === 'email') {
      if (!keyMessage.trim()) { alert('Please enter a key message.'); return; }
      generate({ ...basePayload, content_type: 'email', topic: keyMessage.trim(), email_type: emailType });
    } else if (contentType === 'insight_bundle') {
      if (!topic.trim()) { alert('Please enter a trend/topic.'); return; }
      generate({ ...basePayload, content_type: 'insight_bundle', topic: topic.trim() });
    } else if (contentType === 'ad_copy') {
      if (!campaignObjective.trim()) { alert('Please enter a campaign objective.'); return; }
      generate({ ...basePayload, content_type: 'ad_copy', topic: campaignObjective.trim(), ad_platform: adPlatform, campaign_objective: campaignObjective.trim(), product });
    } else if (contentType === 'media') {
      if (!topic.trim()) { alert('Please enter a visual description.'); return; }
      generate({ ...basePayload, content_type: 'media', topic: topic.trim(), media_type: mediaType, is_animated: mediaAnimation, aspect_ratio: mediaAspectRatio });
    }
  }

  return (
    <div>
      <div className="page-title">Generate Content</div>

      <div className="card" style={{ maxWidth: '700px' }}>
        <div className="editor-section-title" style={{ marginBottom: '14px' }}>Content Type</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {CONTENT_TYPES.map((ct) => (
            <button key={ct.id} onClick={() => setContentType(ct.id)} className="btn"
              title={ct.title}
              style={{
                background: contentType === ct.id ? 'var(--ink)' : 'transparent',
                color: contentType === ct.id ? '#fff' : 'var(--ink)',
                border: `1px solid ${contentType === ct.id ? 'var(--ink)' : 'var(--border)'}`,
              }}
            >
              {ct.label}
            </button>
          ))}
        </div>

        {/* ── Global Context (Target & Goal) ── */}
        {contentType !== 'media' && (
          <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="field-label">Target Audience</label>
              <select className="field-input" style={{ maxWidth: '600px', cursor: 'pointer' }}
                value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}
              >
                {TARGET_AUDIENCES.map(aud => <option key={aud} value={aud}>{aud}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Goal</label>
              <select className="field-input" style={{ maxWidth: '600px', cursor: 'pointer' }}
                value={goal} onChange={(e) => setGoal(e.target.value)}
              >
                {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
        )}

        <div style={{ height: '1px', background: 'var(--border)', margin: '24px 0' }}></div>

        {/* ── Webpage ── */}
        {contentType === 'webpage' && (
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="field-label">Webpage Type</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['landing_page', 'condition_page', 'blog'].map((type) => (
                  <button key={type} onClick={() => setWebpageType(type)} className="btn btn-sm"
                    style={{
                      background: webpageType === type ? 'var(--ink)' : 'transparent',
                      color: webpageType === type ? '#fff' : 'var(--text)',
                      border: `1px solid ${webpageType === type ? 'var(--ink)' : 'var(--border)'}`,
                    }}
                  >
                    {type === 'landing_page' ? 'Landing Page' : type === 'condition_page' ? 'Condition Page' : 'Blog Post'}
                  </button>
                ))}
              </div>
            </div>

            {webpageType === 'blog' && (
              <div>
                <label className="field-label">Blog Post Type</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {BLOG_TYPES.map((t) => (
                    <button key={t.value} onClick={() => setBlogType(t.value)} className="btn btn-sm"
                      title={t.description}
                      style={{
                        background: blogType === t.value ? 'var(--ink)' : 'transparent',
                        color: blogType === t.value ? '#fff' : 'var(--text)',
                        border: `1px solid ${blogType === t.value ? 'var(--ink)' : 'var(--border)'}`,
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {webpageType === 'blog' && blogType === 'patient_story' && (
              <div>
                 <label className="field-label">Select Patient Story</label>
                 <select className="field-input" style={{ maxWidth: '600px' }} value={patientStory} onChange={(e) => setPatientStory(e.target.value)}>
                    <option value="john_doe">John Doe (Cardiology)</option>
                    <option value="jane_smith">Jane Smith (Oncology)</option>
                    <option value="michael_t">Michael T. (Rare Disease)</option>
                    <option value="sarah_l">Sarah L. (Neurology)</option>
                    <option value="david_w">David W. (Wellness)</option>
                 </select>
              </div>
            )}

            <div>
              <label className="field-label">{webpageType === 'condition_page' ? 'Condition Focus' : 'Page Topic'}</label>
              <input className="field-input" style={{ maxWidth: '600px' }}
                placeholder="e.g. MTHFR Gene Mutations and Diet"
                value={topic} onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
          </div>
        )}

        {/* ── Social Media (Twitter, Meta, etc) ── */}
        {['twitter', 'facebook', 'reddit', 'linkedin', 'instagram'].includes(contentType) && (
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {contentType === 'twitter' && (
              <div>
                <label className="field-label">Twitter Format</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {TWITTER_FORMATS.map((f) => (
                    <button key={f.value} onClick={() => setFormat(f.value)} className="btn btn-sm"
                      title={f.description}
                      style={{
                        background: format === f.value ? 'var(--accent)' : 'transparent',
                        color: format === f.value ? '#fff' : 'var(--text)',
                        border: `1px solid ${format === f.value ? 'var(--accent)' : 'var(--border)'}`,
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="field-label">Core Topic / Angle</label>
              <input className="field-input" style={{ maxWidth: '600px' }}
                placeholder="e.g. Why whole genome sequencing finds what panels miss"
                value={topic} onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
          </div>
        )}

        {/* ── Email ── */}
        {contentType === 'email' && (
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="field-label">Campaign Type</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {EMAIL_TYPES.map((t) => (
                  <button key={t.value} onClick={() => setEmailType(t.value)} className="btn btn-sm"
                    title={t.description}
                    style={{
                      background: emailType === t.value ? 'var(--ink)' : 'transparent',
                      color: emailType === t.value ? '#fff' : 'var(--text)',
                      border: `1px solid ${emailType === t.value ? 'var(--ink)' : 'var(--border)'}`,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Key Message</label>
              <input className="field-input" style={{ maxWidth: '600px' }}
                placeholder="e.g. WGS reveals what targeted panels miss — act on family risk now"
                value={keyMessage} onChange={(e) => setKeyMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
          </div>
        )}

        {/* ── Ads ── */}
        {contentType === 'ad_copy' && (
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="field-label">Platform</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {AD_PLATFORMS.map((p) => (
                  <button key={p.value} onClick={() => setAdPlatform(p.value)} className="btn btn-sm"
                    style={{
                      background: adPlatform === p.value ? 'var(--ink)' : 'transparent',
                      color: adPlatform === p.value ? '#fff' : 'var(--text)',
                      border: `1px solid ${adPlatform === p.value ? 'var(--ink)' : 'var(--border)'}`,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Product</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {AD_PRODUCTS.map((p) => (
                  <button key={p.value} onClick={() => setProduct(p.value)} className="btn btn-sm"
                    style={{
                      background: product === p.value ? 'var(--ink)' : 'transparent',
                      color: product === p.value ? '#fff' : 'var(--text)',
                      border: `1px solid ${product === p.value ? 'var(--ink)' : 'var(--border)'}`,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Campaign Objective</label>
              <input className="field-input" style={{ maxWidth: '600px' }}
                placeholder="e.g. Drive WGS test orders from people with family cancer history"
                value={campaignObjective} onChange={(e) => setCampaignObjective(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── Insight Bundle ── */}
        {contentType === 'insight_bundle' && (
          <div style={{ marginBottom: '16px' }}>
            <label className="field-label">Trend / Subject Topic</label>
            <input className="field-input" style={{ maxWidth: '600px' }}
              placeholder="e.g. MTHFR Gene Mutations and Diet"
              value={topic} onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
          </div>
        )}

        {/* ── Standalone Media ── */}
        {contentType === 'media' && (
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="field-label">Image Style</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[{value:'photographic', label:'Photographic'}, {value:'product_focused', label:'Product Focused'}, {value:'pattern', label:'Brand Logo/Pattern'}].map((t) => (
                  <button key={t.value} onClick={() => setMediaType(t.value)} className="btn btn-sm"
                    style={{
                      background: mediaType === t.value ? 'var(--ink)' : 'transparent',
                      color: mediaType === t.value ? '#fff' : 'var(--text)',
                      border: `1px solid ${mediaType === t.value ? 'var(--ink)' : 'var(--border)'}`,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Aspect Ratio</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['16:9', '1:1', '4:5', '9:16'].map((r) => (
                  <button key={r} onClick={() => setMediaAspectRatio(r)} className="btn btn-sm"
                    style={{
                      background: mediaAspectRatio === r ? 'var(--ink)' : 'transparent',
                      color: mediaAspectRatio === r ? '#fff' : 'var(--text)',
                      border: `1px solid ${mediaAspectRatio === r ? 'var(--ink)' : 'var(--border)'}`,
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', color: 'var(--text)' }}>
              <input type="checkbox" checked={mediaAnimation} onChange={(e) => setMediaAnimation(e.target.checked)} />
              Animate final output (Video)
            </label>
            <div>
              <label className="field-label">Visual Description / Brief</label>
              <input className="field-input" style={{ maxWidth: '600px' }}
                placeholder="e.g. A woman holding our test kit looking concerned in a modern kitchen"
                value={topic} onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
          </div>
        )}

        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || !contentType} style={{ minWidth: '140px' }}>
          {generating
            ? <><span className="spinner-dark" /> Generating…</>
            : !contentType ? 'Generate' : `Generate ${CONTENT_TYPE_LABELS[contentType]}`}
        </button>
      </div>
    </div>
  );
}
