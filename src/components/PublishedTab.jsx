import { CONTENT_TYPE_LABELS } from '../lib/skills.js';

export default function PublishedTab({ items }) {
  const published = items.filter((i) => i.status === 'published')
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  if (published.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '28px' }}>📤</div>
        <div>No published content yet</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">Published</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {published.map((item) => (
          <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className={`type-badge type-${item.content_type}`}>
              {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.topic}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Published {item.published_at ? new Date(item.published_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {item.live_url && (
                <a
                  href={item.live_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline"
                >
                  View live →
                </a>
              )}
              {item.tweet_url && (
                <a
                  href={item.tweet_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline"
                >
                  View tweet →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
