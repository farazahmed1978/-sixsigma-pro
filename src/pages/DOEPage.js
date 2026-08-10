import React, { useState } from 'react';
import {Link} from 'react-router-dom';
import {useWorksheet} from '../context/WorksheetContext';
import {useAnalysis} from '../context/AnalysisContext';
import {createAnalysisHandoff} from '../services/analysisHandoff';
import { BOOK_EXCERPTS } from '../utils/bookExcerpts';
import {
  analyzeFactorial,
  generateFractionalFactorial as generateFractionalEngine,
  generateFullFactorial as generateFullEngine,
  optimizeFactorial,
  recordConfirmationRun,
} from '../utils/doeEngine';
import './DOEPage.css';

function generateFractional(factors) {
  return generateFractionalEngine(factors);
  /* Legacy generator retained in history; the engine now owns reproducibility and alias metadata.
  // 2^(k-1) resolution IV design — drop last factor as alias of other interactions
  const k = factors.length;
  const runs = Math.pow(2, k - 1);
  const base = factors.slice(0, k - 1);
  const design = [];
  for (let i = 0; i < runs; i++) {
    const run = { run: i + 1 };
    let product = 1;
    base.forEach((f, j) => {
      const period = Math.pow(2, k - j - 2);
      const coded = Math.floor(i / period) % 2 === 0 ? -1 : 1;
      run[f.name] = coded === -1 ? f.low : f.high;
      run[`_coded_${j}`] = coded;
      product *= coded;
    });
    const last = factors[k - 1];
    run[last.name] = product === -1 ? last.low : last.high;
    design.push(run);
  }
  return design; */
}

const EMPTY_FACTOR = { name: '', low: '', high: '' };

