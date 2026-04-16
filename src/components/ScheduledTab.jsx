import { CONTENT_TYPE_LABELS } from '../lib/skills.js';

export default function ScheduledTab({ items, onCancel }) {
  const scheduled = items.filter((i) => i.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  if (scheduled.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '28px' }}>🗓</div>
        <div>No scheduled content</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">Scheduled</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {scheduled.map((item) => {
          const dt = item.scheduled_at ? new Date(item.scheduled_at) : null;
          const isPast = dt && dt < new Date();
          return (
            <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span className={`type-badge type-${item.content_type}`}>
                {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.topic}
                </div>
                <div style={{ fontSize: '12px', color: isPast ? 'var(--warn)' : 'var(--muted)' }}>
                  {isPast ? 'Publishing soon · ' : 'Scheduled for '}
                  {dt ? dt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                </div>
              </div>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => onCancel(item.id)}
              >
                Cancel
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
