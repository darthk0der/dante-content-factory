import { useState } from 'react';
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

export default function AutoQueueTab({ items, onUpdate, onPublish, onSchedule, onDelete }) {
  const [openId, setOpenId] = useState(null);

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
        <div style={{ fontSize: '28px' }}>⚙️</div>
        <div>Auto Queue is empty</div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', maxWidth: '360px' }}>
          Auto-generated content from SEO queue, spike detection, daily tweets, and social ads will appear here for review.
          These pipelines activate in Phase 2.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">
        Auto Queue{' '}
        <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--muted)' }}>({queue.length})</span>
      </div>
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
