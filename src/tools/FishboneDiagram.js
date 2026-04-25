import React, { useState } from 'react';
import './Tool.css';

const categories6M = ['Man', 'Machine', 'Method', 'Material', 'Measurement', 'Mother Nature'];
const categoryColors = {
  Man: 'var(--blue-light)',
  Machine: 'var(--orange)',
  Method: 'var(--green)',
  Material: 'var(--purple)',
  Measurement: 'var(--yellow)',
  'Mother Nature': 'var(--cyan)',
};

const initCauses = {
  Man: ['Untrained operators', 'High turnover'],
  Machine: ['Equipment wear', 'Calibration drift'],
  Method: ['Unclear SOP', 'No work standard'],
  Material: ['Supplier variation', 'Wrong specification'],
  Measurement: ['Gauge error', 'Inconsistent sampling'],
  'Mother Nature': ['Temperature variation', 'Humidity'],
};

export default function FishboneDiagram() {
  const [problem, setProblem] = useState('High Defect Rate in Product Assembly');
  const [causes, setCauses] = useState(initCauses);
  const [newCause, setNewCause] = useState({});

  const addCause = (cat) => {
    const val = newCause[cat]?.trim();
    if (!val) return;
    setCauses(prev => ({ ...prev, [cat]: [...(prev[cat] || []), val] }));
    setNewCause(prev => ({ ...prev, [cat]: '' }));
  };

  const removeCause = (cat, idx) => {
    setCauses(prev => ({ ...prev, [cat]: prev[cat].filter((_, i) => i !== idx) }));
  };

  const totalCauses = Object.values(causes).reduce((s, a) => s + a.length, 0);

  return (
    <div className="tool-container tool-full">
      {/* Problem statement */}
      <div className="tool-panel">
        <div className="panel-title">Problem Statement (Effect)</div>
        <input
          className="input"
          style={{ fontSize: 16, fontWeight: 600 }}
          value={problem}
          onChange={e => setProblem(e.target.value)}
          placeholder="Enter the problem or effect being analyzed..."
        />
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          Total causes identified: <strong style={{ color: 'var(--cyan)' }}>{totalCauses}</strong>
        </div>
      </div>

      {/* SVG Fishbone */}
      <div className="chart-wrapper" style={{ padding: '28px 20px' }}>
        <div className="chart-title">Ishikawa (Fishbone) Diagram — {problem}</div>
        <div style={{ overflowX: 'auto' }}>
          <svg viewBox="0 0 900 440" style={{ width: '100%', minWidth: 600, height: 'auto', display: 'block' }}>
            {/* Spine */}
            <line x1="80" y1="220" x2="820" y2="220" stroke="var(--text-secondary)" strokeWidth="3" />
            {/* Fish head (arrow) */}
            <polygon points="820,210 850,220 820,230" fill="var(--cyan)" />
            {/* Effect box */}
            <rect x="855" y="195" width="40" height="50" rx="6" fill="none" />

            {/* Problem box */}
            <rect x="720" y="178" width="180" height="84" rx="10" fill="var(--navy-3)" stroke="var(--cyan)" strokeWidth="2" />
            <foreignObject x="722" y="180" width="176" height="80">
              <div xmlns="http://www.w3.org/1999/xhtml" style={{ color: 'var(--cyan)', fontSize: 11, fontWeight: 700, padding: '4px 8px', lineHeight: 1.4, wordBreak: 'break-word', display: 'flex', alignItems: 'center', height: '100%', fontFamily: 'Syne, sans-serif' }}>
                {problem}
              </div>
            </foreignObject>

            {/* Top bones: Man, Machine, Method (left to right) */}
            {[
              { cat: 'Man', bx: 120, by: 80 },
              { cat: 'Machine', bx: 320, by: 80 },
              { cat: 'Method', bx: 520, by: 80 },
            ].map(({ cat, bx, by }) => {
              const spineX = bx + 70;
              const color = categoryColors[cat];
              return (
                <g key={cat}>
                  <line x1={bx} y1={by + 30} x2={spineX} y2="220" stroke={color} strokeWidth="2" />
                  <rect x={bx - 40} y={by} width={120} height={32} rx={8} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.5} />
                  <text x={bx + 20} y={by + 20} textAnchor="middle" fill={color} fontSize="12" fontWeight="700" fontFamily="Syne, sans-serif">{cat}</text>
                  {(causes[cat] || []).map((c, i) => (
                    <g key={i}>
                      <line x1={bx + 20} y1={by + 30} x2={bx + 20} y2={by + 32 + i * 20} stroke={color} strokeWidth={1} strokeDasharray="3 2" opacity="0.5" />
                      <text x={bx + 20} y={by + 47 + i * 20} textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontFamily="DM Sans, sans-serif">{c.length > 16 ? c.slice(0, 14) + '…' : c}</text>
                    </g>
                  ))}
                </g>
              );
            })}

            {/* Bottom bones: Material, Measurement, Mother Nature */}
            {[
              { cat: 'Material', bx: 120, by: 310 },
              { cat: 'Measurement', bx: 320, by: 310 },
              { cat: 'Mother Nature', bx: 520, by: 310 },
            ].map(({ cat, bx, by }) => {
              const spineX = bx + 70;
              const color = categoryColors[cat];
              return (
                <g key={cat}>
                  <line x1={bx} y1={by + 10} x2={spineX} y2="220" stroke={color} strokeWidth="2" />
                  <rect x={bx - 40} y={by} width={140} height={32} rx={8} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.5} />
                  <text x={bx + 30} y={by + 20} textAnchor="middle" fill={color} fontSize="12" fontWeight="700" fontFamily="Syne, sans-serif">{cat}</text>
                  {(causes[cat] || []).map((c, i) => (
                    <g key={i}>
                      <text x={bx + 30} y={by - 10 - i * 18} textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontFamily="DM Sans, sans-serif">{c.length > 16 ? c.slice(0, 14) + '…' : c}</text>
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Cause input panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {categories6M.map(cat => (
          <div key={cat} className="tool-panel" style={{ borderTop: `3px solid ${categoryColors[cat]}` }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: categoryColors[cat], marginBottom: 12 }}>
              {cat}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {(causes[cat] || []).map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--navy-3)', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: categoryColors[cat], flexShrink: 0 }}></span>
                  <span style={{ flex: 1 }}>{c}</span>
                  <button onClick={() => removeCause(cat, i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                </div>
              ))}
              {causes[cat]?.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic', padding: '4px 2px' }}>No causes added yet</div>
              )}
            </div>
            <div className="input-row">
              <div className="field-group" style={{ flex: 1, marginBottom: 0 }}>
                <input
                  className="input"
                  style={{ fontSize: 13 }}
                  placeholder={`Add ${cat} cause...`}
                  value={newCause[cat] || ''}
                  onChange={e => setNewCause(prev => ({ ...prev, [cat]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addCause(cat)}
                />
              </div>
              <button className="btn btn-outline" style={{ padding: '8px 12px', flexShrink: 0 }} onClick={() => addCause(cat)}>+</button>
            </div>
          </div>
        ))}
      </div>

      <div className="alert alert-info">
        <strong>📖 How to use:</strong> Enter your problem statement above, then brainstorm causes under each of the 6M categories. Click "+" or press Enter to add a cause. The fishbone diagram updates automatically. Focus on the categories with the most causes for investigation.
      </div>
    </div>
  );
}
