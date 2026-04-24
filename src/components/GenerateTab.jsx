import { useState } from 'react';
import { CONTENT_TYPE_LABELS, TWITTER_FORMATS, EMAIL_TYPES, AD_PLATFORMS, AD_PRODUCTS, BLOG_TYPES } from '../lib/skills.js';

export default function GenerateTab({ onGenerated }) {
  const [contentType, setContentType] = useState('landing_page');

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

  // Ad Copy
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
      generate({ ...basePayload, content_type: webpageType, topic: topic.trim(), blog_type: blogType, patient_story: blogType === 'patient_story' ? patientStory : undefined });
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
          {Object.entries(CONTENT_TYPE_LABELS).map(([type, label]) => (
            <button key={type} onClick={() => setContentType(type)} className="btn"
              style={{
                background: contentType === type ? 'var(--ink)' : 'transparent',
                color: contentType === type ? '#fff' : 'var(--ink)',
                border: `1px solid ${contentType === type ? 'var(--ink)' : 'var(--border)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Global Context (Target & Goal) ── */}
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
                      background: product === p.value ? 'var(--accent)' : 'transparent',
                      color: product === p.value ? '#fff' : 'var(--text)',
                      border: `1px solid ${product === p.value ? 'var(--accent)' : 'var(--border)'}`,
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

        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating} style={{ minWidth: '140px' }}>
          {generating
            ? <><span className="spinner-dark" /> Generating…</>
            : `Generate ${CONTENT_TYPE_LABELS[contentType]}`}
        </button>
      </div>
    </div>
  );
}
