import { useState, useEffect, useRef } from 'react';

export default function PreviewPane({ item }) {
  if (item.content_type === 'insight_bundle') return <InsightBundlePreview item={item} />;
  const needsIframe = item.content_type === 'landing_page' || item.content_type === 'blog' || item.content_type === 'insight' || item.content_type === 'campaign_landing_page';
  if (needsIframe) return <IframePreview item={item} />;
  return <TextPreview item={item} />;
}

function InsightBundlePreview({ item }) {
  const metaAdsItem = { ...item, content: { platform: 'meta', variants: item.content.meta_ads?.variants || [] }, content_type: 'ad_copy', image_url: item.image_url };
  const googleAdsItem = { ...item, content: { platform: 'google', variants: item.content.google_ads?.variants || [] }, content_type: 'ad_copy', image_url: null };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '16px', background: '#e0f2fe', color: '#0369a1', fontWeight: 500, fontSize: '14px', borderBottom: '1px solid #bae6fd' }}>
        <strong>Signal Context:</strong> Surfaced from {item.trigger}
      </div>
      <div>
        <h3 style={{ padding: '24px 24px 0', margin: 0, fontSize: '18px' }}>Google Search Ads</h3>
        <div style={{ padding: '0 24px' }}><AdCopyPreview item={googleAdsItem} /></div>
      </div>
      <div>
        <h3 style={{ padding: '24px 24px 0', margin: 0, fontSize: '18px' }}>Meta Social Ads</h3>
        <div style={{ padding: '0 24px' }}><AdCopyPreview item={metaAdsItem} /></div>
      </div>
      {item.content.social_organic && (
        <div>
          <h3 style={{ padding: '24px 24px 12px', margin: 0, fontSize: '18px' }}>Organic Social</h3>
          <div style={{ padding: '0 24px' }}>
            <div className="card" style={{ background: '#fafafa' }}>
              <div style={{ marginBottom: '16px', whiteSpace: 'pre-wrap' }}><strong>Twitter:</strong> {typeof item.content.social_organic.twitter === 'object' ? JSON.stringify(item.content.social_organic.twitter) : item.content.social_organic.twitter}</div>
              <div style={{ marginBottom: '16px', whiteSpace: 'pre-wrap' }}><strong>LinkedIn:</strong> {typeof item.content.social_organic.linkedin === 'object' ? JSON.stringify(item.content.social_organic.linkedin) : item.content.social_organic.linkedin}</div>
              <div style={{ marginBottom: '16px', whiteSpace: 'pre-wrap' }}><strong>Reddit:</strong> {typeof item.content.social_organic.reddit === 'object' ? `${item.content.social_organic.reddit.title || ''}\n\n${item.content.social_organic.reddit.body || ''}` : item.content.social_organic.reddit}</div>
              <div style={{ marginBottom: '16px', whiteSpace: 'pre-wrap' }}><strong>Facebook:</strong> {typeof item.content.social_organic.facebook === 'object' ? JSON.stringify(item.content.social_organic.facebook) : item.content.social_organic.facebook}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}><strong>Instagram:</strong> {typeof item.content.social_organic.instagram === 'object' ? JSON.stringify(item.content.social_organic.instagram) : item.content.social_organic.instagram}</div>
            </div>
          </div>
        </div>
      )}
      <div style={{ height: '800px', display: 'flex', flexDirection: 'column', paddingBottom: '40px' }}>
        <h3 style={{ padding: '24px 24px 12px', margin: 0, fontSize: '18px' }}>Insight Article</h3>
        <IframePreview item={item} view="blog" /> 
      </div>
      <div style={{ height: '800px', display: 'flex', flexDirection: 'column', paddingBottom: '40px' }}>
        <h3 style={{ padding: '24px 24px 12px', margin: 0, fontSize: '18px' }}>Campaign Landing Page</h3>
        <IframePreview item={item} view="landing_page" /> 
      </div>
    </div>
  );
}

// ── Iframe preview (landing page + blog) ──────────────────────────────────

function IframePreview({ item, view = '' }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const blobRef = useRef(null);

  function load() {
    setLoading(true);
    setError(null);

    fetch(`/api/preview?id=${encodeURIComponent(item.id)}` + (view ? `&view=${view}` : ''))
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || `Preview failed (${r.status})`); });
        return r.text();
      })
      .then((rawHtml) => {
        if (blobRef.current) URL.revokeObjectURL(blobRef.current);
        const blob = new Blob([rawHtml], { type: 'text/html' });
        blobRef.current = URL.createObjectURL(blob);
        setBlobUrl(blobRef.current);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    return () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, JSON.stringify(item.content), item.image_url]);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
      }}>
        <span>Preview</span>
        {!loading && (
          <button className="btn btn-xs btn-outline" onClick={load}>Refresh</button>
        )}
      </div>
      {loading && (
        <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--muted)' }}>
          <span className="spinner" /> Building preview…
        </div>
      )}
      {error && (
        <div style={{ padding: '20px', color: 'var(--danger)', fontSize: '13px' }}>
          Preview unavailable: {error}
        </div>
      )}
      {!loading && !error && blobUrl && (
        <iframe src={blobUrl} title="Page preview"
          style={{ width: '100%', height: '700px', border: 'none', display: 'block' }}
          sandbox="allow-same-origin allow-scripts" />
      )}
    </div>
  );
}

