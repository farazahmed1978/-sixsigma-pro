import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { useWorksheet } from '../context/WorksheetContext';
import { useProjectReportPlacement as useReport } from '../context/ProjectPlacementContext';
import { interpretAnova, interpretRMAnova, interpretTwoWayAnova } from '../utils/interpretations';
import {
  oneWayAnova, rmAnova, twoWayAnova, levenesTest, bartlettsTest, andersonDarling,
  pairwisePostHoc, pairwisePostHocPaired, mauchlysTest, simpleEffectsAnalysis, gamesHowell, tukeyHsd, TEST_EXPLAINERS
} from '../utils/statTests';
import { QQPlot, SimpleHistogram, GroupBoxPlot } from '../utils/statViews';
import { buildAssumptionReport } from '../utils/assumptionDiagnostics';
import AssumptionReportCard from '../components/AssumptionReportCard';
import './Tool.css';

// An expandable companion-test card. Shows a plain-English explainer plus the "Run" action —
// nothing computes until the user opts in.
function CompanionTest({ label, explainer, onRun, renderResult }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleClick = () => {
    if (!open && !result) { try { setError(''); setResult(onRun()); } catch (runError) { setError(runError.message); } }
    setOpen(o => !o);
  };

  return (
    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '0.75rem' }}>
      <button
        className="btn-secondary"
        style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={handleClick}
      >
        <span>{label}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{open ? '▲ Hide' : '▼ Run / View'}</span>
      </button>
      {open && (
        <div style={{ marginTop: '0.85rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-3)', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
            {explainer}
          </div>
          {result && renderResult(result)}
          {error && <div className="alert alert-danger" role="alert"><strong>Unable to run this companion analysis</strong><div>{error}</div></div>}
        </div>
      )}
    </div>
  );
}

const sigBadge = (p, sigLabel = 'Statistically significant', nsLabel = 'Not statistically significant') => (
  <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: p < 0.05 ? 'rgba(239,68,68,0.12)' : 'rgba(0,196,140,0.12)', color: p < 0.05 ? '#ef4444' : '#00c48c' }}>
    {p < 0.05 ? sigLabel : nsLabel}
  </span>
);
const assumptionBadge = (p) => sigBadge(p, 'Assumption violated', 'Assumption holds');

