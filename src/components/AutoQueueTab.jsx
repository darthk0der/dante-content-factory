import { useState, useEffect } from 'react';
import { CONTENT_TYPE_LABELS } from '../lib/skills.js';
import Editor from './Editor.jsx';

const AUTO_SOURCES = ['seo_queue', 'spike', 'daily_tweet', 'social_ads'];

const SOURCE_LABELS = {
  seo_queue:   'SEO Queue',
  spike:       'Spike',
  daily_tweet: 'Daily Tweet',
  social_ads:  'Social Ads',
};

function StatusBadge({ item }) {
  const cls = {
    review:    'badge-review',
    approved:  'badge-approved',
    scheduled: 'badge-scheduled',
    published: 'badge-published',
  }[item.status] || 'badge-review';

  const label = {
    review:    item.qa_status === 'READY_FOR_REVIEW' ? 'Ready' : 'In Review',
    approved:  'Approved',
    scheduled: 'Scheduled',
    published: 'Published',
  }[item.status] || item.status;

  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function AutoQueueTab({ items, onUpdate, onPublish, onSchedule, onDelete, title = "Auto Queue", emptyIcon = "⚙️", emptyMessage = "Auto-generated content from SEO queue, spike detection, daily tweets, and social ads will appear here for review." }) {
  const [openId, setOpenId] = useState(null);
  const [rawSignals, setRawSignals] = useState([]);

  useEffect(() => {
    if (title === 'Trend Hub') {
      fetch('/api/trends')
        .then(r => r.json())
        .then(d => { if (d.signals) setRawSignals(d.signals); })
        .catch(console.error);
    }
  }, [title]);

  const queue = items.filter((i) =>
    AUTO_SOURCES.includes(i.source) &&
    (i.status === 'review' || i.status === 'approved')
  );

  const openItem = queue.find((i) => i.id === openId);

  if (openItem) {
    return (
      <Editor
        item={openItem}
        onUpdate={(updated) => onUpdate(updated)}
        onPublish={(id, result) => { onPublish(id, result); setOpenId(null); }}
        onSchedule={(item) => { onSchedule(item); setOpenId(null); }}
        onDelete={(id) => { onDelete(id); setOpenId(null); }}
        onBack={() => setOpenId(null)}
      />
    );
  }

  if (queue.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '28px' }}>{emptyIcon}</div>
        <div>{title} is empty</div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', maxWidth: '360px' }}>
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">
        {title}{' '}
        <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--muted)' }}>({queue.length})</span>
      </div>

      {title === 'Trend Hub' && (
        <div style={{ marginBottom: '24px', background: 'var(--color-card)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--color-ink)' }}>Top Raw Signals (Daily)</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--muted)', lineHeight: '1.4' }}>
            The system tracks these signals daily. An automatic 360° Content Bundle will only trigger if Ahrefs volume exceeds a <strong>2x (200%) spike</strong>, Google Trends queries break out past <strong>200%</strong>, or if Claude AI detects a major market-moving news event.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {['Ahrefs SEO', 'Google Trends', 'Claude AI'].map(source => {
                // Filter signals for this source and ensure no duplicates
                const sourceSignals = [];
                const seen = new Set();
                for (const sig of rawSignals) {
                    if (sig.source === source && !seen.has(sig.topic)) {
                        sourceSignals.push(sig);
                        seen.add(sig.topic);
                    }
                }
                
                // Get top 3
                const top3 = sourceSignals.slice(0, 3);
                
                return (
                    <div key={source} style={{ background: 'var(--color-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                        <div style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                            {source}
                        </div>
                        
                        {top3.length === 0 ? (
                            <div style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic', padding: '8px 0' }}>No Signal</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {top3.map((sig, idx) => (
                                    <div key={idx} style={{ fontSize: '13px' }}>
                                        <div style={{ fontWeight: 600, marginBottom: '2px', color: 'var(--color-ink)' }}>{sig.topic}</div>
                                        <div style={{ color: 'var(--accent)', fontWeight: 500, fontSize: '12px' }}>{sig.metric}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {queue.map((item) => {
          const unresolvedCount = (item.flags || []).filter((f) => !f.resolved).length;
          return (
            <div key={item.id} className="queue-item" onClick={() => setOpenId(item.id)}>
              <span className={`type-badge type-${item.content_type}`}>
                {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.topic}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', gap: '10px' }}>
                  <span>{new Date(item.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  {item.source && (
                    <span style={{ color: 'var(--info)', fontWeight: 600 }}>
                      {SOURCE_LABELS[item.source] || item.source}
                    </span>
                  )}
                  {item.trigger && (
                    <span style={{ color: 'var(--accent)' }}>{item.trigger}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {unresolvedCount > 0 && (
                  <span className="badge badge-revision">
                    {unresolvedCount} flag{unresolvedCount > 1 ? 's' : ''}
                  </span>
                )}
                <StatusBadge item={item} />
                <span style={{ color: 'var(--muted)', fontSize: '18px' }}>›</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