// ── Text previews ─────────────────────────────────────────────────────────

function TextPreview({ item }) {
  if (item.content_type === 'twitter') return <TwitterPreview item={item} />;
  if (item.content_type === 'email')   return <EmailPreview item={item} />;
  if (item.content_type === 'ad_copy') return <AdCopyPreview item={item} />;
  return null;
}

function TwitterPreview({ item }) {
  const c = item.content || {};
  return (
    <div className="card">
      <div className="editor-section-title" style={{ marginBottom: '14px' }}>Preview</div>
      <div style={{
        background: '#fff',
        border: '1px solid #cfd9de',
        borderRadius: '12px',
        padding: '16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: '520px',
      }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 700 }}>D</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f1419' }}>Dante Labs</div>
            <div style={{ color: '#536471', fontSize: '13px' }}>@DanteLabs</div>
          </div>
        </div>
        <div style={{ fontSize: '15px', lineHeight: 1.55, color: '#0f1419', whiteSpace: 'pre-wrap', marginBottom: '12px' }}>
          {c.text || <span style={{ color: '#aaa' }}>No text yet</span>}
        </div>
        {item.image_url && (
          <img src={item.image_url} alt="" style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', maxHeight: '280px', display: 'block' }} />
        )}
        <div style={{ marginTop: '10px', color: '#536471', fontSize: '13px', borderTop: '1px solid #eff3f4', paddingTop: '10px' }}>
          {(c.text || '').length} / 280 characters
          {c.format && <span style={{ marginLeft: '10px', color: 'var(--accent)', fontWeight: 600 }}>{c.format}</span>}
        </div>
      </div>
    </div>
  );
}

function EmailPreview({ item }) {
  const c = item.content || {};

  // Clean any leftover raw escape sequences
  const cleanHtml = (c.body_html || '')
    .replace(/\\n/g, '')
    .replace(/\\t/g, '')
    .trim();

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        Preview
      </div>
      {/* Inbox line */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: '#f9f9f9', fontSize: '13px' }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
          <span style={{ color: 'var(--muted)', minWidth: '80px' }}>Subject:</span>
          <strong>{c.subject || <span style={{ color: '#aaa' }}>—</span>}</strong>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ color: 'var(--muted)', minWidth: '80px' }}>Preview:</span>
          <span style={{ color: '#666' }}>{c.preview_text || <span style={{ color: '#aaa' }}>—</span>}</span>
        </div>
      </div>
      {/* Email body */}
      <div style={{ padding: '32px 40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Georgia, serif', fontSize: '15px', lineHeight: 1.7, color: '#222' }}>
        {c.headline && (
          <h1 style={{ fontFamily: 'system-ui, sans-serif', fontSize: '26px', fontWeight: 700, marginBottom: '24px', color: '#0a0e17' }}>
            {c.headline}
          </h1>
        )}
        {cleanHtml
          ? <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
          : <p style={{ color: '#aaa' }}>No body content yet.</p>
        }
        {c.cta_text && (
          <div style={{ marginTop: '32px' }}>
            <a href={c.cta_url || '#'} style={{
              display: 'inline-block',
              background: 'var(--accent)',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: '6px',
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              letterSpacing: '.02em',
            }}>
              {c.cta_text}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function AdCopyPreview({ item }) {
  const c = item.content || {};
  const variants = c.variants || [];
  const isGoogle = c.platform !== 'meta';

  return (
    <div className="card">
      <div className="editor-section-title" style={{ marginBottom: '4px' }}>Preview</div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
        {isGoogle ? 'Google Search Ads' : 'Meta (Facebook/Instagram) Ads'} · {variants.length} variant{variants.length !== 1 ? 's' : ''}
      </div>

      {variants.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No variants generated yet.</p>}

      {isGoogle
        ? variants.map((v, i) => <GoogleAdVariant key={i} v={v} i={i} />)
        : variants.map((v, i) => <MetaAdVariant key={i} v={v} i={i} imageUrl={item.image_url} />)
      }
    </div>
  );
}

function GoogleAdVariant({ v, i }) {
  const BADGE_COLORS = ['#dbeafe', '#dcfce7', '#f3e8ff'];
  const BADGE_TEXT   = ['#1e40af', '#166534', '#6b21a8'];
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '14px', background: '#fafafa' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', padding: '2px 8px', borderRadius: '4px', background: BADGE_COLORS[i % 3], color: BADGE_TEXT[i % 3] }}>
          {v.variant_focus || `Variant ${i + 1}`}
        </span>
      </div>
      {/* Google SERP mock */}
      <div style={{ fontFamily: 'arial, sans-serif' }}>
        <div style={{ color: '#006621', fontSize: '13px', marginBottom: '4px' }}>
          Ad · dantelabs.com
        </div>
        <div style={{ color: '#1a0dab', fontSize: '18px', fontWeight: 400, marginBottom: '4px', lineHeight: 1.3 }}>
          {[v.headline_1, v.headline_2, v.headline_3].filter(Boolean).join(' | ')}
        </div>
        <div style={{ color: '#545454', fontSize: '14px', lineHeight: 1.5 }}>
          {[v.description_1, v.description_2].filter(Boolean).join(' ')}
        </div>
      </div>
      {/* Char counts */}
      <div style={{ marginTop: '10px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[['H1', v.headline_1, 30], ['H2', v.headline_2, 30], ['H3', v.headline_3, 30]].map(([k, val, max]) => (
          <span key={k} style={{ fontSize: '11px', color: (val||'').length > max ? 'var(--danger)' : 'var(--muted)' }}>
            {k}: {(val||'').length}/{max}
          </span>
        ))}
        {[['D1', v.description_1, 90], ['D2', v.description_2, 90]].map(([k, val, max]) => (
          <span key={k} style={{ fontSize: '11px', color: (val||'').length > max ? 'var(--danger)' : 'var(--muted)' }}>
            {k}: {(val||'').length}/{max}
          </span>
        ))}
      </div>
    </div>
  );
}