export default function AnovaTool() {
  const { columns, getColumnData, getRawColumnData, getNumericColumns, getCategoricalColumns, hasData } = useWorksheet();
  const { addReportItem, addReportOnly } = useReport();
  const location = useLocation();
  const resultsRef = useRef(null);

  const [mode, setMode] = useState('oneway'); // 'oneway' | 'rm' | 'twoway'
  const [addedToReport, setAddedToReport] = useState(false);

  const [groupingVar, setGroupingVar] = useState('');
  const [outcomeVar, setOutcomeVar] = useState('');
  const [owResult, setOwResult] = useState(null);
  const [owGroups, setOwGroups] = useState(null);

  const [conditionVars, setConditionVars] = useState([]);
  const [rmResult, setRmResult] = useState(null);

  const [factorAVar, setFactorAVar] = useState('');
  const [factorBVar, setFactorBVar] = useState('');
  const [twOutcomeVar, setTwOutcomeVar] = useState('');
  const [twResult, setTwResult] = useState(null);
  const [twError, setTwError] = useState('');

  const [showQQ, setShowQQ] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const [showBox, setShowBox] = useState(true);

  const numCols = getNumericColumns ? getNumericColumns() : columns.filter(c => c.data.some(v => !isNaN(parseFloat(v))));
  const catCols = getCategoricalColumns ? getCategoricalColumns() : [];

  // Pre-fill from the guided flow (GuidedHome) if variables were passed via router state.
  useEffect(() => {
    const metric = location.state?.selectedMetric || [];
    const categorical = location.state?.selectedCategorical || [];
    if (categorical[0]) setGroupingVar(categorical[0]);
    if (metric[0]) setOutcomeVar(metric[0]);
    if (metric.length >= 3) { setConditionVars(metric); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCondition = (name) => setConditionVars(p => p.includes(name) ? p.filter(c => c !== name) : [...p, name]);
  const resetResults = () => { setOwResult(null); setOwGroups(null); setRmResult(null); setTwResult(null); setTwError(''); setAddedToReport(false); };

  const runOneWay = () => {
    setAddedToReport(false);
    const outcomeRaw = getRawColumnData(outcomeVar);
    const groupRaw = getRawColumnData(groupingVar);
    const minLen = Math.min(outcomeRaw.length, groupRaw.length);
    const pairs = [];
    for (let i = 0; i < minLen; i++) {
      const v = parseFloat(outcomeRaw[i]);
      if (!isNaN(v) && groupRaw[i] !== undefined && groupRaw[i] !== '') {
        pairs.push({ group: groupRaw[i], value: v });
      }
    }
    const labels = [...new Set(pairs.map(p => p.group))];
    const groups = labels.map(lab => pairs.filter(p => p.group === lab).map(p => p.value));
    if (groups.length < 2 || groups.some(g => g.length < 2)) return;
    setOwGroups({ groups, labels });
    setOwResult(oneWayAnova(groups));
    setRmResult(null);
  };

  const runRM = () => {
    setAddedToReport(false);
    if (conditionVars.length < 3) return;
    const conditions = conditionVars.map(v => getColumnData(v).map(Number));
    const minLen = Math.min(...conditions.map(c => c.length));
    const trimmed = conditions.map(c => c.slice(0, minLen));
    setRmResult({ ...rmAnova(trimmed), conditions: trimmed });
    setOwResult(null);
    setOwGroups(null);
  };

  const runTwoWay = () => {
    setAddedToReport(false);
    setTwError('');
    if (!factorAVar || !factorBVar || !twOutcomeVar) return;
    try {
      const aData = getRawColumnData(factorAVar);
      const bData = getRawColumnData(factorBVar);
      const outcomeRaw = getRawColumnData(twOutcomeVar);
      const minLen = Math.min(aData.length, bData.length, outcomeRaw.length);
      const rows = [];
      for (let i = 0; i < minLen; i++) {const v = parseFloat(outcomeRaw[i]);
        if (!isNaN(v) && aData[i] !== undefined && aData[i] !== '' && bData[i] !== undefined && bData[i] !== '') {
          rows.push({ a: aData[i], b: bData[i], value: v });
        }
      }
      setTwResult(twoWayAnova(rows));
    } catch (e) {
      setTwError(e.message);
    }
  };

  const handleAddToReport = useCallback(async (reportOnly=false) => {
    if (!resultsRef.current) return;
    const canvas = await html2canvas(resultsRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    if (mode === 'oneway' && owResult && owGroups) {
      const interpretation = interpretAnova(owResult, groupingVar, outcomeVar, owGroups.labels);
      (reportOnly?addReportOnly:addReportItem)({
        title: `One-Way ANOVA — ${outcomeVar} by ${groupingVar}`,
        toolId: 'anova',
        timestamp: new Date().toISOString(),
        chartImage,
        statsSummary: { 'F': owResult.F.toFixed(3), 'df': `${owResult.dfB}, ${owResult.dfW}`, 'p-value': owResult.p.toFixed(4), 'η²': owResult.etaSq.toFixed(3) },
        interpretation,
        assumptionReport: buildAssumptionReport({ values: owResult.residuals, groups: owGroups.groups }),
        provenance: { method: 'one-way-anova', methodVersion: '1.0.0', nAnalyzed: owGroups.groups.reduce((sum, group) => sum + group.length, 0), missingHandling: { policy: 'complete-case', omitted: 0 } },
        rawData: owGroups.labels.map((lab, i) => ({ group: lab, n: owGroups.groups[i].length, mean: owResult.groupStats[i].mean.toFixed(4), sd: owResult.groupStats[i].sd.toFixed(4) })),
      });
    } else if (mode === 'rm' && rmResult) {
      const interpretation = interpretRMAnova(rmResult, conditionVars);
      (reportOnly?addReportOnly:addReportItem)({
        title: `Repeated-Measures ANOVA — ${conditionVars.join(', ')}`,
        toolId: 'anova',
        timestamp: new Date().toISOString(),
        chartImage,
        statsSummary: { 'F': rmResult.F.toFixed(3), 'df': `${rmResult.dfCond}, ${rmResult.dfError}`, 'p-value': rmResult.p.toFixed(4), 'η²': rmResult.etaSq.toFixed(3) },
        interpretation,
        rawData: conditionVars.map((v, i) => ({ condition: v, mean: rmResult.condMeans[i].toFixed(4) })),
      });
    } else if (mode === 'twoway' && twResult) {
      const interpretation = interpretTwoWayAnova(twResult, factorAVar, factorBVar, twOutcomeVar);
      (reportOnly?addReportOnly:addReportItem)({
        title: `Two-Way ANOVA — ${twOutcomeVar} by ${factorAVar} × ${factorBVar}`,
        toolId: 'anova',
        timestamp: new Date().toISOString(),
        chartImage,
        statsSummary: {
          [`F (${factorAVar})`]: twResult.Fa.toFixed(3), [`p (${factorAVar})`]: twResult.pa.toFixed(4),
          [`F (${factorBVar})`]: twResult.Fb.toFixed(3), [`p (${factorBVar})`]: twResult.pb.toFixed(4),
          'F (Interaction)': twResult.Fab.toFixed(3), 'p (Interaction)': twResult.pab.toFixed(4),
        },
        interpretation,
        rawData: twResult.cellStats.map(c => ({ [factorAVar]: c.a, [factorBVar]: c.b, n: c.n, mean: c.mean.toFixed(4) })),
      });
    }
    if(reportOnly)setAddedToReport(previous=>!previous);
  }, [mode, owResult, owGroups, rmResult, twResult, groupingVar, outcomeVar, conditionVars, factorAVar, factorBVar, twOutcomeVar, addReportItem, addReportOnly]);

  if (!hasData) {
    return <div style={{ padding: '1.5rem' }}><div className="alert alert-info">Load data into the Worksheet first, then return here to run ANOVA.</div></div>;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.5rem' }}>ANOVA</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Compare means across 3 or more groups or conditions.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <button className={mode === 'oneway' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={() => { setMode('oneway'); resetResults(); }}>One-Way ANOVA</button>
          <button className={mode === 'twoway' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={() => { setMode('twoway'); resetResults(); }}>Two-Way ANOVA</button>
          <button className={mode === 'rm' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={() => { setMode('rm'); resetResults(); }}>Repeated Measures ANOVA</button>
        </div>

        {mode === 'oneway' ? (
          <>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Grouping Variable (categorical)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {catCols.map(c => (
                  <button key={c.name} onClick={() => setGroupingVar(c.name)}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '999px', border: `1px solid ${groupingVar === c.name ? 'var(--accent)' : 'var(--border)'}`, background: groupingVar === c.name ? 'var(--accent-dim)' : 'var(--input-bg)', color: groupingVar === c.name ? 'var(--accent-light)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                    {c.name}
                  </button>
                ))}
                {catCols.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No categorical columns detected.</span>}
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Outcome Variable (metric)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {numCols.map(c => (
                  <button key={c.name} onClick={() => setOutcomeVar(c.name)}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '999px', border: `1px solid ${outcomeVar === c.name ? 'var(--accent)' : 'var(--border)'}`, background: outcomeVar === c.name ? 'var(--accent-dim)' : 'var(--input-bg)', color: outcomeVar === c.name ? 'var(--accent-light)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary" disabled={!groupingVar || !outcomeVar} onClick={runOneWay}>Run ANOVA</button>
          </>
        ) : mode === 'twoway' ? (
          <>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Factor A (categorical)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {catCols.map(c => (
                  <button key={c.name} onClick={() => setFactorAVar(c.name)}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '999px', border: `1px solid ${factorAVar === c.name ? 'var(--accent)' : 'var(--border)'}`, background: factorAVar === c.name ? 'var(--accent-dim)' : 'var(--input-bg)', color: factorAVar === c.name ? 'var(--accent-light)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                    {c.name}
                  </button>
                ))}
                {catCols.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No categorical columns detected.</span>}
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Factor B (categorical, different from Factor A)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {catCols.filter(c => c.name !== factorAVar).map(c => (
                  <button key={c.name} onClick={() => setFactorBVar(c.name)}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '999px', border: `1px solid ${factorBVar === c.name ? 'var(--accent)' : 'var(--border)'}`, background: factorBVar === c.name ? 'var(--accent-dim)' : 'var(--input-bg)', color: factorBVar === c.name ? 'var(--accent-light)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                    {c.name}
                  </button>
                ))}
                {catCols.filter(c => c.name !== factorAVar).length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Need a second categorical column.</span>}
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Outcome Variable (metric)</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {numCols.map(c => (
                  <button key={c.name} onClick={() => setTwOutcomeVar(c.name)}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '999px', border: `1px solid ${twOutcomeVar === c.name ? 'var(--accent)' : 'var(--border)'}`, background: twOutcomeVar === c.name ? 'var(--accent-dim)' : 'var(--input-bg)', color: twOutcomeVar === c.name ? 'var(--accent-light)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Requires a balanced design — every combination of Factor A and Factor B needs the same number of rows (2 or more).
            </p>
            <button className="btn-primary" disabled={!factorAVar || !factorBVar || !twOutcomeVar} onClick={runTwoWay}>Run Two-Way ANOVA</button>
            {twError && <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>⚠️ {twError}</div>}
          </>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Conditions (select 3 or more metric columns — same subjects, one column per condition)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {numCols.map(c => (
                  <label key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.35rem 0.75rem', borderRadius: '999px', border: `1px solid ${conditionVars.includes(c.name) ? 'var(--accent)' : 'var(--border)'}`, background: conditionVars.includes(c.name) ? 'var(--accent-dim)' : 'var(--input-bg)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={conditionVars.includes(c.name)} onChange={() => toggleCondition(c.name)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
            <button className="btn-primary" disabled={conditionVars.length < 3} onClick={runRM}>Run Repeated Measures ANOVA</button>
          </>
        )}
      </div>

      {(owResult || rmResult || twResult) && (
        <div ref={resultsRef}>
          {mode === 'oneway' && owResult && owGroups && (
            <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 className="section-title" style={{ margin: 0 }}>One-Way ANOVA Result</h3>
                {sigBadge(owResult.p)}
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <div>F({owResult.dfB},{owResult.dfW}) = <b>{owResult.F.toFixed(3)}</b></div>
                <div>p = <b>{owResult.p.toFixed(4)}</b></div>
                <div>η² = <b>{owResult.etaSq.toFixed(3)}</b></div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <thead><tr>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: 'var(--text-muted)' }}>Group</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>n</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>Mean</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>SD</th>
                </tr></thead>
                <tbody>
                  {owGroups.labels.map((lab, i) => (
                    <tr key={lab}>
                      <td style={{ padding: '0.4rem', borderTop: '1px solid var(--border)' }}>{lab}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{owGroups.groups[i].length}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{owResult.groupStats[i].mean.toFixed(4)}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{owResult.groupStats[i].sd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{interpretAnova(owResult, groupingVar, outcomeVar, owGroups.labels)}</p>
            </div>
          )}

          {mode === 'rm' && rmResult && (
            <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 className="section-title" style={{ margin: 0 }}>Repeated Measures ANOVA Result</h3>
                {sigBadge(rmResult.p)}
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <div>F({rmResult.dfCond},{rmResult.dfError}) = <b>{rmResult.F.toFixed(3)}</b></div>
                <div>p = <b>{rmResult.p.toFixed(4)}</b></div>
                <div>η² = <b>{rmResult.etaSq.toFixed(3)}</b></div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <thead><tr>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: 'var(--text-muted)' }}>Condition</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>Mean</th>
                </tr></thead>
                <tbody>
                  {conditionVars.map((v, i) => (
                    <tr key={v}>
                      <td style={{ padding: '0.4rem', borderTop: '1px solid var(--border)' }}>{v}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{rmResult.condMeans[i].toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{interpretRMAnova(rmResult, conditionVars)}</p>
            </div>
          )}

          {mode === 'twoway' && twResult && (
            <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 className="section-title" style={{ margin: 0 }}>Two-Way ANOVA Result</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <thead><tr>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: 'var(--text-muted)' }}>Source</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>SS</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>df</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>F</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>p</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}></th>
                </tr></thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.4rem', borderTop: '1px solid var(--border)' }}>{factorAVar}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{twResult.ssa.toFixed(3)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{twResult.dfA}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{twResult.Fa.toFixed(3)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{twResult.pa.toFixed(4)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{sigBadge(twResult.pa)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.4rem', borderTop: '1px solid var(--border)' }}>{factorBVar}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{twResult.ssb.toFixed(3)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{twResult.dfB}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{twResult.Fb.toFixed(3)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{twResult.pb.toFixed(4)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{sigBadge(twResult.pb)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.4rem', borderTop: '1px solid var(--border)' }}>{factorAVar} × {factorBVar} (Interaction)</td><td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{twResult.ssab.toFixed(3)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{twResult.dfAB}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{twResult.Fab.toFixed(3)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{twResult.pab.toFixed(4)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{sigBadge(twResult.pab)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.4rem', borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>Error</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>{twResult.sse.toFixed(3)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>{twResult.dfE}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}></td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}></td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}></td>
                  </tr>
                </tbody>
              </table>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <thead><tr>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: 'var(--text-muted)' }}>{factorAVar}</th>
                  <th style={{ textAlign: 'left', padding: '0.4rem', color: 'var(--text-muted)' }}>{factorBVar}</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>n</th>
                  <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>Mean</th>
                </tr></thead>
                <tbody>
                  {twResult.cellStats.map((c, i) => (
                    <tr key={i}>
                      <td style={{ padding: '0.4rem', borderTop: '1px solid var(--border)' }}>{c.a}</td>
                      <td style={{ padding: '0.4rem', borderTop: '1px solid var(--border)' }}>{c.b}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{c.n}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{c.mean.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{interpretTwoWayAnova(twResult, factorAVar, factorBVar, twOutcomeVar)}</p>
            </div>
          )}

          {/* Shared graphical views */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button className={showBox ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }} onClick={() => setShowBox(s => !s)}>Box Plot</button>
            <button className={showHist ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }} onClick={() => setShowHist(s => !s)}>Histogram</button>
            <button className={showQQ ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }} onClick={() => setShowQQ(s => !s)}>Q-Q Plot (Residuals)</button>
          </div>

          {mode === 'oneway' && owGroups && (
            <>
              {showBox && <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><GroupBoxPlot groups={owGroups.groups} labels={owGroups.labels} title={`${outcomeVar} by ${groupingVar}`} /></div>}
              {showHist && <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><SimpleHistogram data={owGroups.groups.flat()} title={`${outcomeVar} Distribution`} /></div>}
              {showQQ && <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><QQPlot data={owResult.residuals} title="Q-Q Plot of ANOVA Residuals" /></div>}
            </>
          )}
          {mode === 'rm' && rmResult && (
            <>
              {showBox && <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><GroupBoxPlot groups={rmResult.conditions} labels={conditionVars} title="Conditions Compared" /></div>}
              {showHist && <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><SimpleHistogram data={rmResult.conditions.flat()} title="Pooled Distribution" /></div>}
              {showQQ && <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><QQPlot data={rmResult.residuals} title="Q-Q Plot of RM ANOVA Residuals" /></div>}
            </>
          )}
          {mode === 'twoway' && twResult && (
            <>
              {showBox && <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><GroupBoxPlot groups={twResult.cellStats.map(c => c.values)} labels={twResult.cellStats.map(c => `${c.a}, ${c.b}`)} title={`${twOutcomeVar} by ${factorAVar} × ${factorBVar}`} /></div>}
              {showHist && <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><SimpleHistogram data={twResult.cellStats.flatMap(c => c.values)} title={`${twOutcomeVar} Distribution`} /></div>}
              {showQQ && <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><QQPlot data={twResult.residuals} title="Q-Q Plot of Two-Way ANOVA Residuals" /></div>}
            </>
          )}

          {mode === 'oneway' && owResult && owGroups && <AssumptionReportCard report={buildAssumptionReport({ values: owResult.residuals, groups: owGroups.groups })} />}

          {/* Companion tests */}
          <div style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Companion Tests</div>

          {mode === 'oneway' && owGroups && (
            <>
              <CompanionTest label="Check Normality — Anderson-Darling Test" explainer={TEST_EXPLAINERS.andersonDarling}
                onRun={() => andersonDarling(owResult.residuals)}
                renderResult={(r) => (<div style={{ fontSize: '0.85rem' }}>A² = {r.A2.toFixed(4)}, p = {r.p.toFixed(4)} &nbsp; {assumptionBadge(r.p)}</div>)}
              />
              <CompanionTest label="Check Equal Variance — Levene's Test" explainer={TEST_EXPLAINERS.levene}
                onRun={() => levenesTest(owGroups.groups)}
                renderResult={(r) => (<div style={{ fontSize: '0.85rem' }}>F({r.dfB},{r.dfW}) = {r.F.toFixed(4)}, p = {r.p.toFixed(4)} &nbsp; {assumptionBadge(r.p)}</div>)}
              />
              <CompanionTest label="Check Equal Variance — Bartlett's Test" explainer={TEST_EXPLAINERS.bartlett}
                onRun={() => bartlettsTest(owGroups.groups)}
                renderResult={(r) => (<div style={{ fontSize: '0.85rem' }}>χ² ({r.df}) = {r.chi2.toFixed(4)}, p = {r.p.toFixed(4)} &nbsp; {assumptionBadge(r.p)}</div>)}
              />
              <CompanionTest label="Post-Hoc — Tukey HSD (equal-variance simultaneous inference)" explainer="Uses the studentized-range distribution and Tukey-Kramer standard errors. Use after an equal-variance one-way ANOVA to identify which group means differ while controlling family-wise error."
                onRun={() => tukeyHsd(owGroups.groups, owGroups.labels)}
                renderResult={(result) => (<table style={{width:'100%',borderCollapse:'collapse',fontSize:'.82rem'}}><thead><tr><th>Comparison</th><th>Difference</th><th>95% simultaneous CI</th><th>Adjusted p</th></tr></thead><tbody>{result.pairs.map(pair=><tr key={`${pair.a}-${pair.b}`}><td>{pair.a} vs {pair.b}</td><td>{pair.difference.toFixed(4)}</td><td>{pair.confidenceInterval.map(value=>value.toFixed(4)).join(' to ')}</td><td>{pair.pAdjusted<.001?'<0.001':pair.pAdjusted.toFixed(4)}</td></tr>)}</tbody></table>)}
              />
              <CompanionTest label="Post-Hoc — Bonferroni-Corrected Pairwise Comparisons (simple approximation)" explainer={TEST_EXPLAINERS.posthoc}
                onRun={() => pairwisePostHoc(owGroups.groups, owGroups.labels)}
                renderResult={(pairs) => (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead><tr>
                      <th style={{ textAlign: 'left', padding: '0.35rem' }}>Comparison</th>
                      <th style={{ textAlign: 'right', padding: '0.35rem' }}>Diff</th>
                      <th style={{ textAlign: 'right', padding: '0.35rem' }}>p (adj.)</th>
                      <th style={{ textAlign: 'right', padding: '0.35rem' }}></th>
                    </tr></thead>
                    <tbody>
                      {pairs.map((pr, i) => (
                        <tr key={i}>
                          <td style={{ padding: '0.35rem', borderTop: '1px solid var(--border)' }}>{pr.a} vs {pr.b}</td>
                          <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{pr.diff.toFixed(4)}</td>
                          <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{pr.pAdj.toFixed(4)}</td>
                          <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{sigBadge(pr.pAdj, 'Differs', 'No difference')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              />
              <CompanionTest label="Post-Hoc — Games-Howell (exact, recommended)" explainer="The recommended post-hoc test when group variances may be unequal — uses the exact studentized range distribution rather than a Bonferroni approximation, so it's both more accurate and properly accounts for testing multiple pairs at once (no separate correction needed)."
                onRun={() => gamesHowell(owGroups.groups, owGroups.labels)}
                renderResult={(pairs) => (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead><tr>
                      <th style={{ textAlign: 'left', padding: '0.35rem' }}>Comparison</th>
                      <th style={{ textAlign: 'right', padding: '0.35rem' }}>Diff</th>
                      <th style={{ textAlign: 'right', padding: '0.35rem' }}>p</th>
                      <th style={{ textAlign: 'right', padding: '0.35rem' }}></th>
                    </tr></thead>
                    <tbody>
                      {pairs.map((pr, i) => (
                        <tr key={i}>
                          <td style={{ padding: '0.35rem', borderTop: '1px solid var(--border)' }}>{pr.a} vs {pr.b}</td>
                          <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{pr.diff.toFixed(4)}</td>
                          <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{pr.p < 0.001 ? '<0.001' : pr.p.toFixed(4)}</td>
                          <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{sigBadge(pr.p, 'Differs', 'No difference')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              /></>
          )}

          {mode === 'rm' && rmResult && (
            <>
              <CompanionTest label="Check Sphericity — Mauchly's Test" explainer={TEST_EXPLAINERS.mauchly}
                onRun={() => mauchlysTest(rmResult.conditions)}
                renderResult={(r) => (<div style={{ fontSize: '0.85rem' }}>W = {r.W.toFixed(4)}, χ²({r.df}) = {r.chi2.toFixed(4)}, p = {r.p.toFixed(4)} &nbsp; {assumptionBadge(r.p)}</div>)}
              />
              <CompanionTest label="Check Normality per Condition — Anderson-Darling" explainer={TEST_EXPLAINERS.andersonDarling}
                onRun={() => conditionVars.map((v, i) => ({ v, ...andersonDarling(rmResult.conditions[i]) }))}
                renderResult={(rows) => (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead><tr><th style={{ textAlign: 'left', padding: '0.35rem' }}>Condition</th><th style={{ textAlign: 'right', padding: '0.35rem' }}>A²</th><th style={{ textAlign: 'right', padding: '0.35rem' }}>p</th><th></th></tr></thead>
                    <tbody>{rows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '0.35rem', borderTop: '1px solid var(--border)' }}>{r.v}</td>
                        <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{r.A2.toFixed(4)}</td>
                        <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{r.p.toFixed(4)}</td>
                        <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{assumptionBadge(r.p)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              />
              <CompanionTest label="Post-Hoc Pairwise Comparisons (Paired, Bonferroni-corrected)" explainer={TEST_EXPLAINERS.posthoc}
                onRun={() => pairwisePostHocPaired(rmResult.conditions, conditionVars)}
                renderResult={(pairs) => (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead><tr>
                      <th style={{ textAlign: 'left', padding: '0.35rem' }}>Comparison</th>
                      <th style={{ textAlign: 'right', padding: '0.35rem' }}>Diff</th>
                      <th style={{ textAlign: 'right', padding: '0.35rem' }}>p (adj.)</th>
                      <th style={{ textAlign: 'right', padding: '0.35rem' }}></th>
                    </tr></thead>
                    <tbody>
                      {pairs.map((pr, i) => (
                        <tr key={i}>
                          <td style={{ padding: '0.35rem', borderTop: '1px solid var(--border)' }}>{pr.a} vs {pr.b}</td>
                          <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{pr.diff.toFixed(4)}</td>
                          <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{pr.pAdj.toFixed(4)}</td>
                          <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{sigBadge(pr.pAdj, 'Differs', 'No difference')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              />
            </>
          )}

          {mode === 'twoway' && twResult && (
            <>
              <CompanionTest label="Check Normality — Anderson-Darling Test (on residuals)" explainer={TEST_EXPLAINERS.andersonDarling}
                onRun={() => andersonDarling(twResult.residuals)}
                renderResult={(r) => (<div style={{ fontSize: '0.85rem' }}>A² = {r.A2.toFixed(4)}, p = {r.p.toFixed(4)} &nbsp; {assumptionBadge(r.p)}</div>)}
              />
              <CompanionTest label="Check Equal Variance — Levene's Test (across all cells)" explainer={TEST_EXPLAINERS.levene}
                onRun={() => levenesTest(twResult.cellStats.map(c => c.values))}
                renderResult={(r) => (<div style={{ fontSize: '0.85rem' }}>F({r.dfB},{r.dfW}) = {r.F.toFixed(4)}, p = {r.p.toFixed(4)} &nbsp; {assumptionBadge(r.p)}</div>)}
              />
              <CompanionTest label={`Simple Effects — ${factorAVar} within each level of ${factorBVar}, and vice versa`} explainer="If the interaction is significant, this breaks it down further: tests whether Factor A has an effect at each individual level of Factor B (and Factor B at each level of Factor A), using the pooled error term from the full model. This tells you exactly where the interaction is coming from."
                onRun={() => simpleEffectsAnalysis(twResult)}
                renderResult={(r) => (
                  <>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>{factorAVar} within each {factorBVar}</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '1rem' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left', padding: '0.35rem' }}>{factorBVar} =</th>
                        <th style={{ textAlign: 'right', padding: '0.35rem' }}>F</th>
                        <th style={{ textAlign: 'right', padding: '0.35rem' }}>p</th>
                        <th style={{ textAlign: 'right', padding: '0.35rem' }}></th>
                      </tr></thead>
                      <tbody>
                        {r.aWithinB.map((row, i) => (
                          <tr key={i}>
                            <td style={{ padding: '0.35rem', borderTop: '1px solid var(--border)' }}>{row.level}</td>
                            <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>F({row.df1},{row.df2}) = {row.F.toFixed(3)}</td>
                            <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{row.p.toFixed(4)}</td>
                            <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{sigBadge(row.p)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>{factorBVar} within each {factorAVar}</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left', padding: '0.35rem' }}>{factorAVar} =</th>
                        <th style={{ textAlign: 'right', padding: '0.35rem' }}>F</th>
                        <th style={{ textAlign: 'right', padding: '0.35rem' }}>p</th>
                        <th style={{ textAlign: 'right', padding: '0.35rem' }}></th>
                      </tr></thead>
                      <tbody>
                        {r.bWithinA.map((row, i) => (
                          <tr key={i}>
                            <td style={{ padding: '0.35rem', borderTop: '1px solid var(--border)' }}>{row.level}</td>
                            <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>F({row.df1},{row.df2}) = {row.F.toFixed(3)}</td>
                            <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{row.p.toFixed(4)}</td>
                            <td style={{ padding: '0.35rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{sigBadge(row.p)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              />
            </>
          )}

          <div style={{display:'flex',gap:'.75rem',marginTop:'1rem'}}><button className="btn-primary no-print" onClick={()=>handleAddToReport(false)}>Add to Project</button><button className="btn-secondary no-print" onClick={()=>handleAddToReport(true)}>{addedToReport?'Remove from Report':'Add to Report'}</button></div>
        </div>
      )}
    </div>
  );
}
