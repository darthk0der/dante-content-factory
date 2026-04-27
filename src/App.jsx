import { useState, useEffect } from 'react';
import GenerateTab from './components/GenerateTab.jsx';
import ReviewTab from './components/ReviewTab.jsx';
import AutoQueueTab from './components/AutoQueueTab.jsx';
import ScheduledTab from './components/ScheduledTab.jsx';
import PublishedTab from './components/PublishedTab.jsx';

const TABS = [
  { id: 'generate',   label: 'Generate' },
  { id: 'insights',   label: 'Trend Hub' },
  { id: 'review',     label: 'Review Queue' },
  { id: 'auto',       label: 'Auto Queue' },
  { id: 'scheduled',  label: 'Scheduled' },
  { id: 'published',  label: 'Published' },
];

const AUTO_SOURCES = ['seo_queue', 'spike', 'daily_tweet', 'social_ads'];

function TabCount({ items, tabId }) {
  const count = {
    insights:  items.filter((i) => i.content_type === 'insight_bundle' && i.source !== 'manual' && (i.status === 'review' || i.status === 'approved')).length,
    review:    items.filter((i) => !AUTO_SOURCES.includes(i.source) && (i.status === 'review' || i.status === 'approved')).length,
    auto:      items.filter((i) => i.content_type !== 'insight_bundle' && AUTO_SOURCES.includes(i.source) && (i.status === 'review' || i.status === 'approved')).length,
    scheduled: items.filter((i) => i.status === 'scheduled').length,
    published: items.filter((i) => i.status === 'published').length,
  }[tabId];
  if (!count) return null;
  return <span className="tab-count">{count}</span>;
}

export default function App() {
  const [tab, setTab] = useState('generate');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/queue')
      .then((r) => r.json())
      .then((data) => setItems(data.items || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function upsertItem(updated) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleGenerated(item) {
    upsertItem(item);
    if (item.content_type === 'insight_bundle') {
      setTab('insights');
    } else {
      setTab(AUTO_SOURCES.includes(item.source) ? 'auto' : 'review');
    }
  }

  function handleUpdate(updated) {
    upsertItem(updated);
    fetch('/api/queue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(console.error);
  }

  function handlePublish(id, result) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: 'published', published_at: new Date().toISOString(), ...result }
          : i
      )
    );
    setTab('published');
  }

  function handleSchedule(updated) {
    upsertItem(updated);
    setTab('scheduled');
  }

  function handleCancelSchedule(id) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'approved', scheduled_at: null } : i))
    );
    fetch('/api/queue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'approved', scheduled_at: null }),
    }).catch(console.error);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-logo">Dante Labs · Content Factory</div>
        <nav className="topbar-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              <TabCount items={items} tabId={t.id} />
            </button>
          ))}
        </nav>
      </header>

      <main className="main-area">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px', color: 'var(--muted)' }}>
            <span className="spinner spinner-lg" />
            Loading queue…
          </div>
        ) : (
          <>
            {tab === 'generate' && (
              <GenerateTab onGenerated={handleGenerated} items={items} />
            )}
            {tab === 'review' && (
              <ReviewTab
                items={items}
                onUpdate={handleUpdate}
                onPublish={handlePublish}
                onSchedule={handleSchedule}
                onDelete={removeItem}
              />
            )}
            {tab === 'insights' && (
              <AutoQueueTab
                items={items.filter(i => i.content_type === 'insight_bundle' && i.source !== 'manual')}
                onUpdate={handleUpdate}
                onPublish={handlePublish}
                onSchedule={handleSchedule}
                onDelete={removeItem}
                title="Trend Hub"
                emptyIcon="📈"
                emptyMessage="Trending Insights will appear here when triggered by the SEO or Social listening pipelines."
              />
            )}
            {tab === 'auto' && (
              <AutoQueueTab
                items={items.filter(i => i.content_type !== 'insight_bundle')}
                onUpdate={handleUpdate}
                onPublish={handlePublish}
                onSchedule={handleSchedule}
                onDelete={removeItem}
              />
            )}
            {tab === 'scheduled' && (
              <ScheduledTab items={items} onCancel={handleCancelSchedule} />
            )}
            {tab === 'published' && (
              <PublishedTab items={items} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
