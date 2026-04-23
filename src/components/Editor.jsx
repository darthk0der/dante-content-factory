import { useState } from 'react';
import FlagsPanel from './FlagsPanel.jsx';
import PreviewPane from './PreviewPane.jsx';

// ── Shared field components ────────────────────────────────────────────────

function Field({ label, value, onChange, rows, type = 'text', hint }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {rows ? (
        <textarea className="field-input field-textarea" rows={rows}
          value={value || ''} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="field-input" type={type}
          value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>{hint}</div>}
    </div>
  );
}

function FieldGroup({ title, children }) {
  return (
    <div className="editor-section card" style={{ marginBottom: '16px' }}>
      <div className="editor-section-title" style={{ marginBottom: '14px' }}>{title}</div>
      <div className="editor-grid">{children}</div>
    </div>
  );
}

// ── Per-type field editors ─────────────────────────────────────────────────

function TwitterFields({ c, setField }) {
  return (
    <FieldGroup title="Tweet">
      <Field label="Text (≤280 chars)" value={c.text} onChange={(v) => setField('content.text', v)} rows={4} />
      <div style={{ fontSize: '12px', color: c.text?.length > 280 ? 'var(--danger)' : 'var(--muted)' }}>
        {c.text?.length || 0} / 280 characters
      </div>
      <Field label="Format" value={c.format} onChange={(v) => setField('content.format', v)} />
    </FieldGroup>
  );
}

function BlogFields({ c, setField }) {
  return (
    <>
      <FieldGroup title="Metadata">
        <Field label="Title" value={c.title} onChange={(v) => setField('content.title', v)} />
        <Field label="Meta description (≤155 chars)" value={c.meta_description} onChange={(v) => setField('content.meta_description', v)} />
        <Field label="Hero image alt text" value={c.hero_image_alt} onChange={(v) => setField('content.hero_image_alt', v)} />
      </FieldGroup>
      <FieldGroup title="Body">
        <Field label="Body HTML" value={c.body_html} onChange={(v) => setField('content.body_html', v)} rows={20} />
      </FieldGroup>
    </>
  );
}

function LandingFields({ c, setField }) {
  return (
    <>
      <FieldGroup title="SEO & Metadata">
        <Field label="Condition name" value={c.condition_name} onChange={(v) => setField('content.condition_name', v)} />
        <Field label="SEO title" value={c.seo_title} onChange={(v) => setField('content.seo_title', v)} />
        <Field label="SEO description (≤155 chars)" value={c.seo_description} onChange={(v) => setField('content.seo_description', v)} />
        <div className="editor-grid-2">
          <Field label="Condition category" value={c.condition_category} onChange={(v) => setField('content.condition_category', v)} />
          <Field label="Category label" value={c.category_label} onChange={(v) => setField('content.category_label', v)} />
        </div>
      </FieldGroup>
      <FieldGroup title="Hero">
        <Field label="Hero headline (H1)" value={c.hero_headline} onChange={(v) => setField('content.hero_headline', v)} />
        <Field label="Hero subhead" value={c.hero_subhead} onChange={(v) => setField('content.hero_subhead', v)} rows={2} />
      </FieldGroup>
      <FieldGroup title="About section">
        <Field label="About H2" value={c.about_h2} onChange={(v) => setField('content.about_h2', v)} />
        <Field label="Body paragraph 1" value={c.about_body_p1} onChange={(v) => setField('content.about_body_p1', v)} rows={3} />
        <Field label="Body paragraph 2" value={c.about_body_p2} onChange={(v) => setField('content.about_body_p2', v)} rows={3} />
        <Field label="Body paragraph 3 (optional)" value={c.about_body_p3} onChange={(v) => setField('content.about_body_p3', v)} rows={3} />
        <Field label="Subtype callout (optional)" value={c.about_subtype_callout} onChange={(v) => setField('content.about_subtype_callout', v)} rows={2} />
      </FieldGroup>
      <FieldGroup title="Why WGS section">
        <Field label="Why WGS H2" value={c.why_wgs_h2} onChange={(v) => setField('content.why_wgs_h2', v)} />
        <div className="editor-grid-2">
          <Field label="Card 1 headline" value={c.why_wgs_card_1_headline} onChange={(v) => setField('content.why_wgs_card_1_headline', v)} />
          <Field label="Card 2 headline" value={c.why_wgs_card_2_headline} onChange={(v) => setField('content.why_wgs_card_2_headline', v)} />
        </div>
        <div className="editor-grid-2">
          <Field label="Card 1 body" value={c.why_wgs_card_1_body} onChange={(v) => setField('content.why_wgs_card_1_body', v)} rows={3} />
          <Field label="Card 2 body" value={c.why_wgs_card_2_body} onChange={(v) => setField('content.why_wgs_card_2_body', v)} rows={3} />
        </div>
      </FieldGroup>
      <FieldGroup title="Schema (JSON-LD)">
        <Field label="Schema description" value={c.schema_description} onChange={(v) => setField('content.schema_description', v)} rows={2} />
        <Field label="Associated anatomy" value={c.schema_anatomy} onChange={(v) => setField('content.schema_anatomy', v)} />
        <Field label="Treatment summary" value={c.schema_treatment} onChange={(v) => setField('content.schema_treatment', v)} />
      </FieldGroup>
    </>
  );
}

