import React, { useEffect, useState } from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {useWorksheet} from '../context/WorksheetContext';
import {useAnalysis} from '../context/AnalysisContext';
import {useReport} from '../context/ReportContext';
import {createAnalysisHandoff,DOE_REGRESSION_DESTINATION,DOE_REGRESSION_PATH} from '../services/analysisHandoff';
import { BOOK_EXCERPTS } from '../utils/bookExcerpts';
import {
  analyzeFactorial,
  generateFractionalFactorial as generateFractionalEngine,
  generateFullFactorial as generateFullEngine,
  optimizeFactorial,
  recordConfirmationRun,
} from '../utils/doeEngine';
import {contourGrid,fitResponseSurface,generateBoxBehnken,generateCentralComposite,optimizeResponseSurface,recordRsmConfirmation} from '../utils/rsmEngine';
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
  const {addReportItem}=useReport();
  const [searchParams]=useSearchParams();
  const [factors, setFactors] = useState([
    { name: 'Temperature', low: '150', high: '200' },
    { name: 'Pressure', low: '10', high: '20' },
    { name: 'Time', low: '30', high: '60' },
  ]);
  const [design, setDesign] = useState('full');
  const [rsmDesign,setRsmDesign]=useState('ccd');
  const [ccdVariant,setCcdVariant]=useState('rotatable');
  const [response, setResponse] = useState('Yield');
  const [replicates, setReplicates] = useState(1);
  const [blocks,setBlocks]=useState(1);
  const [centerPoints,setCenterPoints]=useState(0);
  const [randomSeed, setRandomSeed] = useState(20260809);
  const [matrix, setMatrix] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [optimization, setOptimization] = useState(null);
  const [confirmationValue, setConfirmationValue] = useState('');
  const [optimizationGoal,setOptimizationGoal]=useState('maximize');
  const [optimizationTarget,setOptimizationTarget]=useState('');
  const [contourAxes,setContourAxes]=useState({x:'Temperature',y:'Pressure'});
  const [contour,setContour]=useState(null);
  const [saved,setSaved]=useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const bookExcerpt = BOOK_EXCERPTS.doe;
  useEffect(()=>{const method=searchParams.get('method');if(['response-surface','central-composite','box-behnken','contour-plot'].includes(method)){setDesign('rsm');if(method==='box-behnken')setRsmDesign('box-behnken')}},[searchParams]);

  const addFactor = () => setFactors(p => [...p, { ...EMPTY_FACTOR }]);
  const removeFactor = (i) => setFactors(p => p.filter((_, j) => j !== i));
  const updateFactor = (i, field, val) => setFactors(p => p.map((f, j) => j === i ? { ...f, [field]: val } : f));

  const generate = () => {
    setError('');
    try {
      const valid = factors.filter(f => f.name && f.low !== '' && f.high !== '').map(f => ({...f, low: Number(f.low), high: Number(f.high)}));
      if (valid.length < 2) throw new Error('Define at least two factors with low and high levels.');
      const model = design === 'full'
        ? generateFullEngine({factors: valid, replicates, blocks, centerPoints, randomSeed, response})
        : design==='fractional'
          ? generateFractional({factors: valid, replicates, blocks, randomSeed, response})
          : rsmDesign==='ccd'
            ? generateCentralComposite({factors:valid,replicates,blocks,centerPoints:Math.max(1,centerPoints||5),randomSeed,response,variant:ccdVariant})
            : generateBoxBehnken({factors:valid,replicates,blocks,centerPoints:Math.max(1,centerPoints||3),randomSeed,response});
      const rows = model.runs.map(run => ({...run.factorSettings, run: run.standardOrder, runOrder: run.runOrder, replicate: run.replicate}));
      setMatrix({rows, factors: valid, doeModel: model});
      setResults(rows.map(row => ({run: row.runOrder, response: ''})));
      setOptimization(null);
      setContour(null);setSaved(false);
      setConfirmationValue('');
    } catch (generationError) {
      setError(generationError.message);
    }
  };

  const optimize = () => {
    try {
      setError('');
      setOptimization(design==='rsm'?optimizeResponseSurface(matrix.doeModel,matrix.fullAnalysis,{type:optimizationGoal,target:optimizationTarget}):optimizeFactorial(matrix.doeModel, matrix.fullAnalysis, {type: optimizationGoal,target:optimizationTarget}));
    } catch (optimizationError) {
      setError(optimizationError.message);
    }
  };

  const confirm = () => {
    try {
      setError('');
      const updatedModel = design==='rsm'?recordRsmConfirmation(matrix.doeModel,optimization,{observed:confirmationValue,responseName:response}):recordConfirmationRun(matrix.doeModel, optimization, {observed: confirmationValue, responseName: response});
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
      const analysis = design==='rsm'?fitResponseSurface(modelWithResponses,response):analyzeFactorial(modelWithResponses, response);
      setMatrix(previous => ({...previous, doeModel: modelWithResponses, fullAnalysis: analysis, effects: null}));
      if(design==='rsm'){const names=modelWithResponses.factors.map(f=>f.name);setContourAxes({x:names[0],y:names[1]});setContour(contourGrid(modelWithResponses,analysis,{xFactor:names[0],yFactor:names[1]}))}
    } catch (analysisError) {
      setError(analysisError.message);
    }
  };

  const totalRuns = (() => {
    const k = factors.filter(f => f.name).length;
    if (k < 2) return 0;
    if(design==='rsm')return rsmDesign==='ccd'?Math.pow(2,k)*replicates+2*k*replicates+Math.max(1,centerPoints||5):k<3?0:4*(k*(k-1)/2)*replicates+Math.max(1,centerPoints||3);
    return (design === 'full' ? Math.pow(2, k) * replicates + centerPoints : Math.pow(2, k - 1) * replicates);
  })();
  const updateContour=()=>{try{setError('');setContour(contourGrid(matrix.doeModel,matrix.fullAnalysis,{xFactor:contourAxes.x,yFactor:contourAxes.y}))}catch(reason){setError(reason.message)}};
  const saveRsm=async()=>{if(!matrix?.fullAnalysis)return;const payload={toolId:'doe-rsm',toolType:'response-surface-methodology',title:`Response Surface Study — ${response}`,phase:'Improve',projectId:analysisContext?.projectId||activeDataset?.projectId||'',datasetIds:activeDataset?[activeDataset.id]:[],datasetVersionIds:activeDataset?.versionId?[activeDataset.versionId]:[],inputConfiguration:{designType:matrix.doeModel.designType,factors:matrix.doeModel.factors,alpha:matrix.doeModel.alpha,centerPoints:matrix.doeModel.centerPoints,blocks:matrix.doeModel.blocks,replicates:matrix.doeModel.replicates,randomSeed:matrix.doeModel.randomSeed},result:{design:matrix.doeModel,model:matrix.fullAnalysis,contourConfiguration:contour?{xFactor:contour.xFactor,yFactor:contour.yFactor,hold:contour.hold}:null,optimization,confirmationRuns:matrix.doeModel.confirmationRuns},interpretation:`A second-order response-surface model was fitted for ${response}. Review curvature, interactions, residual diagnostics, lack-of-fit limitations, and confirmation evidence before adopting settings.`,validationStatus:'UNVALIDATED'};analysisContext.registerAnalysisResult(payload);await addReportItem({...payload,assetType:'analysis',statsSummary:{'R²':matrix.fullAnalysis.r2,'Adjusted R²':matrix.fullAnalysis.adjustedR2,'Model F':matrix.fullAnalysis.F,'Model p':matrix.fullAnalysis.pF},rawData:matrix.fullAnalysis.coefficients,provenance:{method:matrix.fullAnalysis.method,methodVersion:matrix.fullAnalysis.methodVersion,designType:matrix.doeModel.designType,randomSeed:matrix.doeModel.randomSeed,runOrder:matrix.doeModel.runs.map(run=>run.standardOrder),validationStatus:'UNVALIDATED'}});setSaved(true)};
  const handoff=destination=>{const model=matrix?.doeModel,analysis=matrix?.fullAnalysis,factorNames=model?.factors?.map(f=>f.name)||factors.map(f=>f.name).filter(Boolean),rsm=design==='rsm',interactions=rsm?(analysis?.specification?.interactions||[]):(analysis?.effects||[]).filter(effect=>effect.order===2).map(effect=>effect.term.split(/\s*×\s*/)).filter(term=>term.length===2),polynomialTerms=rsm?(analysis?.specification?.polynomialTerms||[]):[],sourceAnalysisId=analysis?.id||`doe-${model?.designType||design}-${model?.randomSeed||randomSeed}-${model?.runs?.length||0}`;return createAnalysisHandoff({sourceTool:'doe',destination,sourceAnalysisId,sourceLabel:`DOE — ${rsm?(model?.designType==='central-composite'?'Central Composite RSM':'Box-Behnken RSM'):model?.designType==='fractional-factorial-2-level'?'Fractional Factorial Analysis':'Full Factorial Analysis'}`,projectId:analysisContext?.projectId||activeDataset?.projectId||'',datasetId:activeDataset?.id||'',datasetVersion:activeDataset?.version||1,datasetVersionId:activeDataset?.versionId||'',datasetName:activeDataset?.name||'',selectedColumns:[...factorNames,response],factors:factorNames,response,factorDefinitions:(model?.factors||[]).map(factor=>({...factor,coding:'coded'})),coding:'coded',interactions,polynomialTerms,modelTerms:analysis?.coefficients?.map(term=>term.name)||analysis?.effects?.map(effect=>effect.term)||[],regressionRows:(model?.runs||[]).map(run=>({...run.factorCodes,[response]:run.response})),naturalRows:(model?.runs||[]).map(run=>({...run.factorSettings,[response]:run.response})),metadata:{design,rsmDesign,designType:model?.designType,replicates:model?.replicates,blocks:model?.blocks,randomSeed:model?.randomSeed,runOrder:model?.runs?.map(run=>run.standardOrder)||[]}})};

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
              <option value="rsm">Response Surface — model curvature and optimize</option>
            </select>
          </div>

          {design==='rsm'&&<div className="rsm-progressive"><div className="form-group"><label>Response-surface design</label><select value={rsmDesign} onChange={event=>setRsmDesign(event.target.value)}><option value="ccd">Central Composite Design</option><option value="box-behnken">Box-Behnken Design</option></select><small>{rsmDesign==='ccd'?'CCD combines cube, axial, and center points; rotatable star points may extend beyond entered factor ranges.':'Box-Behnken uses edge midpoints and center points without testing cube corners; requires at least three factors.'}</small></div>{rsmDesign==='ccd'&&<div className="form-group"><label>CCD axial option</label><select value={ccdVariant} onChange={event=>setCcdVariant(event.target.value)}><option value="rotatable">Rotatable</option><option value="face-centered">Face-centered</option></select></div>}<div className="info-panel"><strong>When to use response surfaces</strong><p>Use RSM after important continuous factors are known and the objective is to model curvature or optimize around an operating region. Use fractional factorial screening when many candidate factors remain.</p></div></div>}

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

          <div className="form-grid" style={{marginBottom:'1.25rem'}}><div className="form-group"><label>Blocks</label><select value={blocks} onChange={event=>setBlocks(Number(event.target.value))}>{[1,2,3,4].map(value=><option key={value}>{value}</option>)}</select><small style={{color:'var(--text-muted)'}}>Run order is distributed reproducibly across blocks.</small></div>{design!=='fractional'&&<div className="form-group"><label>Center points</label><select value={centerPoints} onChange={event=>setCenterPoints(Number(event.target.value))}>{[0,1,2,3,4,5,6].map(value=><option key={value}>{value}</option>)}</select><small style={{color:'var(--text-muted)'}}>Replicated centers provide pure-error information and evidence of curvature.</small></div>}</div>

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
              <span>{design === 'full' ? `Full factorial 2^${factors.filter(f=>f.name).length}` : design==='fractional'?`Fractional 2^${factors.filter(f=>f.name).length-1}`:rsmDesign==='ccd'?`CCD · ${ccdVariant}`:'Box-Behnken'}</span>
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
                        <th>Run order</th><th>Standard order</th><th>Block</th>
                        {matrix.factors.map(f => <th key={f.name}>{f.name}</th>)}
                        <th style={{ color: 'var(--accent-light)' }}>{response} (Y)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.rows.map((row, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{row.runOrder}</td><td>{row.run}</td><td>{matrix.doeModel.runs[i]?.block}</td>
                          {matrix.factors.map(f => (
                            <td key={f.name} style={{ fontWeight: row[f.name] === f.high ? 600 : 400, color: row[f.name] === f.high ? 'var(--accent-light)' : 'var(--text-secondary)' }}>
                              {Number(row[f.name]).toFixed(3)} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({matrix.doeModel.runs[i]?.isCenterPoint?'center':`coded ${matrix.doeModel.runs[i]?.factorCodes?.[f.name]}`})</span>
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

              {matrix.fullAnalysis && design!=='rsm' && (
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

              {matrix.fullAnalysis&&design==='rsm'&&<><div className="card rsm-results"><div className="section-title">Second-order response-surface model</div><div className="rsm-metrics"><span>R² <strong>{matrix.fullAnalysis.r2.toFixed(4)}</strong></span><span>Adjusted R² <strong>{matrix.fullAnalysis.adjustedR2.toFixed(4)}</strong></span><span>Model F <strong>{Number.isFinite(matrix.fullAnalysis.F)?matrix.fullAnalysis.F.toFixed(3):'—'}</strong></span><span>Model p <strong>{Number.isFinite(matrix.fullAnalysis.pF)?matrix.fullAnalysis.pF.toFixed(4):'—'}</strong></span></div><p>Linear terms describe slope, squared terms describe curvature, and interaction terms describe how one factor's effect changes with another. Statistical association in the fitted surface does not by itself establish physical causality.</p><div className="results-table-wrap"><table><thead><tr><th>Term</th><th>Estimate</th><th>SE</th><th>t</th><th>p</th><th>95% CI</th></tr></thead><tbody>{matrix.fullAnalysis.coefficients.map(term=><tr key={term.name}><td>{term.name}</td><td>{term.estimate.toFixed(4)}</td><td>{term.standardError.toFixed(4)}</td><td>{Number.isFinite(term.statistic)?term.statistic.toFixed(3):'—'}</td><td>{Number.isFinite(term.pValue)?term.pValue.toFixed(4):'—'}</td><td>{term.confidenceInterval.map(value=>value.toFixed(3)).join(' to ')}</td></tr>)}</tbody></table></div>{matrix.fullAnalysis.effectInterpretation.curvature.some(term=>term.pValue<.05)&&<div className="alert alert-info">The fitted response shows statistically detectable curvature in {matrix.fullAnalysis.effectInterpretation.curvature.filter(term=>term.pValue<.05).map(term=>term.name.replace('^2','')).join(', ')}. Review practical magnitude and diagnostics before concluding that a straight-line model is inadequate.</div>}{matrix.fullAnalysis.warnings.map(warning=><div className="validation-alert warning" key={warning}>{warning}</div>)}</div>

              <div className="card"><div className="section-title">Contour explorer</div><div className="form-grid"><div className="form-group"><label>X factor</label><select value={contourAxes.x} onChange={event=>setContourAxes(previous=>({...previous,x:event.target.value}))}>{matrix.factors.map(f=><option key={f.name}>{f.name}</option>)}</select></div><div className="form-group"><label>Y factor</label><select value={contourAxes.y} onChange={event=>setContourAxes(previous=>({...previous,y:event.target.value}))}>{matrix.factors.map(f=><option key={f.name}>{f.name}</option>)}</select></div></div><button className="btn-secondary" onClick={updateContour}>Update contour</button>{contour&&<><svg className="contour-plot" viewBox="0 0 520 400" role="img" aria-label={`Predicted ${response} contour for ${contour.xFactor} and ${contour.yFactor}`}>{contour.points.map((point,index)=>{const range=contour.max-contour.min||1,t=(point.predicted-contour.min)/range,hue=220-180*t;return<rect key={index} x={55+point.xCode*0+((index%contour.steps)/(contour.steps-1))*410} y={25+(1-Math.floor(index/contour.steps)/(contour.steps-1))*320} width={412/contour.steps+1} height={322/contour.steps+1} fill={`hsl(${hue} 70% 50%)`}><title>{`${contour.xFactor} ${point.x.toFixed(3)}, ${contour.yFactor} ${point.y.toFixed(3)}, predicted ${point.predicted.toFixed(3)}`}</title></rect>})}<text x="220" y="385">{contour.xFactor}</text><text transform="translate(18 250) rotate(-90)">{contour.yFactor}</text></svg><p>Predicted range: <strong>{contour.min.toFixed(3)} to {contour.max.toFixed(3)}</strong>. Other factors are held at coded center unless specified in the saved contour configuration. This lightweight iso-color surface avoids a heavy 3D dependency.</p></>}</div>

              <div className="card"><div className="section-title">Response optimization and confirmation</div><div className="form-grid"><div className="form-group"><label>Goal</label><select value={optimizationGoal} onChange={event=>setOptimizationGoal(event.target.value)}><option value="maximize">Maximize</option><option value="minimize">Minimize</option><option value="target">Target</option></select></div>{optimizationGoal==='target'&&<div className="form-group"><label>Target response</label><input type="number" step="any" value={optimizationTarget} onChange={event=>setOptimizationTarget(event.target.value)}/></div>}</div><button className="btn-secondary" onClick={optimize}>Find settings within tested range</button>{optimization&&<div className="info-panel"><strong>Recommended tested-range settings</strong><p>{Object.entries(optimization.recommended.factorSettings).map(([name,value])=>`${name}=${value.toFixed(3)}`).join(', ')}</p><p>Predicted {response}: <strong>{optimization.recommended.predicted.toFixed(3)}</strong></p><div className="form-group"><label>Observed confirmation response</label><input type="number" step="any" value={confirmationValue} onChange={event=>setConfirmationValue(event.target.value)}/></div><button className="btn-primary" onClick={confirm}>Record confirmation run</button></div>}{matrix.doeModel.confirmationRuns?.map(run=><p key={run.id}>Observed {run.observed.toFixed(3)} · predicted {run.predicted.toFixed(3)} · deviation {run.deviation.toFixed(3)}</p>)}<button className="btn-primary" style={{marginTop:'1rem'}} onClick={saveRsm}>{saved?'Added to project and report':'Add RSM evidence to project & report'}</button></div></>}

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
              {(matrix.fullAnalysis||matrix.effects)&&<div className="card doe-next-analysis" style={{marginTop:'1.25rem'}}><div><strong>Continue downstream analysis</strong><p>Carry the active project, dataset, factor metadata, response, and supported model terms into a reviewable regression specification.</p></div><div><Link className="btn-secondary" to="/hypothesis" onClick={()=>handoff('anova')}>Open ANOVA / Hypothesis Testing</Link><Link className="btn-primary" to={DOE_REGRESSION_PATH} onClick={()=>handoff(DOE_REGRESSION_DESTINATION)}>Follow-up Regression</Link></div></div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
