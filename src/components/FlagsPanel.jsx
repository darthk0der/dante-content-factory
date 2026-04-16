export default function FlagsPanel({ item, onResolve }) {
  const flags = item?.flags || [];
  if (flags.length === 0) {
    return (
      <div style={{ padding: '14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '13px', color: '#166534' }}>
        ✓ No QA flags — content is clean
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {flags.map((rawFlag, i) => {
        const flag = typeof rawFlag === 'string' ? { reason: rawFlag, severity: 'warning' } : rawFlag;
        const resolved = !!flag.resolved;
        const severityClass = `flag-${flag.severity || 'warning'}`;
        return (
          <div
            key={i}
            style={{
              background: resolved ? '#f9f9f9' : '#fff',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '12px',
              opacity: resolved ? 0.55 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
              <span className={`flag-badge ${severityClass}`}>{flag.severity}</span>
              {resolved
                ? <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Resolved</span>
                : (
                  <button
                    className="btn btn-xs btn-outline"
                    onClick={() => onResolve(i)}
                  >
                    Resolve
                  </button>
                )
              }
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.5, marginBottom: flag.action_required ? '6px' : 0 }}>
              {flag.reason || flag.description || flag.message || JSON.stringify(flag)}
            </div>
            {flag.action_required && (
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic' }}>
                Action: {flag.action_required}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