export default function DOEPage() {
  const {activeDataset}=useWorksheet();
  const analysisContext=useAnalysis();
  const [factors, setFactors] = useState([
    { name: 'Temperature', low: '150', high: '200' },
    { name: 'Pressure', low: '10', high: '20' },
    { name: 'Time', low: '30', high: '60' },
  ]);
  const [design, setDesign] = useState('full');
  const [response, setResponse] = useState('Yield');
  const [replicates, setReplicates] = useState(1);
  const [randomSeed, setRandomSeed] = useState(20260809);
  const [matrix, setMatrix] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [optimization, setOptimization] = useState(null);
  const [confirmationValue, setConfirmationValue] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const bookExcerpt = BOOK_EXCERPTS.doe;

  const addFactor = () => setFactors(p => [...p, { ...EMPTY_FACTOR }]);
  const removeFactor = (i) => setFactors(p => p.filter((_, j) => j !== i));
  const updateFactor = (i, field, val) => setFactors(p => p.map((f, j) => j === i ? { ...f, [field]: val } : f));

  const generate = () => {
    setError('');
    try {
      const valid = factors.filter(f => f.name && f.low !== '' && f.high !== '').map(f => ({...f, low: Number(f.low), high: Number(f.high)}));
      if (valid.length < 2) throw new Error('Define at least two factors with low and high levels.');
      const model = design === 'full'
        ? generateFullEngine({factors: valid, replicates, randomSeed, response})
        : generateFractional({factors: valid, replicates, randomSeed, response});
      const rows = model.runs.map(run => ({...run.factorSettings, run: run.standardOrder, runOrder: run.runOrder, replicate: run.replicate}));
      setMatrix({rows, factors: valid, doeModel: model});
      setResults(rows.map(row => ({run: row.runOrder, response: ''})));
      setOptimization(null);
      setConfirmationValue('');
    } catch (generationError) {
      setError(generationError.message);
    }
  };

  const optimize = () => {
    try {
      setError('');
      setOptimization(optimizeFactorial(matrix.doeModel, matrix.fullAnalysis, {type: 'maximize'}));
    } catch (optimizationError) {
      setError(optimizationError.message);
    }
  };

  const confirm = () => {
    try {
      setError('');
      const updatedModel = recordConfirmationRun(matrix.doeModel, optimization, {observed: confirmationValue, responseName: response});
      setMatrix(previous => ({...previous, doeModel: updatedModel}));
      setConfirmationValue('');
    } catch (confirmationError) {
      setError(confirmationError.message);
    }
  };

  const updateResult = (i, val) => setResults(p => p.map((r, j) => j === i ? { ...r, response: val } : r));

  const analyze = () => {
    setError('');
    try {
      if (!matrix) throw new Error('Generate a design before analyzing results.');
      if (results.some(r => r.response === '' || !Number.isFinite(Number(r.response)))) throw new Error('Enter a finite response for every run before analysis.');
      const modelWithResponses = {...matrix.doeModel, runs: matrix.doeModel.runs.map((run, index) => ({...run, response: Number(results[index].response)}))};
      const analysis = analyzeFactorial(modelWithResponses, response);
      setMatrix(previous => ({...previous, doeModel: modelWithResponses, fullAnalysis: analysis, effects: null}));
    } catch (analysisError) {
      setError(analysisError.message);
    }
  };

  const totalRuns = (() => {
    const k = factors.filter(f => f.name).length;
    if (k < 2) return 0;
    return (design === 'full' ? Math.pow(2, k) : Math.pow(2, k - 1)) * replicates;
  })();
  const handoff=destination=>createAnalysisHandoff({sourceTool:'doe',destination,projectId:analysisContext?.projectId||activeDataset?.projectId||'',datasetId:activeDataset?.id||'',datasetVersion:activeDataset?.version||1,datasetName:activeDataset?.name||'',selectedColumns:[...(matrix?.factors?.map(f=>f.name)||factors.map(f=>f.name).filter(Boolean)),response],factors:matrix?.factors?.map(f=>f.name)||factors.map(f=>f.name).filter(Boolean),response,metadata:{design,replicates}});

  return (
    <div className="doe-page">
      <div className="doe-header">
        <div>
          <h1>Design of Experiments (DOE)</h1>
          <p>Generate experimental designs and analyze factor effects on your response variable.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {bookExcerpt && (
            <button className={`btn ${showGuide ? 'btn-primary' : 'btn-ghost'} no-print`} onClick={() => setShowGuide(g => !g)}>
              {showGuide ? '📊 Hide Guide' : '📖 Show Guide'}
            </button>
          )}
          {matrix && <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print Design</button>}
        </div>
      </div>

      {showGuide && bookExcerpt && (
        <div className="info-panel animate-in no-print" style={{ marginBottom: '1.25rem' }}>
          <div className="info-block">
            <div className="info-block-title">📖 From the Book — <em style={{ fontWeight: 500 }}>{bookExcerpt.chapter}</em></div>
            <div style={{ fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
              {bookExcerpt.text.split('\n\n').map((para, i, arr) => (
                <p key={i} style={{ marginBottom: i < arr.length - 1 ? '0.85rem' : 0 }}>{para}</p>
              ))}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.6rem', fontStyle: 'italic' }}>
              Excerpted from <strong>The Black Belt Standard</strong> by Faraz Ahmed.
            </div>
          </div>
        </div>
      )}

      <div className="doe-layout">
        {/* Setup panel */}
        <div className="card doe-setup">
          <h3 className="section-title" style={{ marginBottom: '1.25rem' }}>Experiment Setup</h3>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Response Variable (Y)</label>
            <input type="text" value={response} onChange={e => setResponse(e.target.value)} placeholder="e.g. Yield, Strength, Cycle Time" />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Design Type</label>
            <select value={design} onChange={e => setDesign(e.target.value)}>
              <option value="full">Full Factorial (2ᵏ) — all combinations</option>
              <option value="fractional">Fractional Factorial (2ᵏ⁻¹) — half the runs</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Replicates</label>
            <select value={replicates} onChange={e => setReplicates(parseInt(e.target.value))}>
              {[1, 2, 3].map(r => <option key={r} value={r}>{r} {r === 1 ? '(no replication)' : `(× ${r})`}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Randomization seed</label>
            <input type="number" value={randomSeed} onChange={event => setRandomSeed(Number(event.target.value))} />
            <small style={{color:'var(--text-muted)'}}>Use the same seed to reproduce the exact run order.</small>
          </div>

          <div className="section-title" style={{ marginBottom: '0.75rem' }}>Factors</div>{factors.map((f, i) => (
            <div key={i} className="doe-factor-row">
              <input type="text" placeholder="Factor name" value={f.name} onChange={e => updateFactor(i, 'name', e.target.value)} style={{ flex: 2 }} />
              <input type="text" placeholder="Low (−)" value={f.low} onChange={e => updateFactor(i, 'low', e.target.value)} style={{ flex: 1 }} />
              <input type="text" placeholder="High (+)" value={f.high} onChange={e => updateFactor(i, 'high', e.target.value)} style={{ flex: 1 }} />
              {factors.length > 2 && <button className="btn-ghost" onClick={() => removeFactor(i)} style={{ padding: '0.35rem' }}>✕</button>}
            </div>
          ))}
          <button className="btn-ghost" onClick={addFactor} style={{ marginTop: '0.5rem', marginBottom: '1.25rem' }}>+ Add Factor</button>

          {totalRuns > 0 && (
            <div className="doe-run-preview">
              <span>Total runs: <strong>{totalRuns}</strong></span>
              <span>{design === 'full' ? `Full factorial 2^${factors.filter(f=>f.name).length}` : `Fractional 2^${factors.filter(f=>f.name).length-1}`}</span>
            </div>
          )}

          <button className="btn-primary" style={{ width: '100%', marginTop: '0.75rem' }} onClick={generate}>Generate Design Matrix</button>
          {error && <div className="validation-alert error" role="alert" style={{marginTop:'.75rem'}}><strong>Unable to complete DOE workflow</strong><span>{error}</span></div>}
        </div>

        {/* Matrix + results */}
        <div className="doe-right">
          {!matrix ? (
            <div className="empty-state card">
              <div className="empty-state-icon">⚗️</div>
              <h3>Setup your experiment</h3>
              <p>Define factors and levels on the left, then generate the randomized run order.</p>
            </div>
          ) : (
            <>
              <div className="card" style={{ overflow: 'auto', padding: 0 }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="section-title">Randomized Run Order — Enter Results</span>
                  <button className="btn-primary" onClick={analyze} style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}>Analyze Effects</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Run</th>
                        {matrix.factors.map(f => <th key={f.name}>{f.name}</th>)}
                        <th style={{ color: 'var(--accent-light)' }}>{response} (Y)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.rows.map((row, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{row.runOrder}</td>
                          {matrix.factors.map(f => (
                            <td key={f.name} style={{ fontWeight: row[f.name] === f.high ? 600 : 400, color: row[f.name] === f.high ? 'var(--accent-light)' : 'var(--text-secondary)' }}>
                              {row[f.name]} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({row[f.name] === f.high ? '+' : '−'})</span>
                            </td>
                          ))}
                          <td>
                            <input type="number" step="any"
                              style={{ width: '90px', padding: '0.3rem 0.5rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.88rem', outline: 'none' }}
                              value={results[i]?.response || ''}
                              onChange={e => updateResult(i, e.target.value)}
                              placeholder="—"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {matrix.doeModel?.designType === 'fractional-factorial-2-level' && (
                <div className="card" style={{marginTop:'1.25rem'}}>
                  <div className="section-title">Fractional design structure</div>
                  <p>Resolution <strong>{matrix.doeModel.resolution}</strong> · Generator <strong>{Object.entries(matrix.doeModel.generators || {}).map(([target,sources]) => `${target}=${sources.join('×')}`).join(', ')}</strong></p>
                  <p style={{color:'var(--text-muted)',fontSize:'.84rem'}}>Alias structure: {matrix.doeModel.aliases?.map(alias => `${alias.term} = ${alias.aliases.join(', ')}`).join('; ')}</p>
                  {matrix.doeModel.warnings?.map(warning => <div className="validation-alert warning" key={warning}>{warning}</div>)}
                </div>
              )}

              {matrix.fullAnalysis && (
                <div className="card" style={{ marginTop: '1.25rem' }}>
                  <div className="section-title" style={{ marginBottom: '0.5rem' }}>Effects &amp; ANOVA — {design === 'full' ? 'Full Factorial' : 'Fractional Factorial'}</div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Grand mean: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{matrix.fullAnalysis.grandMean.toFixed(3)}</strong>
                    {matrix.fullAnalysis.hasReplication
                      ? <> — Error: SS={matrix.fullAnalysis.ssError.toFixed(3)}, df={matrix.fullAnalysis.dfError}, MS={matrix.fullAnalysis.msError.toFixed(4)}</>
                      : <span style={{ color: 'var(--orange)' }}> — No replication: effects are estimable, but there's no error term to compute p-values from. Add replicates (left panel) for significance testing, or judge magnitude only.</span>
                    }
                  </p>
                  <table className="data-table">
                    <thead>
                      <tr><th>Term</th><th>Order</th><th>Effect</th><th>SS</th>{matrix.fullAnalysis.hasReplication && <><th>F</th><th>p</th></>}<th>Impact</th></tr>
                    </thead>
                    <tbody>
                      {matrix.fullAnalysis.effects.map(e => {
                        const maxSs = Math.max(...matrix.fullAnalysis.effects.map(x => x.ss));const sig = e.p !== null && e.p < 0.05;
                        return (
                          <tr key={e.term}>
                            <td style={{ fontWeight: e.order === 1 ? 600 : 400, color: 'var(--text-primary)' }}>{e.term}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{e.order === 1 ? 'Main' : `${e.order}-way`}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', color: e.effect > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                              {e.effect > 0 ? '+' : ''}{e.effect.toFixed(4)}
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{e.ss.toFixed(3)}</td>
                            {matrix.fullAnalysis.hasReplication && <>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>{e.F.toFixed(3)}</td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: sig ? 700 : 400, color: sig ? 'var(--accent-light)' : 'var(--text-secondary)' }}>{e.p < 0.001 ? '<0.001' : e.p.toFixed(4)}</td>
                            </>}
                            <td>
                              <div style={{ width: '80px', height: '6px', background: 'var(--bg-3)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, e.ss / maxSs * 100)}%`, height: '100%', background: e.effect > 0 ? 'var(--green)' : 'var(--red)', borderRadius: '3px' }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{marginTop:'1rem',display:'flex',gap:'.75rem',alignItems:'center',flexWrap:'wrap'}}>
                    <button className="btn-secondary" onClick={optimize}>Recommend maximum-response settings</button>
                    {optimization && <span>Predicted {response}: <strong>{optimization.recommended.predicted.toFixed(3)}</strong></span>}
                  </div>
                  {optimization && (
                    <div className="info-panel" style={{marginTop:'1rem'}}>
                      <strong>Confirmation run required</strong>
                      <p>Recommended settings: {Object.entries(optimization.recommended.factorSettings).map(([name,value]) => `${name}=${value}`).join(', ')}</p>
                      <div style={{display:'flex',gap:'.5rem',alignItems:'center',flexWrap:'wrap'}}>
                        <input type="number" step="any" value={confirmationValue} onChange={event => setConfirmationValue(event.target.value)} placeholder={`Observed ${response}`} />
                        <button className="btn-primary" onClick={confirm}>Record confirmation</button>
                      </div>
                      {(matrix.doeModel.confirmationRuns || []).map(run => <p key={run.id}>Observed {run.observed.toFixed(3)} · deviation {run.deviation.toFixed(3)}</p>)}
                    </div>
                  )}
                </div>
              )}

              {matrix.effects && (
                <div className="card" style={{ marginTop: '1.25rem' }}>
                  <div className="section-title" style={{ marginBottom: '0.5rem' }}>Main Effects Analysis</div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--orange)', marginBottom: '0.75rem' }}>
                    Fractional design — main effects here may be aliased with (confounded with) higher-order interactions, so interaction effects aren't shown separately. Use a full factorial design if you need clean interaction estimates.
                  </p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Grand mean: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{matrix.grandMean.toFixed(3)}</strong></p>
                  <table className="data-table">
                    <thead>
                      <tr><th>Factor</th><th>Effect (High − Low)</th><th>Mean at Low</th><th>Mean at High</th><th>Impact</th></tr>
                    </thead>
                    <tbody>
                      {matrix.effects.map(e => (
                        <tr key={e.factor}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.factor}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: e.effect > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                            {e.effect > 0 ? '+' : ''}{e.effect.toFixed(4)}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{e.meanLow}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{e.meanHigh}</td>
                          <td>
                            <div style={{ width: '80px', height: '6px', background: 'var(--bg-3)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, Math.abs(e.effect) / Math.max(...matrix.effects.map(x => Math.abs(x.effect))) * 100)}%`, height: '100%', background: e.effect > 0 ? 'var(--green)' : 'var(--red)', borderRadius: '3px' }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {(matrix.fullAnalysis||matrix.effects)&&<div className="card doe-next-analysis" style={{marginTop:'1.25rem'}}><div><strong>Continue downstream analysis</strong><p>Carry the active project, dataset, factor metadata, and response context into a supported analysis workspace.</p></div><div><Link className="btn-secondary" to="/hypothesis" onClick={()=>handoff('anova')}>Open ANOVA / Hypothesis Testing</Link><Link className="btn-primary" to="/regression" onClick={()=>handoff('regression')}>Open Regression</Link></div></div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