function EmailFields({ c, setField }) {
  return (
    <>
      <FieldGroup title="Subject & Preview">
        <Field label="Subject line" value={c.subject} onChange={(v) => setField('content.subject', v)} />
        <Field label="Preview text (≤90 chars)" value={c.preview_text}
          onChange={(v) => setField('content.preview_text', v)}
          hint={`${(c.preview_text || '').length} / 90`} />
      </FieldGroup>
      <FieldGroup title="Content">
        <Field label="Headline" value={c.headline} onChange={(v) => setField('content.headline', v)} />
        <Field label="Body HTML" value={c.body_html} onChange={(v) => setField('content.body_html', v)} rows={14} />
        <div className="editor-grid-2">
          <Field label="CTA text" value={c.cta_text} onChange={(v) => setField('content.cta_text', v)} />
          <Field label="CTA URL" value={c.cta_url} onChange={(v) => setField('content.cta_url', v)} />
        </div>
      </FieldGroup>
    </>
  );
}

function AdCopyFields({ c, setField }) {
  const variants = c.variants || [];
  const isGoogle = c.platform !== 'meta';

  return (
    <>
      <FieldGroup title="Campaign">
        <div className="editor-grid-2">
          <Field label="Platform" value={c.platform} onChange={(v) => setField('content.platform', v)} />
          <Field label="Campaign objective" value={c.campaign_objective} onChange={(v) => setField('content.campaign_objective', v)} />
        </div>
      </FieldGroup>
      {variants.map((v, i) => (
        <FieldGroup key={i} title={`Variant ${i + 1}${v.variant_focus ? ` — ${v.variant_focus}` : ''}`}>
          {isGoogle ? (
            <>
              <div className="editor-grid-2">
                <Field label={`Headline 1 (${(v.headline_1||'').length}/30)`} value={v.headline_1}
                  onChange={(val) => { const n=[...variants]; n[i]={...n[i],headline_1:val}; setField('content.variants',n); }} />
                <Field label={`Headline 2 (${(v.headline_2||'').length}/30)`} value={v.headline_2}
                  onChange={(val) => { const n=[...variants]; n[i]={...n[i],headline_2:val}; setField('content.variants',n); }} />
              </div>
              <Field label={`Headline 3 (${(v.headline_3||'').length}/30)`} value={v.headline_3}
                onChange={(val) => { const n=[...variants]; n[i]={...n[i],headline_3:val}; setField('content.variants',n); }} />
              <Field label={`Description 1 (${(v.description_1||'').length}/90)`} value={v.description_1}
                onChange={(val) => { const n=[...variants]; n[i]={...n[i],description_1:val}; setField('content.variants',n); }} />
              <Field label={`Description 2 (${(v.description_2||'').length}/90)`} value={v.description_2}
                onChange={(val) => { const n=[...variants]; n[i]={...n[i],description_2:val}; setField('content.variants',n); }} />
            </>
          ) : (
            <>
              <Field label={`Primary text (${(v.primary_text||'').length}/125)`} value={v.primary_text}
                onChange={(val) => { const n=[...variants]; n[i]={...n[i],primary_text:val}; setField('content.variants',n); }} rows={3} />
              <div className="editor-grid-2">
                <Field label={`Headline (${(v.headline||'').length}/40)`} value={v.headline}
                  onChange={(val) => { const n=[...variants]; n[i]={...n[i],headline:val}; setField('content.variants',n); }} />
                <Field label={`Description (${(v.description||'').length}/30)`} value={v.description}
                  onChange={(val) => { const n=[...variants]; n[i]={...n[i],description:val}; setField('content.variants',n); }} />
              </div>
              <Field label="CTA button" value={v.cta_button}
                onChange={(val) => { const n=[...variants]; n[i]={...n[i],cta_button:val}; setField('content.variants',n); }} />
            </>
          )}
        </FieldGroup>
      ))}
    </>
  );
}

