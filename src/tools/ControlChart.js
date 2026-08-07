import React, { useState, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import CSVUploader from '../components/CSVUploader';
import { useWorksheet } from '../context/WorksheetContext';
import { useReport } from '../context/ReportContext';
import { interpretControlChart } from '../utils/interpretations';
import './Tool.css';

// Standard I-MR constants (subgroup size n=2 for moving range)
const D2 = 1.128;   // used to estimate sigma from mRbar
const D4_IMR = 3.267;   // moving range UCL multiplier
const D3_IMR = 0;       // moving range LCL multiplier (0 for n=2)

// Standard X-bar & R control chart constants (Montgomery, "Introduction to Statistical
// Quality Control" — the standard published table for subgroup sizes n=2 through n=10).
// A2 scales R-bar into X-bar chart limits; D3/D4 scale R-bar into R-chart limits.
const XBAR_R_CONSTANTS = {
  2: { A2: 1.880, D3: 0,     D4: 3.267 },
  3: { A2: 1.023, D3: 0,     D4: 2.574 },
  4: { A2: 0.729, D3: 0,     D4: 2.282 },
  5: { A2: 0.577, D3: 0,     D4: 2.114 },
  6: { A2: 0.483, D3: 0,     D4: 2.004 },
  7: { A2: 0.419, D3: 0.076, D4: 1.924 },
  8: { A2: 0.373, D3: 0.136, D4: 1.864 },
  9: { A2: 0.337, D3: 0.184, D4: 1.816 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777 },
};

function calcStats(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;

  const movingRanges = [];
  for (let i = 1; i < n; i++) movingRanges.push(Math.abs(values[i] - values[i - 1]));
  const mrBar = movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length;

  const sigma = mrBar / D2;

  const ucl = mean + 3 * sigma;
  const lcl = mean - 3 * sigma;
  const mrUcl = D4_IMR * mrBar;
  const mrLcl = D3_IMR * mrBar;

  return { mean, sigma, mrBar, ucl, lcl, mrUcl, mrLcl, n, movingRanges };
}

// Groups raw (value, subgroupId) rows into ordered subgroups, computes X-bar (subgroup mean)
// and R (subgroup range) per subgroup, then derives X-bar/R chart control limits.
// Requires every subgroup to have the same size — mixed subgroup sizes aren't supported
// by the standard A2/D3/D4 constant table used here.
function calcXbarRStats(rows) {
  const bySubgroup = new Map();
  rows.forEach(r => {
    if (!bySubgroup.has(r.subgroup)) bySubgroup.set(r.subgroup, []);
    bySubgroup.get(r.subgroup).push(r.value);
  });

  const subgroups = [...bySubgroup.entries()].map(([id, values]) => ({ id, values }));
  const sizes = new Set(subgroups.map(s => s.values.length));
  if (sizes.size > 1) {
    throw new Error(`Subgroups must all be the same size — found sizes: ${[...sizes].join(', ')}. X-bar & R requires a constant subgroup size.`);
  }
  const n = subgroups[0]?.values.length || 0;
  if (n < 2 || n > 10) {
    throw new Error(`Subgroup size must be between 2 and 10 (found ${n}) — that's the standard range X-bar & R control constants are published for.`);
  }

  const { A2, D3, D4 } = XBAR_R_CONSTANTS[n];

  const subgroupStats = subgroups.map(s => {
    const xbar = s.values.reduce((a, b) => a + b, 0) / s.values.length;
    const r = Math.max(...s.values) - Math.min(...s.values);
    return { id: s.id, xbar, r, values: s.values };
  });

  const xbarBar = subgroupStats.reduce((a, s) => a + s.xbar, 0) / subgroupStats.length;
  const rBar = subgroupStats.reduce((a, s) => a + s.r, 0) / subgroupStats.length;

  const xbarUcl = xbarBar + A2 * rBar;
  const xbarLcl = xbarBar - A2 * rBar;
  const rUcl = D4 * rBar;
  const rLcl = D3 * rBar;

  return { subgroupStats, xbarBar, rBar, xbarUcl, xbarLcl, rUcl, rLcl, n, k: subgroupStats.length, A2, D3, D4 };
}

// ---------- CUSUM (tabular, two-sided) ----------
// Standard Montgomery formulas. k (the "allowance"/slack) is typically half the shift size
// you want to detect, expressed in sigma units — k = 0.5*sigma detects a 1-sigma shift with
// good speed. H (the decision interval) is typically 4-5 sigma. Verified via hand-trace on a
// small 5-point example, matching to 4+ decimals (deterministic recursive arithmetic — no
// probability distribution involved, so no external library needed for verification).
function cusumChart(values, target, sigma, kFactor, hFactor) {
  const k = kFactor * sigma;
  const H = hFactor * sigma;
  let cPlus = 0, cMinus = 0;
  const points = values.map((x, i) => {
    cPlus = Math.max(0, (x - target - k) + cPlus);
    cMinus = Math.max(0, (target - k - x) + cMinus);
    return { label: `${i + 1}`, x, cPlus, cMinus: -cMinus, outOfControl: cPlus > H || cMinus > H };
  });
  return { points, k, H, target, sigma };
}

// ---------- EWMA (Exponentially Weighted Moving Average) ----------
// Standard Montgomery formulas with exact (time-varying) control limits — the limits widen
// point by point until converging to their asymptotic width, rather than using the
// (slightly anti-conservative) fixed asymptotic limits from the very first point. lambda
// (weight given to the most recent observation) typically 0.05-0.3; smaller values detect
// smaller shifts more slowly. L (limit width in sigma units) typically 2.7-3. Verified via
// hand-trace on the same 5-point example, matching to 4+ decimals.
function ewmaChart(values, target, sigma, lambda, L) {
  let z = target;
  const points = values.map((x, i) => {
    z = lambda * x + (1 - lambda) * z;
    const factor = Math.sqrt((lambda / (2 - lambda)) * (1 - Math.pow(1 - lambda, 2 * (i + 1))));
    const ucl = target + L * sigma * factor;
    const lcl = target - L * sigma * factor;
    return { label: `${i + 1}`, x, z, ucl, lcl, outOfControl: z > ucl || z < lcl };
  });
  return { points, lambda, L, target, sigma };
}

// Western Electric Rules (applied to the Individuals chart, or the X-bar chart in X-bar/R mode)
function applyWesternElectricRules(values, mean, sigma) {
  const n = values.length;
  const flags = values.map(() => []);
  const zone = (v) => (v - mean) / sigma;

  for (let i = 0; i < n; i++) {
    const z = zone(values[i]);
    if (Math.abs(z) > 3) flags[i].push('Rule 1: beyond 3\u03C3 (special cause)');
  }for (let i = 2; i < n; i++) {
    const window = [i - 2, i - 1, i];
    const beyond2Pos = window.filter(idx => zone(values[idx]) > 2).length;
    const beyond2Neg = window.filter(idx => zone(values[idx]) < -2).length;
    if (beyond2Pos >= 2) flags[i].push('Rule 2: 2 of 3 points beyond 2\u03C3 (high side)');
    if (beyond2Neg >= 2) flags[i].push('Rule 2: 2 of 3 points beyond 2\u03C3 (low side)');
  }

  for (let i = 4; i < n; i++) {
    const window = [i - 4, i - 3, i - 2, i - 1, i];
    const beyond1Pos = window.filter(idx => zone(values[idx]) > 1).length;
    const beyond1Neg = window.filter(idx => zone(values[idx]) < -1).length;
    if (beyond1Pos >= 4) flags[i].push('Rule 3: 4 of 5 points beyond 1\u03C3 (high side)');
    if (beyond1Neg >= 4) flags[i].push('Rule 3: 4 of 5 points beyond 1\u03C3 (low side)');
  }

  for (let i = 7; i < n; i++) {
    const window = [];
    for (let k = i - 7; k <= i; k++) window.push(k);
    const allPos = window.every(idx => values[idx] > mean);
    const allNeg = window.every(idx => values[idx] < mean);
    if (allPos) flags[i].push('Rule 4: 8 consecutive points above centerline');
    if (allNeg) flags[i].push('Rule 4: 8 consecutive points below centerline');
  }

  return flags;
}

export default function ControlChart() {
  const { columns, getColumnData, getNumericColumns, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const chartWrapperRef = useRef(null);

  const [chartType, setChartType] = useState('imr'); // 'imr' | 'xbarR' | 'cusum' | 'ewma'

  const [data, setData] = useState(null);
  const [cols, setCols] = useState([]);
  const [valueCol, setValueCol] = useState('');
  const [subgroupCol, setSubgroupCol] = useState('');
  const [chartData, setChartData] = useState(null);
  const [mrChartData, setMrChartData] = useState(null);
  const [stats, setStats] = useState(null);

  const [xbarChartData, setXbarChartData] = useState(null);
  const [rChartData, setRChartData] = useState(null);
  const [xbarRStats, setXbarRStats] = useState(null);
  const [xbarRError, setXbarRError] = useState('');

  // CUSUM / EWMA shared parameters
  const [targetVal, setTargetVal] = useState('');
  const [sigmaVal, setSigmaVal] = useState('');
  const [cusumK, setCusumK] = useState(0.5);
  const [cusumH, setCusumH] = useState(5);
  const [ewmaLambda, setEwmaLambda] = useState(0.2);
  const [ewmaL, setEwmaL] = useState(3);
  const [cusumResult, setCusumResult] = useState(null);
  const [ewmaResult, setEwmaResult] = useState(null);
  const [cusumEwmaError, setCusumEwmaError] = useState('');

  const [addedToReport, setAddedToReport] = useState(false);

  const numericWsCols = getNumericColumns();
  const allWsCols = columns || [];

  const handleData = useCallback((rows, fields) => {
    setData(rows);
    setCols(fields);
    const numericCol = fields.find(f => typeof rows[0]?.[f] === 'number') || fields[0];
    setValueCol(numericCol);
  }, []);

  const loadFromWorksheet = (colName) => {
    const vals = getColumnData(colName);
    const rows = vals.map((v, i) => ({ value: v, label: `Sample ${i + 1}` }));
    setData(rows);
    setCols([colName]);
    setValueCol(colName);
    resetOutputs();
    // Pre-fill CUSUM/EWMA target & sigma with the column's own mean/sd — user can override.
    if (vals.length > 1) {
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((a, v) => a + (v - m) ** 2, 0) / (vals.length - 1));
      setTargetVal(m.toFixed(4));
      setSigmaVal(sd.toFixed(4));
    }
  };

  const resetOutputs = () => {
    setChartData(null); setMrChartData(null); setStats(null);
    setXbarChartData(null); setRChartData(null); setXbarRStats(null); setXbarRError('');
    setCusumResult(null); setEwmaResult(null); setCusumEwmaError('');
    setAddedToReport(false);
  };

  const analyzeIMR = useCallback(() => {
    if (!data || !valueCol) return;
    setAddedToReport(false);
    const values = data.map(r => +r[valueCol]).filter(v => !isNaN(v));
    const s = calcStats(values);
    setStats(s);

    const ruleFlags = applyWesternElectricRules(values, s.mean, s.sigma);

    const cd = data.map((r, i) => {
      const v = +r[valueCol];
      const flags = ruleFlags[i] || [];
      return { label: r.label || `${i + 1}`, value: v, ucl: s.ucl, lcl: s.lcl, mean: s.mean, outOfControl: flags.length > 0, flags };
    });
    setChartData(cd);

    const mrd = s.movingRanges.map((mr, i) => ({
      label: `${i + 2}`,
      mr, mrUcl: s.mrUcl, mrLcl: s.mrLcl, mrBar: s.mrBar,
      outOfControl: mr > s.mrUcl || mr < s.mrLcl,
    }));
    setMrChartData(mrd);
  }, [data, valueCol]);

  const analyzeXbarR = useCallback(() => {
    if (!valueCol || !subgroupCol) return;
    setAddedToReport(false);
    setXbarRError('');
    try {
      // When Worksheet data is loaded, pull BOTH columns directly by index — the single-column
      // loadFromWorksheet flow (built for I-MR) can't supply a second column for grouping.
      // Otherwise (manual CSV upload for this tool specifically), both columns already live
      // together in `data` from CSVUploader's parsed rows.
      let rows;
      if (hasData) {
        const values = getColumnData(valueCol).map(Number);
        const subgroupVals = getColumnData(subgroupCol);
        rows = values.map((v, i) => ({ value: v, subgroup: subgroupVals[i] }));
      } else {
        rows = (data || []).map(r => ({ value: +r[valueCol], subgroup: r[subgroupCol] }));
      }rows = rows.filter(r => !isNaN(r.value) && r.subgroup !== undefined && r.subgroup !== '');
      const s = calcXbarRStats(rows);
      setXbarRStats(s);

      // Sigma for X-bar chart Western Electric rules, estimated the standard way: sigma = Rbar / d2(n).
      const D2_TABLE = { 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078 };
      const sigmaXbar = (s.rBar / D2_TABLE[s.n]) / Math.sqrt(s.n);
      const xbarFlags = applyWesternElectricRules(s.subgroupStats.map(sg => sg.xbar), s.xbarBar, sigmaXbar);

      const xcd = s.subgroupStats.map((sg, i) => ({
        label: `${sg.id}`, value: sg.xbar, ucl: s.xbarUcl, lcl: s.xbarLcl, mean: s.xbarBar,
        outOfControl: (xbarFlags[i] || []).length > 0, flags: xbarFlags[i] || [],
      }));
      setXbarChartData(xcd);

      const rcd = s.subgroupStats.map(sg => ({ label: `${sg.id}`, r: sg.r, rUcl: s.rUcl, rLcl: s.rLcl, rBar: s.rBar,
        outOfControl: sg.r > s.rUcl || sg.r < s.rLcl,
      }));
      setRChartData(rcd);
    } catch (e) {
      setXbarRError(e.message);
    }
  }, [data, valueCol, subgroupCol, getColumnData, hasData]);

  const getRawValues = useCallback(() => {
    if (hasData) return getColumnData(valueCol).map(Number);
    return (data || []).map(r => +r[valueCol]).filter(v => !isNaN(v));
  }, [data, getColumnData, hasData, valueCol]);

  const analyzeCusum = useCallback(() => {
    if (!valueCol) return;
    setAddedToReport(false);
    setCusumEwmaError('');
    try {
      const values = getRawValues();
      const target = parseFloat(targetVal), sigma = parseFloat(sigmaVal);
      if (values.length < 2) throw new Error('Need at least 2 data points.');
      if (isNaN(target) || isNaN(sigma) || sigma <= 0) throw new Error('Enter a valid target and a positive sigma.');
      setCusumResult(cusumChart(values, target, sigma, parseFloat(cusumK), parseFloat(cusumH)));
    } catch (e) {
      setCusumEwmaError(e.message);
    }
  }, [valueCol, targetVal, sigmaVal, cusumK, cusumH, getRawValues]);

  const analyzeEwma = useCallback(() => {
    if (!valueCol) return;
    setAddedToReport(false);
    setCusumEwmaError('');
    try {
      const values = getRawValues();
      const target = parseFloat(targetVal), sigma = parseFloat(sigmaVal);
      if (values.length < 2) throw new Error('Need at least 2 data points.');
      if (isNaN(target) || isNaN(sigma) || sigma <= 0) throw new Error('Enter a valid target and a positive sigma.');
      const lambda = parseFloat(ewmaLambda);
      if (isNaN(lambda) || lambda <= 0 || lambda > 1) throw new Error('Lambda must be between 0 and 1.');
      setEwmaResult(ewmaChart(values, target, sigma, lambda, parseFloat(ewmaL)));
    } catch (e) {
      setCusumEwmaError(e.message);
    }
  }, [valueCol, targetVal, sigmaVal, ewmaLambda, ewmaL, getRawValues]);

  const violationCount = chartType === 'imr'
    ? (chartData ? chartData.filter(d => d.outOfControl).length : 0)
    : chartType === 'xbarR'
    ? (xbarChartData ? xbarChartData.filter(d => d.outOfControl).length + (rChartData ? rChartData.filter(d => d.outOfControl).length : 0) : 0)
    : chartType === 'cusum'
    ? (cusumResult ? cusumResult.points.filter(d => d.outOfControl).length : 0)
    : (ewmaResult ? ewmaResult.points.filter(d => d.outOfControl).length : 0);

  const handleAddToReport = useCallback(async () => {
    if (!chartWrapperRef.current) return;
    const canvas = await html2canvas(chartWrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    if (chartType === 'imr') {
      if (!stats || !chartData) return;
      const ruleBreakdown = { rule1: 0, rule2: 0, rule3: 0, rule4: 0 };
      chartData.forEach(d => (d.flags || []).forEach(f => {
        if (f.startsWith('Rule 1')) ruleBreakdown.rule1++;
        else if (f.startsWith('Rule 2')) ruleBreakdown.rule2++;
        else if (f.startsWith('Rule 3')) ruleBreakdown.rule3++;
        else if (f.startsWith('Rule 4')) ruleBreakdown.rule4++;
      }));
      const interpretation = interpretControlChart({ violationCount, totalPoints: chartData.length, ruleBreakdown });

      addReportItem({
        title: `I-MR Control Chart — ${valueCol}`,
        toolId: 'control-chart',
        timestamp: new Date().toISOString(),
        chartImage,
        statsSummary: {
          'Mean': stats.mean.toFixed(4), 'UCL': stats.ucl.toFixed(4), 'LCL': stats.lcl.toFixed(4),
          'Sigma (from MR)': stats.sigma.toFixed(4), 'MR-bar': stats.mrBar.toFixed(4), 'n': stats.n, 'Violations': violationCount,
        },
        interpretation,
        rawData: chartData.map(d => ({ label: d.label, value: d.value })),
      });
    } else if (chartType === 'xbarR') {
      if (!xbarRStats || !xbarChartData) return;
      const interpretation = violationCount > 0
        ? `${violationCount} point(s) across the X-bar and R charts triggered a Western Electric rule — investigate for special cause variation before treating the process as stable.`
        : `No Western Electric rule violations on either the X-bar or R chart — the process mean and within-subgroup variation both appear to be in statistical control (subgroup size n=${xbarRStats.n}).`;

      addReportItem({
        title: `X-bar & R Control Chart — ${valueCol} (subgroup: ${subgroupCol})`,
        toolId: 'control-chart',
        timestamp: new Date().toISOString(),
        chartImage,
        statsSummary: {
          'X-bar-bar': xbarRStats.xbarBar.toFixed(4), 'R-bar': xbarRStats.rBar.toFixed(4),
          'X-bar UCL': xbarRStats.xbarUcl.toFixed(4), 'X-bar LCL': xbarRStats.xbarLcl.toFixed(4),
          'R UCL': xbarRStats.rUcl.toFixed(4), 'R LCL': xbarRStats.rLcl.toFixed(4),
          'Subgroup size (n)': xbarRStats.n, 'Subgroups (k)': xbarRStats.k, 'Violations': violationCount,
        },
        interpretation,
        rawData: xbarRStats.subgroupStats.map(sg => ({ subgroup: sg.id, xbar: sg.xbar.toFixed(4), range: sg.r.toFixed(4) })),
      });
    } else if (chartType === 'cusum') {
      if (!cusumResult) return;
      const interpretation = violationCount > 0
        ? `${violationCount} point(s) exceeded the decision interval (H=${cusumResult.H.toFixed(4)}) — this signals a sustained shift away from the target of ${cusumResult.target.toFixed(4)}, worth investigating for special cause.`
        : `No CUSUM signal — the cumulative sums stayed within the decision interval (H=${cusumResult.H.toFixed(4)}), consistent with the process running on target at ${cusumResult.target.toFixed(4)}.`;
      addReportItem({
        title: `CUSUM Chart — ${valueCol}`,
        toolId: 'control-chart',
        timestamp: new Date().toISOString(),
        chartImage,
        statsSummary: { 'Target': cusumResult.target.toFixed(4), 'Sigma': cusumResult.sigma.toFixed(4), 'k (slack)': cusumResult.k.toFixed(4), 'H (decision interval)': cusumResult.H.toFixed(4), 'Violations': violationCount },
        interpretation,
        rawData: cusumResult.points.map(p => ({ label: p.label, value: p.x, cPlus: p.cPlus.toFixed(4), cMinus: p.cMinus.toFixed(4) })),
      });
    } else if (chartType === 'ewma') {
      if (!ewmaResult) return;
      const interpretation = violationCount > 0
        ? `${violationCount} point(s) fell outside the EWMA control limits — this signals a shift away from the target of ${ewmaResult.target.toFixed(4)}, worth investigating for special cause.`
        : `No EWMA signal — the smoothed statistic stayed within its control limits throughout, consistent with the process running on target at ${ewmaResult.target.toFixed(4)}.`;
      addReportItem({
        title: `EWMA Chart — ${valueCol}`,
        toolId: 'control-chart',
        timestamp: new Date().toISOString(),chartImage,
        statsSummary: { 'Target': ewmaResult.target.toFixed(4), 'Sigma': ewmaResult.sigma.toFixed(4), 'Lambda': ewmaResult.lambda.toFixed(4), 'L': ewmaResult.L.toFixed(4), 'Violations': violationCount },
        interpretation,
        rawData: ewmaResult.points.map(p => ({ label: p.label, value: p.x, ewma: p.z.toFixed(4) })),
      });
    }
    setAddedToReport(true);
  }, [chartType, stats, chartData, xbarRStats, xbarChartData, cusumResult, ewmaResult, valueCol, subgroupCol, violationCount, addReportItem]);

  return (
    <div style={{ padding: '1.5rem' }}>
      {hasData && numericWsCols.length > 0 && (
        <div className="ws-banner">
          <span>📊 Worksheet data available</span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {numericWsCols.map(c => (
              <button key={c.name} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                onClick={() => loadFromWorksheet(c.name)}>
                Use "{c.name}"
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.75rem' }}>Control Chart</h3>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button className={chartType === 'imr' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            onClick={() => { setChartType('imr'); resetOutputs(); }}>Individuals &amp; Moving Range (I-MR)</button>
          <button className={chartType === 'xbarR' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            onClick={() => { setChartType('xbarR'); resetOutputs(); }}>X-bar &amp; R</button>
          <button className={chartType === 'cusum' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            onClick={() => { setChartType('cusum'); resetOutputs(); }}>CUSUM</button>
          <button className={chartType === 'ewma' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            onClick={() => { setChartType('ewma'); resetOutputs(); }}>EWMA</button>
        </div>

        {!hasData && <CSVUploader onData={handleData} />}

        {/* X-bar & R + Worksheet data: both columns picked directly, no pre-load needed */}
        {hasData && chartType === 'xbarR' && (
          <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
            <div className="form-group">
              <label>Value Column</label>
              <select value={valueCol} onChange={e => setValueCol(e.target.value)}>
                <option value="">— select —</option>
                {numericWsCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Subgroup Column (groups rows into subgroups of equal size, e.g. "subgroup")</label>
              <select value={subgroupCol} onChange={e => setSubgroupCol(e.target.value)}>
                <option value="">— select —</option>
                {allWsCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* CUSUM / EWMA + Worksheet data: value column picker, no pre-load needed */}
        {hasData && (chartType === 'cusum' || chartType === 'ewma') && (
          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label>Value Column</label>
            <select value={valueCol} onChange={e => {
              setValueCol(e.target.value);
              const vals = getColumnData(e.target.value);
              if (vals.length > 1) {
                const m = vals.reduce((a, b) => a + b, 0) / vals.length;
                const sd = Math.sqrt(vals.reduce((a, v) => a + (v - m) ** 2, 0) / (vals.length - 1));
                setTargetVal(m.toFixed(4));
                setSigmaVal(sd.toFixed(4));
              }
            }}>
              <option value="">— select —</option>
              {numericWsCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        )}

        {/* I-MR, or X-bar & R / CUSUM / EWMA without worksheet data (manual CSV upload) */}
        {(!hasData || chartType === 'imr') && cols.length > 0 && (
          <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
            <div className="form-group">
              <label>Value Column</label>
              <select value={valueCol} onChange={e => setValueCol(e.target.value)}>
                {cols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {chartType === 'xbarR' && (
              <div className="form-group">
                <label>Subgroup Column (groups rows into subgroups of equal size, e.g. "subgroup")</label>
                <select value={subgroupCol} onChange={e => setSubgroupCol(e.target.value)}>
                  <option value="">— select —</option>
                  {cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>)}
          </div>
        )}

        {(chartType === 'cusum' || chartType === 'ewma') && (
          <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
            <div className="form-group">
              <label>Target (Center Value)</label>
              <input type="number" step="any" value={targetVal} onChange={e => setTargetVal(e.target.value)} placeholder="e.g. process mean" />
            </div>
            <div className="form-group">
              <label>Sigma (Process Std Dev)</label>
              <input type="number" step="any" value={sigmaVal} onChange={e => setSigmaVal(e.target.value)} placeholder="e.g. historical sigma" />
            </div>
            {chartType === 'cusum' ? (
              <>
                <div className="form-group">
                  <label>k (slack, in sigma units — default 0.5 detects a 1σ shift)</label>
                  <input type="number" step="0.05" value={cusumK} onChange={e => setCusumK(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>H (decision interval, in sigma units — default 5)</label>
                  <input type="number" step="0.5" value={cusumH} onChange={e => setCusumH(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>λ (lambda — weight on newest point, 0-1, default 0.2)</label>
                  <input type="number" step="0.05" min="0.01" max="1" value={ewmaLambda} onChange={e => setEwmaLambda(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>L (limit width, in sigma units — default 3)</label>
                  <input type="number" step="0.1" value={ewmaL} onChange={e => setEwmaL(e.target.value)} />
                </div>
              </>
            )}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={chartType === 'imr' ? analyzeIMR : chartType === 'xbarR' ? analyzeXbarR : chartType === 'cusum' ? analyzeCusum : analyzeEwma}disabled={
            chartType === 'imr'
              ? (!data || !valueCol)
              : chartType === 'xbarR'
              ? (!valueCol || !subgroupCol || (!hasData && !data))
              : (!valueCol || !targetVal || !sigmaVal || (!hasData && !data))
          }
        >
          Generate Charts
        </button>
        {xbarRError && <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>⚠️ {xbarRError}</div>}
        {cusumEwmaError && <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>⚠️ {cusumEwmaError}</div>}
      </div>

      {chartType === 'imr' && stats && (
        <div className="stat-grid">
          {[
            ['Mean', stats.mean.toFixed(4)], ['UCL', stats.ucl.toFixed(4)], ['LCL', stats.lcl.toFixed(4)],
            ['Sigma (from MR)', stats.sigma.toFixed(4)], ['MR-bar', stats.mrBar.toFixed(4)], ['n', stats.n],
          ].map(([l, v]) => (
            <div key={l} className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{v}</div><div className="stat-label">{l}</div></div>
          ))}
        </div>
      )}

      {chartType === 'xbarR' && xbarRStats && (
        <div className="stat-grid">
          {[
            ['X-bar-bar', xbarRStats.xbarBar.toFixed(4)], ['R-bar', xbarRStats.rBar.toFixed(4)],
            ['X-bar UCL', xbarRStats.xbarUcl.toFixed(4)], ['X-bar LCL', xbarRStats.xbarLcl.toFixed(4)],
            ['R UCL', xbarRStats.rUcl.toFixed(4)], ['Subgroup n / k', `${xbarRStats.n} / ${xbarRStats.k}`],
          ].map(([l, v]) => (
            <div key={l} className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{v}</div><div className="stat-label">{l}</div></div>
          ))}
        </div>
      )}

      {chartType === 'cusum' && cusumResult && (
        <div className="stat-grid">
          {[
            ['Target', cusumResult.target.toFixed(4)], ['Sigma', cusumResult.sigma.toFixed(4)],
            ['k (slack)', cusumResult.k.toFixed(4)], ['H (decision interval)', cusumResult.H.toFixed(4)],
          ].map(([l, v]) => (
            <div key={l} className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{v}</div><div className="stat-label">{l}</div></div>
          ))}
        </div>
      )}

      {chartType === 'ewma' && ewmaResult && (
        <div className="stat-grid">
          {[
            ['Target', ewmaResult.target.toFixed(4)], ['Sigma', ewmaResult.sigma.toFixed(4)],
            ['Lambda', ewmaResult.lambda.toFixed(4)], ['L', ewmaResult.L.toFixed(4)],
          ].map(([l, v]) => (
            <div key={l} className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{v}</div><div className="stat-label">{l}</div></div>
          ))}
        </div>
      )}

      {chartType === 'imr' && chartData && (
        <div className="chart-wrapper">
          <div ref={chartWrapperRef}>
          <h4 style={{ margin: '1rem 0 0.5rem' }}>Individuals Chart</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(val, name, props) => {
                  if (props.payload.flags && props.payload.flags.length) return [`${val} — ${props.payload.flags.join('; ')}`, 'Value'];
                  return [val, 'Value'];
                }}
              />
              <ReferenceLine y={stats.ucl} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'UCL', fill: 'var(--red)', fontSize: 11 }} />
              <ReferenceLine y={stats.mean} stroke="var(--green)" strokeDasharray="4 4" label={{ value: 'Mean', fill: 'var(--green)', fontSize: 11 }} />
              <ReferenceLine y={stats.lcl} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'LCL', fill: 'var(--red)', fontSize: 11 }} />
              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={(props) => {
                const { cx, cy, payload } = props;
                return <circle key={cx} cx={cx} cy={cy} r={4} fill={payload.outOfControl ? 'var(--red)' : 'var(--accent)'} />;
              }} />
            </LineChart>
          </ResponsiveContainer>

          <h4 style={{ margin: '1.5rem 0 0.5rem' }}>Moving Range Chart</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mrChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <ReferenceLine y={stats.mrUcl} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'UCL', fill: 'var(--red)', fontSize: 11 }} />
              <ReferenceLine y={stats.mrBar} stroke="var(--green)" strokeDasharray="4 4" label={{ value: 'MR-bar', fill: 'var(--green)', fontSize: 11 }} />
              <Line type="monotone" dataKey="mr" stroke="var(--accent)" strokeWidth={2} dot={(props) => {
                const { cx, cy, payload } = props;
                return <circle key={cx} cx={cx} cy={cy} r={4} fill={payload.outOfControl ? 'var(--red)' : 'var(--accent)'} />;
              }} />
            </LineChart>
          </ResponsiveContainer>
          </div>

          {violationCount > 0 ? (
            <div className="alert alert-danger">
              ⚠ {violationCount} point(s) triggered a Western Electric rule — investigate for special cause variation.
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                {chartData.filter(d => d.outOfControl).map((d, i) => (<li key={i}>{d.label}: {d.flags.join('; ')}</li>))}
              </ul>
            </div>
          ) : (
            <div className="alert alert-success">✓ No Western Electric rule violations — process appears to be in statistical control.</div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn-primary no-print" onClick={handleAddToReport}>{addedToReport ? '✓ Added to Report' : '📄 Add to Report'}</button>
          </div>
        </div>
      )}

      {chartType === 'xbarR' && xbarChartData && (
        <div className="chart-wrapper">
          <div ref={chartWrapperRef}>
          <h4 style={{ margin: '1rem 0 0.5rem' }}>X-bar Chart (Subgroup Means)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={xbarChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(val, name, props) => {
                  if (props.payload.flags && props.payload.flags.length) return [`${val} — ${props.payload.flags.join('; ')}`, 'X-bar'];
                  return [val, 'X-bar'];
                }}
              />
              <ReferenceLine y={xbarRStats.xbarUcl} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'UCL', fill: 'var(--red)', fontSize: 11 }} />
              <ReferenceLine y={xbarRStats.xbarBar} stroke="var(--green)" strokeDasharray="4 4" label={{ value: 'X-bar-bar', fill: 'var(--green)', fontSize: 11 }} />
              <ReferenceLine y={xbarRStats.xbarLcl} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'LCL', fill: 'var(--red)', fontSize: 11 }} />
              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={(props) => {
                const { cx, cy, payload } = props;return <circle key={cx} cx={cx} cy={cy} r={4} fill={payload.outOfControl ? 'var(--red)' : 'var(--accent)'} />;
              }} />
            </LineChart>
          </ResponsiveContainer>

          <h4 style={{ margin: '1.5rem 0 0.5rem' }}>R Chart (Subgroup Ranges)</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={rChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <ReferenceLine y={xbarRStats.rUcl} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'UCL', fill: 'var(--red)', fontSize: 11 }} />
              <ReferenceLine y={xbarRStats.rBar} stroke="var(--green)" strokeDasharray="4 4" label={{ value: 'R-bar', fill: 'var(--green)', fontSize: 11 }} />
              <Line type="monotone" dataKey="r" stroke="var(--accent)" strokeWidth={2} dot={(props) => {
                const { cx, cy, payload } = props;
                return <circle key={cx} cx={cx} cy={cy} r={4} fill={payload.outOfControl ? 'var(--red)' : 'var(--accent)'} />;
              }} />
            </LineChart>
          </ResponsiveContainer>
          </div>

          {violationCount > 0 ? (
            <div className="alert alert-danger">⚠ {violationCount} point(s) across the X-bar and R charts triggered a Western Electric rule — investigate for special cause variation.</div>
          ) : (
            <div className="alert alert-success">✓ No Western Electric rule violations — the process mean and within-subgroup variation both appear stable.</div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn-primary no-print" onClick={handleAddToReport}>{addedToReport ? '✓ Added to Report' : '📄 Add to Report'}</button>
          </div>
        </div>
      )}

      {chartType === 'cusum' && cusumResult && (
        <div className="chart-wrapper">
          <div ref={chartWrapperRef}>
          <h4 style={{ margin: '1rem 0 0.5rem' }}>CUSUM Chart</h4>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={cusumResult.points}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <ReferenceLine y={cusumResult.H} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'H', fill: 'var(--red)', fontSize: 11 }} />
              <ReferenceLine y={-cusumResult.H} stroke="var(--red)" strokeDasharray="4 4" label={{ value: '-H', fill: 'var(--red)', fontSize: 11 }} />
              <ReferenceLine y={0} stroke="var(--green)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="cPlus" name="C+" stroke="var(--accent)" strokeWidth={2} dot={(props) => {
                const { cx, cy, payload } = props;
                return <circle key={`p-${cx}`} cx={cx} cy={cy} r={4} fill={payload.cPlus > cusumResult.H ? 'var(--red)' : 'var(--accent)'} />;
              }} />
              <Line type="monotone" dataKey="cMinus" name="C-" stroke="var(--orange)" strokeWidth={2} dot={(props) => {
                const { cx, cy, payload } = props;
                return <circle key={`m-${cx}`} cx={cx} cy={cy} r={4} fill={payload.cMinus < -cusumResult.H ? 'var(--red)' : 'var(--orange)'} />;
              }} />
            </LineChart>
          </ResponsiveContainer>
          </div>

          {violationCount > 0 ? (
            <div className="alert alert-danger">⚠ {violationCount} point(s) exceeded the decision interval (±H = ±{cusumResult.H.toFixed(4)}) — this signals a sustained shift away from target.</div>
          ) : (
            <div className="alert alert-success">✓ No CUSUM signal — the cumulative sums stayed within the decision interval, consistent with the process running on target.</div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn-primary no-print" onClick={handleAddToReport}>{addedToReport ? '✓ Added to Report' : '📄 Add to Report'}</button>
          </div>
        </div>
      )}

      {chartType === 'ewma' && ewmaResult && (
        <div className="chart-wrapper">
          <div ref={chartWrapperRef}>
          <h4 style={{ margin: '1rem 0 0.5rem' }}>EWMA Chart</h4>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={ewmaResult.points}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <ReferenceLine y={ewmaResult.target} stroke="var(--green)" strokeDasharray="4 4" label={{ value: 'Target', fill: 'var(--green)', fontSize: 11 }} />
              <Line type="monotone" dataKey="ucl" name="UCL" stroke="var(--red)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="lcl" name="LCL" stroke="var(--red)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="z" name="EWMA" stroke="var(--accent)" strokeWidth={2} dot={(props) => {
                const { cx, cy, payload } = props;
                return <circle key={cx} cx={cx} cy={cy} r={4} fill={payload.outOfControl ? 'var(--red)' : 'var(--accent)'} />;
              }} />
            </LineChart>
          </ResponsiveContainer>
          </div>

          {violationCount > 0 ? (
            <div className="alert alert-danger">⚠ {violationCount} point(s) fell outside the EWMA control limits — this signals a shift away from target.</div>
          ) : (
            <div className="alert alert-success">✓ No EWMA signal — the smoothed statistic stayed within its control limits, consistent with the process running on target.</div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn-primary no-print" onClick={handleAddToReport}>{addedToReport ? '✓ Added to Report' : '📄 Add to Report'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