function MetaAdVariant({ v, i, imageUrl }) {
  const BADGE_COLORS = ['#dbeafe', '#dcfce7', '#f3e8ff'];
  const BADGE_TEXT   = ['#1e40af', '#166534', '#6b21a8'];
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '14px', background: '#fafafa' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', padding: '2px 8px', borderRadius: '4px', background: BADGE_COLORS[i % 3], color: BADGE_TEXT[i % 3] }}>
          {v.variant_focus || `Variant ${i + 1}`}
        </span>
      </div>
      {/* Meta feed mock */}
      <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', maxWidth: '400px' }}>
        {/* Primary text (above image) */}
        <div style={{ padding: '12px 14px', fontSize: '14px', color: '#1c1e21', lineHeight: 1.5, borderBottom: '1px solid #f0f2f5' }}>
          {v.primary_text || <span style={{ color: '#aaa' }}>Primary text…</span>}
        </div>
        {/* Image */}
        {imageUrl
          ? <div style={{ position: 'relative' }}>
              <img src={imageUrl} alt="" style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }} />
              {showOverlay && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                  <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 800, textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                    {v.headline}
                  </h2>
                </div>
              )}
            </div>
          : <div style={{ background: 'linear-gradient(135deg, #e8e8e8, #d0d0d0)', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '12px' }}>Generating image…</div>
        }
        {imageUrl && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #f0f2f5', background: '#f8f9fa' }}>
            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} />
              Show dynamically generated text overlay
            </label>
          </div>
        )}
        {/* Below-image block */}
        <div style={{ padding: '10px 14px', background: '#f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1c1e21' }}>
              {v.headline || <span style={{ color: '#aaa' }}>Headline</span>}
            </div>
            <div style={{ fontSize: '12px', color: '#65676b', marginTop: '2px' }}>
              {v.description || <span style={{ color: '#aaa' }}>Description</span>}
            </div>
          </div>
          <div style={{ background: '#e4e6eb', border: '1px solid #ccd0d5', borderRadius: '4px', padding: '6px 12px', fontSize: '13px', fontWeight: 600, color: '#1c1e21', flexShrink: 0 }}>
            {v.cta_button || 'Learn More'}
          </div>
        </div>
      </div>
      {/* Char counts */}
      <div style={{ marginTop: '10px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[['Primary', v.primary_text, 125], ['Headline', v.headline, 40], ['Desc', v.description, 30]].map(([k, val, max]) => (
          <span key={k} style={{ fontSize: '11px', color: (val||'').length > max ? 'var(--danger)' : 'var(--muted)' }}>
            {k}: {(val||'').length}/{max}
          </span>
        ))}
      </div>
    </div>
  );
}
