import { useState, useEffect } from 'react';

export default function MemoryTab() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    setLoading(true);
    try {
      const res = await fetch('/api/rules');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRules(data.rules || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(ruleText) {
    if (!confirm('Are you sure you want the AI to forget this rule?')) return;
    try {
      const res = await fetch('/api/rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule: ruleText })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setRules((prev) => prev.filter(r => r !== ruleText));
    } catch (e) {
      alert(`Failed to delete rule: ${e.message}`);
    }
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner-dark" style={{ width: '32px', height: '32px', marginBottom: '16px' }} />
        <div>Accessing AI memory...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '28px' }}>⚠️</div>
        <div style={{ color: 'var(--danger)' }}>{error}</div>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '28px' }}>🧠</div>
        <div>The AI hasn't learned any rules yet</div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px', maxWidth: '400px', lineHeight: 1.5 }}>
          When you manually edit AI-generated content and click "Save", the system will automatically analyze your changes in the background and try to extract a specific rule to follow next time.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">
        AI Memory{' '}
        <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--muted)' }}>({rules.length} / 10 rules)</span>
      </div>
      
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.5 }}>
        These rules were automatically extracted from your manual edits. They are injected directly into the system prompt during content generation so the AI learns your preferences over time.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rules.map((rule, idx) => {
          // Rule format is usually "[Learned Rule for blog]: Always do X"
          // Let's make it look nice
          const match = rule.match(/^\[Learned Rule for (.*?)\]:\s*(.*)/i);
          let typeLabel = 'Global Rule';
          let text = rule;
          
          if (match) {
            typeLabel = match[1].charAt(0).toUpperCase() + match[1].slice(1);
            text = match[2];
          }

          return (
            <div key={idx} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="badge badge-published" style={{ marginBottom: '8px', display: 'inline-block' }}>
                  {typeLabel}
                </span>
                <div style={{ fontWeight: 500, fontSize: '14px', lineHeight: 1.5, color: 'var(--ink)' }}>
                  {text}
                </div>
              </div>
              <button 
                className="btn btn-sm btn-outline" 
                style={{ color: 'var(--danger)', borderColor: 'var(--border)' }}
                onClick={() => handleDelete(rule)}
                title="Forget this rule"
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
