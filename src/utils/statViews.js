import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Line, ComposedChart } from 'recharts';
import { invNorm } from './statMath';

const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const stddev = arr => { const m = mean(arr); return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1)); };

// Q-Q plot against a normal distribution — points should fall near the diagonal line if the
// data is approximately normal. Works on raw data or ANOVA residuals.
export function QQPlot({ data, title = 'Normal Q-Q Plot' }) {
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const m = mean(data), sd = stddev(data);
  const points = sorted.map((v, i) => ({ x: invNorm((i + 0.5) / n), y: v }));
  const xs = points.map(p => p.x);
  const lineData = [
    { x: Math.min(...xs), y: m + sd * Math.min(...xs) },
    { x: Math.max(...xs), y: m + sd * Math.max(...xs) },
  ];
  return (
    <div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>{title}</div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name="Theoretical Quantile" label={{ value: 'Theoretical Quantile', position: 'insideBottom', offset: -5, fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name="Sample Value" label={{ value: 'Sample Value', angle: -90, position: 'insideLeft', fontSize: 11 }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v) => v.toFixed(3)} />
          <Line data={lineData} dataKey="y" stroke="#94a3b8" dot={false} strokeDasharray="4 4" isAnimationActive={false} />
          <Scatter data={points} fill="#6366f1" />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
        Points close to the dashed line indicate approximately normal data.
      </div>
    </div>
  );
}

export function SimpleHistogram({ data, bins = 10, title = 'Histogram' }) {
  const min = Math.min(...data), max = Math.max(...data);
  const width = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  data.forEach(v => { let idx = Math.floor((v - min) / width); if (idx >= bins) idx = bins - 1; if (idx < 0) idx = 0; counts[idx]++; });
  const chartData = counts.map((c, i) => ({ range: `${(min + i * width).toFixed(1)}–${(min + (i + 1) * width).toFixed(1)}`, count: c }));
  return (
    <div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>{title}</div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="range" angle={-35} textAnchor="end" height={50} fontSize={10} />
          <YAxis allowDecimals={false} fontSize={11} />
          <Tooltip />
          <Bar dataKey="count" fill="#6366f1" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Custom SVG box plot (recharts has no native box-plot primitive). One box per group.
export function GroupBoxPlot({ groups, labels, title = 'Box Plot by Group' }) {
  const stats = groups.map(g => {
    const s = [...g].sort((a, b) => a - b);
    const q = (p) => { const idx = p * (s.length - 1); const lo = Math.floor(idx), hi = Math.ceil(idx); return s[lo] + (s[hi] - s[lo]) * (idx - lo); };
    return { min: s[0], q1: q(0.25), median: q(0.5), q3: q(0.75), max: s[s.length - 1] };
  });
  const globalMin = Math.min(...stats.map(s => s.min));
  const globalMax = Math.max(...stats.map(s => s.max));
  const range = globalMax - globalMin || 1;
  const H = 240, padTop = 20, padBottom = 30, plotH = H - padTop - padBottom;
  const yPos = (v) => padTop + plotH - ((v - globalMin) / range) * plotH;
  const boxW = 60, gap = 100 / groups.length;

  return (
    <div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>{title}</div>
      <svg width="100%" height={H} viewBox={`0 0 ${groups.length * 120} ${H}`} preserveAspectRatio="xMidYMid meet">
        {stats.map((s, i) => {
          const cx = i * 120 + 60;
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={yPos(s.min)} y2={yPos(s.max)} stroke="#64748b" strokeWidth={1.5} />
              <rect x={cx - boxW / 2} y={yPos(s.q3)} width={boxW} height={Math.max(yPos(s.q1) - yPos(s.q3), 1)} fill="#818cf8" stroke="#4f46e5" strokeWidth={1.5} />
              <line x1={cx - boxW / 2} x2={cx + boxW / 2} y1={yPos(s.median)} y2={yPos(s.median)} stroke="#312e81" strokeWidth={2} />
              <line x1={cx - boxW / 4} x2={cx + boxW / 4} y1={yPos(s.min)} y2={yPos(s.min)} stroke="#64748b" strokeWidth={1.5} />
              <line x1={cx - boxW / 4} x2={cx + boxW / 4} y1={yPos(s.max)} y2={yPos(s.max)} stroke="#64748b" strokeWidth={1.5} />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--text-secondary, #475569)">{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
