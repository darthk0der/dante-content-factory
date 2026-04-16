import { useState } from 'react';
import { CONDITIONS } from '../data/conditions.js';
import { CONTENT_TYPE_LABELS, TWITTER_FORMATS, EMAIL_TYPES, AD_PLATFORMS, AD_PRODUCTS } from '../lib/skills.js';

export default function GenerateTab({ onGenerated, items = [] }) {
  const [contentType, setContentType] = useState('landing_page');

  // Shared
  const [topic, setTopic] = useState('');

  // Landing page
  const [useConditionList, setUseConditionList] = useState(true);
  const [selectedConditionId, setSelectedConditionId] = useState('');

  // Twitter
  const [format, setFormat] = useState('educational');

  // Email
  const [emailType, setEmailType] = useState('newsletter');
  const [keyMessage, setKeyMessage] = useState('');

  // Ad Copy
  const [adPlatform, setAdPlatform] = useState('google');
  const [campaignObjective, setCampaignObjective] = useState('');
  const [product, setProduct] = useState('WGS');
  const [targetAudience, setTargetAudience] = useState('');

  const [generating, setGenerating] = useState(null); // topic string or true

  async function generate(payload) {
    if (generating) return;
    setGenerating(payload.topicKey || true);
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
      setGenerating(null);
    }
  }

  function handleGenerate() {
    if (contentType === 'landing_page') {
      let topicName = '';
      if (useConditionList) {
        const found = CONDITIONS.find((c) => c.id === Number(selectedConditionId));
        if (!found) { alert('Please select a condition.'); return; }
        topicName = found.name;
      } else {
        if (!topic.trim()) { alert('Please enter a topic.'); return; }
        topicName = topic.trim();
      }
      generate({ content_type: 'landing_page', topic: topicName, topicKey: topicName });
    } else if (contentType === 'blog') {
      if (!topic.trim()) { alert('Please enter a topic.'); return; }
      generate({ content_type: 'blog', topic: topic.trim(), topicKey: topic.trim() });
    } else if (contentType === 'twitter') {
      if (!topic.trim()) { alert('Please enter a topic.'); return; }
      generate({ content_type: 'twitter', topic: topic.trim(), format, topicKey: topic.trim() });
    } else if (contentType === 'email') {
      if (!keyMessage.trim()) { alert('Please enter a key message.'); return; }
      generate({ content_type: 'email', topic: keyMessage.trim(), email_type: emailType, topicKey: keyMessage.trim() });
    } else if (contentType === 'ad_copy') {
      if (!campaignObjective.trim()) { alert('Please enter a campaign objective.'); return; }
      generate({
        content_type: 'ad_copy',
        topic: campaignObjective.trim(),
        ad_platform: adPlatform,
        campaign_objective: campaignObjective.trim(),
        product,
        target_audience: targetAudience.trim(),
        topicKey: campaignObjective.trim(),
      });
    }
  }

  const isGenerating = !!generating;

  // Build status map for condition table badges
  const generatedMap = {};
  for (const item of items) {
    if (item.content_type !== 'landing_page') continue;
    const name = item.topic?.toLowerCase();
    if (!name) continue;
    const rank = { published: 3, approved: 2, review: 1 };
    const prev = generatedMap[name];
    if (!prev || (rank[item.status] || 0) > (rank[prev] || 0)) {
      generatedMap[name] = item.status;
    }
  }

  return (
    <div>
      <div className="page-title">Generate Content</div>

      {/* Content type selector */}
      <div className="card" style={{ marginBottom: '20px', maxWidth: '700px' }}>
        <div className="editor-section-title" style={{ marginBottom: '14px' }}>Content Type</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {Object.entries(CONTENT_TYPE_LABELS).map(([type, label]) => (
            <button
              key={type}
              onClick={() => setContentType(type)}
              className="btn"
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
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {[true, false].map((v) => (
                <button key={String(v)} className="btn btn-sm"
                  onClick={() => setUseConditionList(v)}
                  style={{
                    background: useConditionList === v ? 'var(--ink)' : 'transparent',
                    color: useConditionList === v ? '#fff' : 'var(--text)',
                    border: `1px solid ${useConditionList === v ? 'var(--ink)' : 'var(--border)'}`,
                  }}
                >
                  {v ? 'Top-50 list' : 'Free text'}
                </button>
              ))}
            </div>
            {useConditionList ? (
              <>
                <label className="field-label">Condition</label>
                <select className="field-input" style={{ maxWidth: '480px' }}
                  value={selectedConditionId} onChange={(e) => setSelectedConditionId(e.target.value)}
                >
                  <option value="">Select a condition…</option>
                  {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </>
            ) : (
              <>
                <label className="field-label">Condition / Topic</label>
                <input className="field-input" style={{ maxWidth: '480px' }}
                  placeholder="e.g. Autosomal Recessive Spastic Ataxia of Charlevoix-Saguenay"
                  value={topic} onChange={(e) => setTopic(e.target.value)}
                />
              </>
            )}
          </div>
        )}

        {/* ── Blog / Twitter topic ── */}
        {(contentType === 'blog' || contentType === 'twitter') && (
          <div style={{ marginBottom: '16px' }}>
            {contentType === 'twitter' && (
              <div style={{ marginBottom: '16px' }}>
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
            )}
            <label className="field-label">Topic</label>
            <input className="field-input" style={{ maxWidth: '480px' }}
              placeholder={contentType === 'twitter'
                ? 'e.g. Why whole genome sequencing finds what panels miss'
                : 'e.g. What hereditary cancer risk really means for families'}
              value={topic} onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
          </div>
        )}

        {/* ── Email Campaign ── */}
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

        <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating} style={{ minWidth: '140px' }}>
          {isGenerating
            ? <><span className="spinner-dark" /> Generating…</>
            : `Generate ${CONTENT_TYPE_LABELS[contentType]}`}
        </button>
      </div>

      {/* Top-50 condition quick-generate table (landing page only) */}
      {contentType === 'landing_page' && (
        <div className="card">
          <div className="editor-section-title" style={{ marginBottom: '12px' }}>
            Top 50 Conditions — Quick Generate
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Condition</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {CONDITIONS.map((c) => {
                const status = generatedMap[c.name.toLowerCase()];
                return (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--muted)', width: '36px' }}>{c.id}</td>
                    <td>
                      <span style={{ marginRight: '8px' }}>{c.name}</span>
                      {status && <span className={`badge badge-${status}`}>{status}</span>}
                    </td>
                    <td style={{ width: '130px', textAlign: 'right' }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => generate({ content_type: 'landing_page', topic: c.name, topicKey: c.name })}
                        disabled={isGenerating}
                      >
                        {generating === c.name
                          ? <><span className="spinner-light" /> Generating…</>
                          : status ? 'Regenerate' : 'Generate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