// ── Main Editor ────────────────────────────────────────────────────────────

export default function Editor({ item, onUpdate, onPublish, onSchedule, onDelete, onBack }) {
  const [editMode, setEditMode] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [notification, setNotification] = useState(null);

  function notify(msg, type = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }

  function setField(path, val) {
    const parts = path.split('.');
    const updated = { ...item, content: { ...item.content } };
    if (parts.length === 1) {
      updated[parts[0]] = val;
    } else if (parts[0] === 'content') {
      updated.content[parts[1]] = val;
    }
    onUpdate(updated);
  }

  function resolveFlag(idx) {
    const flags = [...(item.flags || [])];
    flags[idx] = { ...flags[idx], resolved: true };
    const allResolved = flags.every((f) => f.resolved);
    onUpdate({ ...item, flags, qa_status: allResolved ? 'READY_FOR_REVIEW' : item.qa_status });
  }

  const unresolvedFlags = (item.flags || []).filter((f) => !f.resolved);
  const allResolved = unresolvedFlags.length === 0;
  const isApproved = item.status === 'approved';
  const isReview = item.status === 'review';
  const noPublish = item.content_type === 'email' || item.content_type === 'ad_copy';

  async function handleMarkReady() {
    if (!allResolved) return;
    const updated = { ...item, status: 'approved', qa_status: 'READY_FOR_REVIEW' };
    onUpdate(updated);
    const r = await fetch('/api/queue', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    if (!r.ok) notify('Save failed', 'danger'); else notify('Marked as approved');
  }

  async function handleSave() {
    const r = await fetch('/api/queue', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
    if (!r.ok) notify('Save failed', 'danger'); else notify('Saved');
  }

  async function handlePublish() {
    if (!isApproved || !allResolved) return;
    setPublishing(true);
    try {
      const r = await fetch('/api/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      onPublish(item.id, data);
      notify('Published successfully!');
    } catch (e) {
      notify(e.message, 'danger');
    } finally {
      setPublishing(false);
    }
  }

  async function handleSchedule() {
    if (!scheduledAt) return;
    try {
      const r = await fetch('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, scheduled_at: scheduledAt }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      onUpdate(data.item);
      onSchedule(data.item);
      setScheduling(false);
      notify('Scheduled');
    } catch (e) {
      notify(e.message, 'danger');
    }
  }

  async function handleGenerateImage() {
    if (!item.image_prompt) return;
    setImageGenerating(true);
    try {
      const r = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, image_prompt: item.image_prompt, quality: item.content_type === 'landing_page' ? 'high' : 'standard' }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (data.pending) { notify(data.message, 'warn'); return; }
      onUpdate({ ...item, image_url: data.image_url });
      notify('Image generated');
    } catch (e) {
      notify(e.message, 'danger');
    } finally {
      setImageGenerating(false);
    }
  }

  async function handleGenerateVideo() {
    if (!item.image_url) return;
    setVideoGenerating(true);
    notify('Generating video (takes ~30-60s)...', 'info');
    try {
      const r = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, image_url: item.image_url }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Video generation failed');
      onUpdate({ ...item, video_url: data.video_url });
      notify('Video generated successfully!');
    } catch (e) {
      notify(e.message, 'danger');
    } finally {
      setVideoGenerating(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Remove this item from the queue?')) return;
    await fetch('/api/queue', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }) });
    onDelete(item.id);
  }

  function handleExportJSON() {
    const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${item.slug || item.id}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportEmailHTML() {
    const blob = new Blob([item.content?.body_html || ''], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${item.slug || item.id}-email.html`; a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopyAdCopy() {
    const c = item.content || {};
    const isGoogle = c.platform !== 'meta';
    const variants = (c.variants || []).map((v, i) => {
      const focus = v.variant_focus ? ` — ${v.variant_focus}` : '';
      if (isGoogle) {
        return `Variant ${i + 1}${focus}\nH1: ${v.headline_1||''}\nH2: ${v.headline_2||''}\nH3: ${v.headline_3||''}\nD1: ${v.description_1||''}\nD2: ${v.description_2||''}`;
      }
      return `Variant ${i + 1}${focus}\nPrimary text: ${v.primary_text||''}\nHeadline: ${v.headline||''}\nDescription: ${v.description||''}\nCTA: ${v.cta_button||''}`;
    }).join('\n\n');
    navigator.clipboard.writeText(variants).then(() => notify('Ad copy copied to clipboard'));
  }

  const c = item.content || {};
  const showImage = ['twitter', 'blog', 'landing_page', 'condition_page'].includes(item.content_type);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Header bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button className="btn btn-sm btn-outline" onClick={onBack}>← Back</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.topic}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Generated {new Date(item.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            {item.trigger && <span style={{ marginLeft: '8px', color: 'var(--info)' }}>· {item.trigger}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Edit / Preview toggle */}
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setEditMode((v) => !v)}
            style={{ background: editMode ? 'var(--ink)' : 'transparent', color: editMode ? '#fff' : 'var(--ink)' }}
          >
            {editMode ? 'View Preview' : 'Edit'}
          </button>

          <button className="btn btn-sm btn-outline" onClick={handleSave}>Save</button>
          <button className="btn btn-sm btn-outline" onClick={handleExportJSON}>Export JSON</button>

          {isReview && (
            <button className="btn btn-sm btn-success" onClick={handleMarkReady} disabled={!allResolved}
              title={!allResolved ? 'Resolve all flags first' : ''}>
              Mark Ready
            </button>
          )}

          {isApproved && item.content_type === 'email' && (
            <button className="btn btn-sm btn-accent" onClick={handleExportEmailHTML}>Export HTML</button>
          )}
          {isApproved && item.content_type === 'ad_copy' && (
            <button className="btn btn-sm btn-accent" onClick={handleCopyAdCopy}>Copy all variants</button>
          )}
          {isApproved && !noPublish && !scheduling && (
            <>
              <button className="btn btn-sm btn-outline" onClick={() => setScheduling(true)}>Schedule</button>
              <button className="btn btn-sm btn-accent" onClick={handlePublish} disabled={publishing || !allResolved}>
                {publishing ? <><span className="spinner-dark" /> Publishing…</> : 'Publish now'}
              </button>
            </>
          )}
          {scheduling && (
            <>
              <input type="datetime-local" className="datetime-input" value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)} />
              <button className="btn btn-sm btn-primary" onClick={handleSchedule} disabled={!scheduledAt}>Confirm</button>
              <button className="btn btn-sm btn-outline" onClick={() => setScheduling(false)}>Cancel</button>
            </>
          )}
          <button className="btn btn-sm btn-danger" onClick={handleDelete}>Remove</button>
        </div>
      </div>

      {/* ── Notifications / status ── */}
      {notification && (
        <div className={`alert alert-${notification.type === 'danger' ? 'danger' : notification.type === 'warn' ? 'warn' : 'success'}`}>
          {notification.msg}
        </div>
      )}
      {unresolvedFlags.length > 0 && (
        <div className="alert alert-warn">
          ⚠ {unresolvedFlags.length} unresolved QA flag{unresolvedFlags.length > 1 ? 's' : ''} — resolve all to approve
        </div>
      )}
      {isApproved && (
        <div className="alert alert-success">
          ✓ Approved — {noPublish ? 'ready to export' : 'ready to schedule or publish'}
        </div>
      )}

      {/* ── PREVIEW MODE (default) ── */}
      {!editMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <PreviewPane item={item} />

          {/* Image panel (Twitter / Blog / Landing) */}
          {showImage && (
            <div className="card">
              <div className="editor-section-title" style={{ marginBottom: '12px' }}>Image</div>
              {item.image_url ? (
                <div>
                  <img src={item.image_url} alt="" className="img-preview" />
                  <button className="btn btn-sm btn-outline" style={{ width: '100%', marginBottom: '8px' }}
                    onClick={handleGenerateImage} disabled={imageGenerating}>
                    Regenerate image
                  </button>
                  {item.image_url && (
                    <>
                      <button className="btn btn-sm btn-accent" style={{ width: '100%' }} onClick={handleGenerateVideo} disabled={videoGenerating || item.video_url}>
                        {videoGenerating ? 'Generating Video (Takes ~60s)...' : item.video_url ? 'Video generated' : 'Generate 6s Video (Kling AI)'}
                      </button>
                      {item.video_url && (
                        <video src={item.video_url} controls loop autoPlay playsInline style={{ width: '100%', marginTop: '12px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <div className="img-placeholder">No image yet</div>
                  <button className="btn btn-sm btn-outline" style={{ width: '100%' }}
                    onClick={handleGenerateImage} disabled={imageGenerating || !item.image_prompt}>
                    {imageGenerating
                      ? <><span className="spinner-light" /> Generating…</>
                      : item.image_prompt ? 'Generate image' : 'No image prompt available'}
                  </button>
                  {item.image_prompt && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5 }}>
                      <strong>Prompt:</strong> {item.image_prompt}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Flags always visible */}
          <div className="card">
            <div className="editor-section-title" style={{ marginBottom: '12px' }}>QA Flags</div>
            <FlagsPanel item={item} onResolve={resolveFlag} />
          </div>
        </div>
      )}

      {/* ── EDIT MODE ── */}
      {editMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {item.content_type === 'twitter'      && <TwitterFields c={c} setField={setField} />}
          {item.content_type === 'blog'         && <BlogFields c={c} setField={setField} />}
          {(item.content_type === 'landing_page' || item.content_type === 'condition_page') && <LandingFields c={c} setField={setField} />}
          {item.content_type === 'email'        && <EmailFields c={c} setField={setField} />}
          {item.content_type === 'ad_copy'      && <AdCopyFields c={c} setField={setField} />}

          {/* Flags in edit mode too */}
          <div className="card">
            <div className="editor-section-title" style={{ marginBottom: '12px' }}>QA Flags</div>
            <FlagsPanel item={item} onResolve={resolveFlag} />
          </div>

          {/* Image panel in edit mode */}
          {showImage && (
            <div className="card">
              <div className="editor-section-title" style={{ marginBottom: '12px' }}>Image</div>
              {item.image_url ? (
                <>
                  <img src={item.image_url} alt="" className="img-preview" style={{ maxHeight: '200px' }} />
                  <button className="btn btn-sm btn-outline" style={{ width: '100%', marginBottom: '8px' }}
                    onClick={handleGenerateImage} disabled={imageGenerating}>
                    Regenerate image
                  </button>
                  {item.image_url && (
                    <>
                      <button className="btn btn-sm btn-accent" style={{ width: '100%' }} onClick={handleGenerateVideo} disabled={videoGenerating || item.video_url}>
                        {videoGenerating ? 'Generating Video...' : item.video_url ? 'Video generated' : 'Generate 6s Video'}
                      </button>
                      {item.video_url && (
                        <video src={item.video_url} controls loop autoPlay playsInline style={{ width: '100%', marginTop: '12px', borderRadius: '8px', border: '1px solid var(--border)', maxHeight: '200px' }} />
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="img-placeholder">No image yet</div>
                  <button className="btn btn-sm btn-outline" style={{ width: '100%' }}
                    onClick={handleGenerateImage} disabled={imageGenerating || !item.image_prompt}>
                    {imageGenerating ? <><span className="spinner-light" /> Generating…</> : item.image_prompt ? 'Generate image' : 'No prompt'}
                  </button>
                </>
              )}
              {item.image_prompt && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  <strong>Prompt:</strong> {item.image_prompt}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
