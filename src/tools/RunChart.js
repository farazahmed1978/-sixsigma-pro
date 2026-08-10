import React, { useState, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import CSVUploader from '../components/CSVUploader';
import { useWorksheet } from '../context/WorksheetContext';
import { useProjectReportPlacement as useReport } from '../context/ProjectPlacementContext';
import { interpretRunChart } from '../utils/interpretations';
import './Tool.css';

const median = arr => { const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Carry ties forward to the previous sign (standard runs-test handling of exact-median values)
function signsAboutMedian(values, med) {
  const raw = values.map(v => (v === med ? 0 : v > med ? 1 : -1));
  const signs = [...raw];
  for (let i = 0; i < signs.length; i++) {
    if (signs[i] === 0) {
      if (i > 0) signs[i] = signs[i - 1];
      else {
        const nextNonZero = signs.slice(i + 1).find(s => s !== 0);
        signs[i] = nextNonZero || 1;
      }
    }
  }
  return signs;
}

function countRuns(signs) {
  let runs = 1;
  for (let i = 1; i < signs.length; i++) if (signs[i] !== signs[i - 1]) runs++;
  return runs;
}

function longestRun(signs) {
  let max = 1, cur = 1;
  for (let i = 1; i < signs.length; i++) {
    if (signs[i] === signs[i - 1]) { cur++; max = Math.max(max, cur); }
    else cur = 1;
  }
  return max;
}

// Longest consecutive monotonic (strictly increasing or decreasing) streak, in points
function longestTrend(values) {
  let maxUp = 1, curUp = 1, maxDown = 1, curDown = 1;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) { curUp++; curDown = 1; }
    else if (values[i] < values[i - 1]) { curDown++; curUp = 1; }
    else { curUp = 1; curDown = 1; }
    maxUp = Math.max(maxUp, curUp);
    maxDown = Math.max(maxDown, curDown);
  }
  return Math.max(maxUp, maxDown);
}

// Normal-approximation runs test: flags if actual run count is outside ~95% CI of expected
function runsTest(n, actualRuns) {
  const expected = n / 2 + 1;
  const variance = (n * (n - 2)) / (4 * (n - 1));
  const sd = Math.sqrt(Math.max(variance, 0));
  const z = sd > 0 ? (actualRuns - expected) / sd : 0;
  return { expected, sd, z, flag: Math.abs(z) > 1.96 };
}

function analyzeRunChart(values) {
  const n = values.length;
  const med = median(values);
  const signs = signsAboutMedian(values, med);
  const runsCount = countRuns(signs);
  const { expected, flag: runsFlag } = runsTest(n, runsCount);
  const longestRunLen = longestRun(signs);
  const shiftFlag = longestRunLen >= 8;
  const trendLen = longestTrend(values);
  const trendFlag = trendLen >= 6;

  return { n, median: med, runsCount, expectedRuns: expected, runsFlag, longestRunLen, shiftFlag, trendLen, trendFlag };
}

export default function RunChart() {
  const { getNumericColumns, getColumnData, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const chartWrapperRef = useRef(null);
  const [values, setValues] = useState(null);
  const [colName, setColName] = useState('');
  const [chartData, setChartData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [addedToReport, setAddedToReport] = useState(false);

  const numericWsCols = getNumericColumns();

  const processValues = (vals, name) => {
    setValues(vals); setColName(name); setAddedToReport(false);
    const med = median(vals);
    setChartData(vals.map((v, i) => ({ x: i + 1, value: v, median: med, above: v > med })));
    setAnalysis(analyzeRunChart(vals));
  };

  const handleData = (rows, fields) => {
    const numCol = fields.find(f => !isNaN(+rows[0]?.[f])) || fields[0];
    processValues(rows.map(r => +r[numCol]).filter(v => !isNaN(v)), numCol);
  };

  const handleAddToReport = useCallback(async () => {
    if (!chartWrapperRef.current || !analysis) return;

    const canvas = await html2canvas(chartWrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const interpretation = interpretRunChart(analysis);

    addReportItem({
      title: `Run Chart — ${colName}`,
      toolId: 'run-chart',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: {
        'Median': analysis.median.toFixed(4),
        'n': analysis.n,
        'Runs Observed': analysis.runsCount,
        'Runs Expected': analysis.expectedRuns.toFixed(1),
        'Longest Run': analysis.longestRunLen,
        'Longest Trend': analysis.trendLen,
      },
      interpretation,
      rawData: values ? values.map((v, i) => ({ sample: i + 1, value: v })) : [],
    });

    setAddedToReport(true);
  }, [analysis, colName, values, addReportItem]);

  const med = analysis ? analysis.median : null;

  return (
    <div style={{ padding: '1.5rem' }}>
      {hasData && numericWsCols.length > 0 && (
        <div className="ws-banner">
          <span>📊 Worksheet data available</span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {numericWsCols.map(c => (
              <button key={c.name} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                onClick={() => processValues(getColumnData(c.name), c.name)}>
                Use "{c.name}"
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Run Chart</h3>
        {!hasData && <CSVUploader onData={handleData} />}
      </div>
      {chartData && (
        <div className="chart-wrapper">
          <div ref={chartWrapperRef}>
            <div className="section-title" style={{ marginBottom: '0.75rem' }}>{colName} — Run Chart (Median = {med.toFixed(4)})</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="x" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <ReferenceLine y={med} stroke="var(--orange)" strokeDasharray="4 4" label={{ value: 'Median', fill: 'var(--orange)', fontSize: 11 }} />
                <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4, fill: 'var(--accent)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {analysis && (
            <div className="stat-grid" style={{ marginTop: '1rem' }}>
              {[
                ['Runs Observed', analysis.runsCount],
                ['Runs Expected', analysis.expectedRuns.toFixed(1)],
                ['Longest Run', analysis.longestRunLen],
                ['Longest Trend', analysis.trendLen],
              ].map(([l, v]) => (
                <div key={l} className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{v}</div><div className="stat-label">{l}</div></div>
              ))}
            </div>
          )}

          {analysis && (analysis.runsFlag || analysis.shiftFlag || analysis.trendFlag) ? (
            <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>
              ⚠ Non-random pattern detected —
              {analysis.shiftFlag && ` shift (run of ${analysis.longestRunLen}).`}
              {analysis.trendFlag && ` trend (${analysis.trendLen} consecutive points).`}
              {analysis.runsFlag && ` unusual number of runs (${analysis.runsCount} vs ${analysis.expectedRuns.toFixed(1)} expected).`}
            </div>
          ) : (
            <div className="alert alert-success" style={{ marginTop: '0.75rem' }}>✓ No shift, trend, or unusual runs pattern detected — process appears to vary randomly around a stable median.</div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn-primary no-print" onClick={handleAddToReport}>
              {addedToReport ? 'Manage Placement' : 'Add to Project'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
