import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { useWorksheet } from '../context/WorksheetContext';
import { useProjectReportPlacement as useReport } from '../context/ProjectPlacementContext';
import { interpretAnova, interpretRMAnova } from '../utils/interpretations';
import {
  oneWayAnova, rmAnova, levenesTest, bartlettsTest, andersonDarling,
  pairwisePostHoc, pairwisePostHocPaired, mauchlysTest, TEST_EXPLAINERS
} from '../utils/statTests';
import { QQPlot, SimpleHistogram, GroupBoxPlot } from '../utils/statViews';
import './Tool.css';

// An expandable companion-test card. Shows a plain-English explainer plus the "Run" action —
// nothing computes until the user opts in.
function CompanionTest({ label, explainer, onRun, renderResult }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);

  const handleClick = () => {
    if (!open && !result) setResult(onRun());
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
  const { columns, getColumnData, getNumericColumns, getCategoricalColumns, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const location = useLocation();
  const resultsRef = useRef(null);

  const [mode, setMode] = useState('oneway'); // 'oneway' | 'rm'
  const [addedToReport, setAddedToReport] = useState(false);

  const [groupingVar, setGroupingVar] = useState('');
  const [outcomeVar, setOutcomeVar] = useState('');
  const [owResult, setOwResult] = useState(null);
  const [owGroups, setOwGroups] = useState(null);

  const [conditionVars, setConditionVars] = useState([]);
  const [rmResult, setRmResult] = useState(null);

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

  const resetResults = () => { setOwResult(null); setOwGroups(null); setRmResult(null); setAddedToReport(false); };

  const runOneWay = () => {
    setAddedToReport(false);
    const outcomeData = getColumnData(outcomeVar).map(Number);
    const groupData = getColumnData(groupingVar);
    const labels = [...new Set(groupData)];
    const groups = labels.map(lab => outcomeData.filter((_, i) => groupData[i] === lab));
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

  const handleAddToReport = useCallback(async () => {
    if (!resultsRef.current) return;
    const canvas = await html2canvas(resultsRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    if (mode === 'oneway' && owResult && owGroups) {
      const interpretation = interpretAnova(owResult, groupingVar, outcomeVar, owGroups.labels);
      addReportItem({
        title: `One-Way ANOVA — ${outcomeVar} by ${groupingVar}`,
        toolId: 'anova',
        timestamp: new Date().toISOString(),
        chartImage,
        statsSummary: { 'F': owResult.F.toFixed(3), 'df': `${owResult.dfB}, ${owResult.dfW}`, 'p-value': owResult.p.toFixed(4), 'η²': owResult.etaSq.toFixed(3) },
        interpretation,
        rawData: owGroups.labels.map((lab, i) => ({ group: lab, n: owGroups.groups[i].length, mean: owResult.groupStats[i].mean.toFixed(4), sd: owResult.groupStats[i].sd.toFixed(4) })),
      });
    } else if (mode === 'rm' && rmResult) {
      const interpretation = interpretRMAnova(rmResult, conditionVars);
      addReportItem({
        title: `Repeated-Measures ANOVA — ${conditionVars.join(', ')}`,
        toolId: 'anova',
        timestamp: new Date().toISOString(),
        chartImage,
        statsSummary: { 'F': rmResult.F.toFixed(3), 'df': `${rmResult.dfCond}, ${rmResult.dfError}`, 'p-value': rmResult.p.toFixed(4), 'η²': rmResult.etaSq.toFixed(3) },
        interpretation,
        rawData: conditionVars.map((v, i) => ({ condition: v, mean: rmResult.condMeans[i].toFixed(4) })),
      });
    }
    setAddedToReport(true);
  }, [mode, owResult, owGroups, rmResult, groupingVar, outcomeVar, conditionVars, addReportItem]);

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

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button className={mode === 'oneway' ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={() => { setMode('oneway'); resetResults(); }}>One-Way ANOVA</button>
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

      {(owResult || rmResult) && (
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
              <CompanionTest label="Post-Hoc Pairwise Comparisons (Tukey/Games-Howell approximation)" explainer={TEST_EXPLAINERS.posthoc}
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
            </>
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

          <button className="btn-primary no-print" style={{ marginTop: '1rem' }} onClick={handleAddToReport}>
            {addedToReport ? 'Manage Placement' : 'Add to Project'}
          </button>
        </div>
      )}
    </div>
  );
}
