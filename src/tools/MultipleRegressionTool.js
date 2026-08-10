import React, { useState, useCallback, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useWorksheet } from '../context/WorksheetContext';
import { useReport } from '../context/ReportContext';
import { fitLinearModel, predictLinearScenarios } from '../utils/modelEngine';
import {getAnalysisHandoff,normalizeDoeRegressionHandoff} from '../services/analysisHandoff';
import { QQPlot, SimpleHistogram } from '../utils/statViews';
import './Tool.css';

const sigBadge = (p) => (
  <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: p < 0.05 ? 'rgba(239,68,68,0.12)' : 'rgba(0,196,140,0.12)', color: p < 0.05 ? '#ef4444' : '#00c48c' }}>
    {p < 0.05 ? 'Significant' : 'Not significant'}
  </span>
);

export default function MultipleRegressionTool() {
  const { activeDataset, getNumericColumns, getCategoricalColumns, getRawColumnData, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const resultsRef = useRef(null);

  const [outcomeVar, setOutcomeVar] = useState('');
  const [predictorVars, setPredictorVars] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [addedToReport, setAddedToReport] = useState(false);
  const [showQQ, setShowQQ] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const [includeInteractions,setIncludeInteractions]=useState(false);
  const [includeQuadratic,setIncludeQuadratic]=useState(false);
  const [trainingRows,setTrainingRows]=useState([]);
  const [predictionInputs,setPredictionInputs]=useState({});
  const [predictionConfidence,setPredictionConfidence]=useState(.95);
  const [prediction,setPrediction]=useState(null);
  const [predictionError,setPredictionError]=useState('');
  const [doeLaunch]=useState(()=>normalizeDoeRegressionHandoff(getAnalysisHandoff()));
  const doeContext=doeLaunch.context;

  const numCols = getNumericColumns ? getNumericColumns() : [];
  const catCols = getCategoricalColumns ? getCategoricalColumns() : [];
  const doeColumns=(doeContext?.factorDefinitions||[]).filter(factor=>![...numCols,...catCols].some(column=>column.name===factor.name)).map(factor=>({name:factor.name,type:factor.type||'continuous',doe:true}));
  const predictorColumns = [...numCols.filter(column => column.name !== outcomeVar), ...catCols.filter(column => column.name !== outcomeVar && !numCols.some(numeric => numeric.name === column.name)),...doeColumns];

  useEffect(()=>{if(!doeContext)return;setOutcomeVar(doeContext.response);setPredictorVars(doeContext.factorNames);setIncludeInteractions(doeContext.interactions.length>0);setIncludeQuadratic(doeContext.polynomialTerms.length>0)},[doeContext]);

  const togglePredictor = (name) => setPredictorVars(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);

  const run = () => {
    setError('');
    setAddedToReport(false);
    if (!outcomeVar || predictorVars.length < 1) return;
    try {
      const sourceNames=[outcomeVar,...predictorVars],useDoeRows=doeContext?.regressionRows?.length&&outcomeVar===doeContext.response&&predictorVars.every(name=>doeContext.factorNames.includes(name)),source=useDoeRows?null:sourceNames.map(getRawColumnData),rowCount=useDoeRows?doeContext.regressionRows.length:Math.max(...source.map(values=>values.length)),rows=useDoeRows?doeContext.regressionRows:Array.from({length:rowCount},(_,index)=>Object.fromEntries(sourceNames.map((name,columnIndex)=>[name,source[columnIndex][index]])));
      const interactions=includeInteractions?(doeContext?doeContext.interactions.filter(term=>term.every(name=>predictorVars.includes(name))):predictorVars.flatMap((left,index)=>predictorVars.slice(index+1).map(right=>[left,right]))):[];
      const polynomialTerms=includeQuadratic?(doeContext?doeContext.polynomialTerms.filter(term=>predictorVars.includes(term.name)):predictorVars.filter(name=>!catCols.some(column=>column.name===name)).map(name=>({name,degree:2}))):[];
      const fitted=fitLinearModel({rows,specification:{response:outcomeVar,predictors:predictorVars.map(name => ({name,type:catCols.some(column => column.name === name) ? 'categorical' : 'continuous'})),interactions,polynomialTerms}});
      setResult({...fitted,sourceDoeAnalysisId:doeContext?.sourceAnalysisId||null});setTrainingRows(rows);setPrediction(null);setPredictionError('');setPredictionInputs(Object.fromEntries(predictorVars.map(name=>{const categorical=catCols.some(column=>column.name===name),values=useDoeRows?rows.map(row=>row[name]):getRawColumnData(name).filter(value=>value!==''&&value!==null&&value!==undefined);return[name,categorical?String(values[0]??''):(values.map(Number).filter(Number.isFinite).reduce((sum,value)=>sum+value,0)/Math.max(1,values.map(Number).filter(Number.isFinite).length)).toFixed(4)]})));
    } catch (e) {
      setError(e.message);
    }
  };

  const predictResponse=()=>{setPredictionError('');try{setPrediction(predictLinearScenarios(result,trainingRows,[predictionInputs],predictionConfidence)[0])}catch(reason){setPrediction(null);setPredictionError(reason.message)}};

  const handleAddToReport = useCallback(async () => {
    if (!resultsRef.current || !result) return;
    const canvas = await html2canvas(resultsRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const eqn = result.coefStats.map((c, i) => i === 0 ? c.coef.toFixed(3) : `${c.coef >= 0 ? '+' : ''}${c.coef.toFixed(3)}×${c.name}`).join(' ');
    const interpretation = `${outcomeVar} = ${eqn}. The model explains ${(result.r2 * 100).toFixed(1)}% of the variation in ${outcomeVar} (R²=${result.r2.toFixed(4)}, adjusted R²=${result.adjR2.toFixed(4)}). The overall model is ${result.pF < 0.05 ? '' : 'not '}statistically significant (F(${result.dfModel},${result.dfResidual})=${result.F.toFixed(3)}, p=${result.pF < 0.001 ? '<0.001' : result.pF.toFixed(4)}). ${result.coefStats.filter((c, i) => i > 0 && c.p < 0.05).map(c => c.name).join(', ') || 'No predictors'} individually reach significance at α=0.05.`;

    addReportItem({
      title: `Multiple Regression — ${outcomeVar} on ${predictorVars.join(', ')}`,
      toolId: 'multiregression',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: { 'R²': result.r2.toFixed(4), 'Adj R²': result.adjR2.toFixed(4), 'F': result.F.toFixed(3), 'p (model)': result.pF < 0.001 ? '<0.001' : result.pF.toFixed(4) },
      interpretation,
      rawData: result.coefStats.map(c => ({ term: c.name, coefficient: c.coef.toFixed(4), se: c.se.toFixed(4), t: c.t.toFixed(4), p: c.p.toFixed(4) })),
      diagnostics: { vif:result.vif, influential:result.influential, aic:result.aic, bic:result.bic, warnings:result.warnings, prediction },
      provenance: { method:result.method, methodVersion:result.methodVersion, omittedRowIndices:result.omittedRowIndices, variableMappings:{response:outcomeVar,predictors:predictorVars},predictionInputs:prediction?.inputs||null,predictionConfidence:prediction?.confidenceLevel||null,sourceDoeAnalysisId:doeContext?.sourceAnalysisId||null,handoffId:doeContext?.id||null,datasetId:doeContext?.datasetId||activeDataset?.id||null,datasetVersionId:doeContext?.datasetVersionId||activeDataset?.versionId||null,sourceModelTerms:doeContext?.modelTerms||[] },
    });
    setAddedToReport(true);
  }, [result, outcomeVar, predictorVars, addReportItem, prediction, doeContext, activeDataset]);

  if (!hasData && !doeContext?.regressionRows.length) {
    return <div style={{ padding: '1.5rem' }}><div className="alert alert-info">Load data into the Worksheet first, then return here to run a multiple regression.</div></div>;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {doeContext&&<div className="card doe-regression-source" style={{marginBottom:'1rem'}}><span className="results-eyebrow">SOURCE: DOE FOLLOW-UP</span><h3>{doeContext.sourceLabel}</h3><p>Preloaded response: <strong>{doeContext.response}</strong> · Factors are transferred as <strong>{doeContext.coding}</strong> values. Review and edit the specification before running.</p><div className="doe-term-chips">{doeContext.factorNames.map(name=><span key={name}>{name}</span>)}{doeContext.interactions.map(term=><span key={term.join(':')}>{term.join(' × ')}</span>)}{doeContext.polynomialTerms.map(term=><span key={`${term.name}^2`}>{term.name}²</span>)}</div>{doeLaunch.warning&&<div className="alert alert-warning" role="status">{doeLaunch.warning}</div>}{doeContext.datasetId&&activeDataset?.id&&doeContext.datasetId!==activeDataset.id&&<div className="alert alert-warning" role="status">The active worksheet dataset differs from the DOE source. Aureqin retained the DOE coded run matrix for this follow-up; verify project and dataset provenance before running.</div>}</div>}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.5rem' }}>Multiple Linear Regression</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Fit an outcome (Y) against two or more predictor (X) variables at once, with coefficients, significance tests, and overall model fit.
        </p>

        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Outcome Variable (Y)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {numCols.map(c => (
              <button key={c.name} onClick={() => setOutcomeVar(c.name)}
                style={{ padding: '0.35rem 0.85rem', borderRadius: '999px', border: `1px solid ${outcomeVar === c.name ? 'var(--accent)' : 'var(--border)'}`, background: outcomeVar === c.name ? 'var(--accent-dim)' : 'var(--input-bg)', color: outcomeVar === c.name ? 'var(--accent-light)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <details style={{marginBottom:'1rem'}} open={Boolean(doeContext)}><summary>Model terms</summary><label style={{display:'block',marginTop:'.6rem'}}><input type="checkbox" checked={includeInteractions} onChange={event=>setIncludeInteractions(event.target.checked)}/> {doeContext?'Include transferred supported interactions':'Include all two-way interactions among selected predictors'}</label><label style={{display:'block',marginTop:'.45rem'}}><input type="checkbox" checked={includeQuadratic} onChange={event=>setIncludeQuadratic(event.target.checked)}/> {doeContext?'Include transferred quadratic terms':'Include quadratic terms for continuous predictors'}</label>{doeContext&&<p className="field-help">Transferred interactions: {doeContext.interactions.map(term=>term.join(' × ')).join(', ')||'None'}<br/>Transferred quadratic terms: {doeContext.polynomialTerms.map(term=>`${term.name}²`).join(', ')||'None'}</p>}<small style={{color:'var(--text-muted)'}}>Additional terms consume degrees of freedom and can create singular or unstable models. Aureqin will report that condition rather than silently remove terms.</small></details>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Predictor Variables (X) — select 2 or more, different from Y</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {predictorColumns.map(c => (
              <label key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.35rem 0.75rem', borderRadius: '999px', border: `1px solid ${predictorVars.includes(c.name) ? 'var(--accent)' : 'var(--border)'}`, background: predictorVars.includes(c.name) ? 'var(--accent-dim)' : 'var(--input-bg)', cursor: 'pointer' }}>
                <input type="checkbox" checked={predictorVars.includes(c.name)} onChange={() => togglePredictor(c.name)} />
                {c.name}{catCols.some(column => column.name === c.name) ? ' · categorical' : ''}
              </label>
            ))}
          </div>
        </div>

        <button className="btn-primary" disabled={!outcomeVar || predictorVars.length < 1} onClick={run}>Run Regression</button>
        {error && <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>⚠️ {error}</div>}
      </div>

      {result && (
        <div ref={resultsRef}>
          <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 className="section-title" style={{ margin: 0 }}>Regression Result</h3>
              {sigBadge(result.pF)}
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <div>R² = <b>{result.r2.toFixed(4)}</b></div>
              <div>Adj R² = <b>{result.adjR2.toFixed(4)}</b></div>
              <div>F({result.dfModel},{result.dfResidual}) = <b>{result.F.toFixed(3)}</b></div>
              <div>p = <b>{result.pF < 0.001 ? '<0.001' : result.pF.toFixed(4)}</b></div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <thead><tr>
                <th style={{ textAlign: 'left', padding: '0.4rem', color: 'var(--text-muted)' }}>Term</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>Coefficient</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>SE</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>t</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>p</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>95% CI</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}></th>
              </tr></thead>
              <tbody>
                {result.coefStats.map((c, i) => (
                  <tr key={c.name}>
                    <td style={{ padding: '0.4rem', borderTop: '1px solid var(--border)', fontWeight: i === 0 ? 400 : 600 }}>{c.name}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{c.coef.toFixed(4)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{c.se.toFixed(4)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{c.t.toFixed(3)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{c.p < 0.001 ? '<0.001' : c.p.toFixed(4)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{c.confidenceInterval.map(value=>value.toFixed(3)).join(' to ')}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{i > 0 && sigBadge(c.p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, fontFamily: 'var(--font-mono)' }}>
              {outcomeVar} = {result.coefStats.map((c, i) => i === 0 ? c.coef.toFixed(3) : `${c.coef >= 0 ? ' + ' : ' − '}${Math.abs(c.coef).toFixed(3)}×${c.name}`).join('')}
            </p>
          </div>

          <details className="card" style={{padding:'1.25rem',marginBottom:'1rem'}}><summary className="section-title">Professional diagnostics</summary><div style={{display:'flex',gap:'1rem',flexWrap:'wrap',marginTop:'1rem'}}><span>AIC <b>{Number.isFinite(result.aic)?result.aic.toFixed(2):'Perfect fit'}</b></span><span>BIC <b>{Number.isFinite(result.bic)?result.bic.toFixed(2):'Perfect fit'}</b></span><span>Potentially influential rows <b>{result.influential.length}</b></span></div><div className="results-table-wrap"><table><thead><tr><th>Predictor</th><th>VIF</th></tr></thead><tbody>{result.vif.map(item=><tr key={item.name}><td>{item.name}</td><td>{Number.isFinite(item.vif)?item.vif.toFixed(3):'Infinite'}</td></tr>)}</tbody></table></div>{result.influential.length>0&&<div className="results-table-wrap"><h4>Influential observations</h4><table><thead><tr><th>Source row</th><th>Leverage</th><th>Cook's distance</th><th>Studentized residual</th></tr></thead><tbody>{result.influential.map(item=><tr key={item.sourceIndex}><td>{item.sourceIndex+1}</td><td>{item.leverage.toFixed(4)}</td><td>{item.cooksDistance.toFixed(4)}</td><td>{item.studentizedResidual.toFixed(3)}</td></tr>)}</tbody></table></div>}{result.warnings.map(warning=><div className="alert alert-warning" key={warning}>{warning}</div>)}</details>

          <details className="card" style={{padding:'1.25rem',marginBottom:'1rem'}}><summary className="section-title">Predict Response</summary><p style={{color:'var(--text-secondary)'}}>Enter base predictor values. Aureqin applies fitted categorical encoding, interaction terms, and polynomial terms automatically.</p><div className="form-grid">{predictorVars.map(name=>{const categorical=catCols.some(column=>column.name===name),levels=categorical?[...new Set(getRawColumnData(name).filter(value=>value!==''&&value!==null&&value!==undefined).map(String))]:[];return<div className="form-group" key={name}><label>{name}</label>{categorical?<select value={predictionInputs[name]??''} onChange={event=>setPredictionInputs(previous=>({...previous,[name]:event.target.value}))}>{levels.map(level=><option key={level}>{level}</option>)}</select>:<input type="number" step="any" value={predictionInputs[name]??''} onChange={event=>setPredictionInputs(previous=>({...previous,[name]:event.target.value}))}/>}</div>})}<div className="form-group"><label>Confidence level</label><select value={predictionConfidence} onChange={event=>setPredictionConfidence(Number(event.target.value))}><option value={.9}>90%</option><option value={.95}>95%</option><option value={.99}>99%</option></select></div></div><button className="btn-primary" type="button" onClick={predictResponse}>Estimate Response</button>{predictionError&&<div className="alert alert-danger" role="alert">{predictionError}</div>}{prediction&&<div className="prediction-result"><div><span>Predicted mean response</span><strong>{prediction.estimate.toFixed(4)}</strong></div><div><span>Confidence interval for mean response</span><strong>{prediction.confidenceInterval.map(value=>value.toFixed(4)).join(' to ')}</strong><small>Uncertainty in the estimated mean response.</small></div><div><span>Prediction interval for a new observation</span><strong>{prediction.predictionInterval.map(value=>value.toFixed(4)).join(' to ')}</strong><small>Expected range for an individual future observation.</small></div></div>}</details>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button className={showHist ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }} onClick={() => setShowHist(s => !s)}>Residual Histogram</button>
            <button className={showQQ ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }} onClick={() => setShowQQ(s => !s)}>Q-Q Plot (Residuals)</button>
          </div>
          {showHist && <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><SimpleHistogram data={result.residuals} title="Residual Distribution" /></div>}
          {showQQ && <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><QQPlot data={result.residuals} title="Q-Q Plot of Residuals" /></div>}

          <button className="btn-primary no-print" onClick={handleAddToReport}>
            {addedToReport ? '✓ Added to Report' : 'Add to Report'}
          </button>
        </div>
      )}
    </div>
  );
}
