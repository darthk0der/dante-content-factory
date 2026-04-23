import { useState } from 'react';
import { CONTENT_TYPE_LABELS, TWITTER_FORMATS, EMAIL_TYPES, AD_PLATFORMS, AD_PRODUCTS, BLOG_TYPES } from '../lib/skills.js';

export default function GenerateTab({ onGenerated }) {
  const [contentType, setContentType] = useState('landing_page');

  // Shared topic
  const [topic, setTopic] = useState('');

  // Twitter
  const [format, setFormat] = useState('educational');

  // Blog
  const [blogType, setBlogType] = useState('educational');

  // Email
  const [emailType, setEmailType] = useState('newsletter');
  const [keyMessage, setKeyMessage] = useState('');

  // Ad Copy
  const [adPlatform, setAdPlatform] = useState('google');
  const [campaignObjective, setCampaignObjective] = useState('');
  const [product, setProduct] = useState('WGS');
  const [targetAudience, setTargetAudience] = useState('');

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
    if (contentType === 'landing_page') {
      if (!topic.trim()) { alert('Please enter a condition or topic.'); return; }
      generate({ content_type: 'landing_page', topic: topic.trim() });
    } else if (contentType === 'blog') {
      if (!topic.trim()) { alert('Please enter a topic.'); return; }
      generate({ content_type: 'blog', topic: topic.trim(), blog_type: blogType });
    } else if (contentType === 'condition_page') {
      if (!topic.trim()) { alert('Please enter a condition.'); return; }
      generate({ content_type: 'condition_page', topic: topic.trim() });
    } else if (contentType === 'twitter') {
      if (!topic.trim()) { alert('Please enter a topic.'); return; }
      generate({ content_type: 'twitter', topic: topic.trim(), format });
    } else if (contentType === 'email') {
      if (!keyMessage.trim()) { alert('Please enter a key message.'); return; }
      generate({ content_type: 'email', topic: keyMessage.trim(), email_type: emailType });
    } else if (contentType === 'insight_bundle') {
      if (!topic.trim()) { alert('Please enter a trend/topic.'); return; }
      generate({ content_type: 'insight_bundle', topic: topic.trim() });
    } else if (contentType === 'ad_copy') {
      if (!campaignObjective.trim()) { alert('Please enter a campaign objective.'); return; }
      generate({
        content_type: 'ad_copy',
        topic: campaignObjective.trim(),
        ad_platform: adPlatform,
        campaign_objective: campaignObjective.trim(),
        product,
        target_audience: targetAudience.trim(),
      });
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

        {/* ── Landing page ── */}
        {contentType === 'landing_page' && (
          <div style={{ marginBottom: '16px' }}>
            <label className="field-label">Condition / Topic</label>
            <input className="field-input" style={{ maxWidth: '480px' }}
              placeholder="e.g. Long QT Syndrome"
              value={topic} onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
          </div>
        )}

        {/* ── Condition Page ── */}
        {contentType === 'condition_page' && (
          <div style={{ marginBottom: '16px' }}>
            <label className="field-label">Condition</label>
            <input className="field-input" style={{ maxWidth: '480px' }}
              placeholder="e.g. Ehlers-Danlos Syndrome"
              value={topic} onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
          </div>
        )}

        {/* ── Insight Bundle ── */}
        {contentType === 'insight_bundle' && (
          <div style={{ marginBottom: '16px' }}>
            <label className="field-label">Trend / Spike Topic</label>
            <input className="field-input" style={{ maxWidth: '480px' }}
              placeholder="e.g. MTHFR Gene Mutations and Diet"
              value={topic} onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
          </div>
        )}

        {/* ── Blog ── */}
        {contentType === 'blog' && (
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="field-label">Post Type</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {BLOG_TYPES.map((t) => (
                  <button key={t.value} onClick={() => setBlogType(t.value)} className="btn btn-sm"
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
            <div>
              <label className="field-label">Topic / Story Focus</label>
              <input className="field-input" style={{ maxWidth: '480px' }}
                placeholder="e.g. What hereditary cancer risk really means for families"
                value={topic} onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
          </div>
        )}

        {/* ── Twitter ── */}
        {contentType === 'twitter' && (
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="field-label">Format</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {TWITTER_FORMATS.map((f) => (
                  <button key={f.value} onClick={() => setFormat(f.value)} className="btn btn-sm"
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
            <div>
              <label className="field-label">Topic</label>
              <input className="field-input" style={{ maxWidth: '480px' }}
                placeholder="e.g. Why whole genome sequencing finds what panels miss"
                value={topic} onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
          </div>
        )}

        {/* ── Email ── */}
        {contentType === 'email' && (
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="field-label">Campaign Type</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {EMAIL_TYPES.map((t) => (
                  <button key={t.value} onClick={() => setEmailType(t.value)} className="btn btn-sm"
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
              <input className="field-input" style={{ maxWidth: '480px' }}
                placeholder="e.g. WGS reveals what targeted panels miss — act on family risk now"
                value={keyMessage} onChange={(e) => setKeyMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
          </div>
        )}

        {/* ── Ad Copy ── */}
        {contentType === 'ad_copy' && (
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              <label className="field-label">Campaign Objective</label>
              <input className="field-input" style={{ maxWidth: '480px' }}
                placeholder="e.g. Drive WGS test orders from people with family cancer history"
                value={campaignObjective} onChange={(e) => setCampaignObjective(e.target.value)}
              />
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
              <label className="field-label">Target Audience</label>
              <input className="field-input" style={{ maxWidth: '480px' }}
                placeholder="e.g. Adults 30–60 with first-degree relatives with hereditary cancer"
                value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}
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
