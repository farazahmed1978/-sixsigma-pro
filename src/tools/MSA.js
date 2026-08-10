import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import CSVUploader from '../components/CSVUploader';
import { useWorksheet } from '../context/WorksheetContext';
import { useAnalysis } from '../context/AnalysisContext';
import { useProjectPlacement } from '../context/ProjectPlacementContext';
import { useReport } from '../context/ReportContext';
import { crossedGageRR, nestedGageRR, attributeAgreement, biasStudy, linearityStudy, stabilityStudy, MSA_VALIDATION_STATUS } from '../utils/msaEngine';
import { createPractitionerFinding, formatMetric, structuredReportPayload } from '../utils/practitionerWorkflow';
import './Tool.css';

const STUDIES = [
  ['crossed', 'Crossed Gage R&R', 'Same parts are measured by every appraiser.'],
  ['nested', 'Nested Gage R&R', 'Each part belongs to only one appraiser, such as destructive testing.'],
  ['bias', 'Bias', 'Compare repeated measurements with a known reference.'],
  ['linearity', 'Linearity', 'Determine whether bias changes across the operating range.'],
  ['stability', 'Stability', 'Screen ordered master-item measurements for special causes.'],
  ['attribute', 'Attribute Agreement', 'Evaluate repeatability, reproducibility, and agreement to a standard.'],
];
const numeric = values => values.map(Number).filter(Number.isFinite);

export default function MSA() {
  const { columns, getRawColumnData, hasData, activeDataset } = useWorksheet();
  const placement = useProjectPlacement();
  const report=useReport();
  const { analysisResults,registerAnalysisResult } = useAnalysis();
  const [studyType, setStudyType] = useState('crossed');
  const [upload, setUpload] = useState({ rows: [], fields: [] });
  const [mapping, setMapping] = useState({ part: '', operator: '', measurement: '', item: '', rating: '', trial: '', reference: '' });
  const [tolerance, setTolerance] = useState('');
  const [referenceValue, setReferenceValue] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fields = hasData ? columns.map(column => column.name) : upload.fields;
  const currentStudy = STUDIES.find(item => item[0] === studyType);
  const raw = name => hasData ? getRawColumnData(name) : upload.rows.map(row => row[name]);
  const mapSelect = (key, label, required = true) => <div className="form-group"><label>{label}{required && <span className="required-indicator"> *</span>}</label><select value={mapping[key]} onChange={event => setMapping(previous => ({ ...previous, [key]: event.target.value }))}><option value="">— select —</option>{fields.map(field => <option key={field} value={field}>{field}</option>)}</select></div>;

  const configureDefaults = (rows, incomingFields) => {
    const find = fragment => incomingFields.find(field => field.toLowerCase().includes(fragment)) || '';
    setUpload({ rows, fields: incomingFields });
    setMapping({ part: find('part'), operator: find('operator') || find('appraiser'), measurement: incomingFields.find(field => Number.isFinite(Number(rows[0]?.[field]))) || '', item: find('item') || find('sample'), rating: find('rating'), trial: find('trial'), reference: find('reference') || find('standard') });
  };

  const run = () => {
    setError(''); setNotice('');
    try {
      let output;
      if (studyType === 'crossed' || studyType === 'nested') {
        const rows = raw(mapping.measurement).map((value, index) => ({ part: raw(mapping.part)[index], operator: raw(mapping.operator)[index], measurement: Number(value) })).filter(row => row.part !== '' && row.operator !== '' && Number.isFinite(row.measurement));
        output = studyType === 'crossed' ? crossedGageRR({ rows, tolerance: Number(tolerance) || undefined }) : nestedGageRR({ rows, tolerance: Number(tolerance) || undefined });
      } else if (studyType === 'attribute') {
        const rows = raw(mapping.rating).map((rating, index) => ({ item: raw(mapping.item)[index], appraiser: raw(mapping.operator)[index], rating: String(rating), trial: mapping.trial ? raw(mapping.trial)[index] : undefined, reference: mapping.reference ? String(raw(mapping.reference)[index]) : undefined })).filter(row => row.item !== '' && row.appraiser !== '' && row.rating !== '');
        output = attributeAgreement({ rows });
      } else if (studyType === 'bias') output = biasStudy({ measurements: numeric(raw(mapping.measurement)), reference: Number(referenceValue) });
      else if (studyType === 'linearity') output = linearityStudy({ measurements: numeric(raw(mapping.measurement)), references: numeric(raw(mapping.reference)) });
      else output = stabilityStudy({ measurements: numeric(raw(mapping.measurement)) });
      setResult(output);
    } catch (runError) { setResult(null); setError(runError.message); }
  };

  const summary = useMemo(() => {
    if (!result) return null;
    if (studyType === 'crossed' || studyType === 'nested') { const grr = result.percentStudyVariation.gageRR; return { status: grr < 10 ? 'Acceptable' : grr < 30 ? 'Review for intended use' : 'Needs improvement', tone: grr < 10 ? 'success' : grr < 30 ? 'warning' : 'danger', metrics: [['Total Gage R&R', `${formatMetric(grr, 1)}%`], ['Repeatability', `${formatMetric(result.percentStudyVariation.repeatability, 1)}%`], ['Reproducibility', `${formatMetric(result.percentStudyVariation.reproducibility, 1)}%`], ['ndc', result.ndc ?? '—']] }; }
    if (studyType === 'attribute') return { status: result.overallAgreement >= .9 ? 'Strong agreement' : result.overallAgreement >= .8 ? 'Review agreement' : 'Needs improvement', tone: result.overallAgreement >= .9 ? 'success' : 'warning', metrics: [['Overall agreement', `${formatMetric(result.overallAgreement * 100, 1)}%`], ['Appraisers', result.withinAppraiser.length], ['Pair comparisons', result.betweenAppraiser.length]] };
    if (studyType === 'bias') return { status: result.significant ? 'Statistically significant bias detected' : 'No significant bias detected', tone: result.significant ? 'danger' : 'success', metrics: [['Observed bias', formatMetric(result.bias)], ['95% CI', `${formatMetric(result.confidenceInterval[0])} to ${formatMetric(result.confidenceInterval[1])}`], ['p-value', formatMetric(result.pValue)]] };
    if (studyType === 'linearity') return { status: result.linearBiasDetected ? 'Bias changes across the range' : 'No significant linearity effect detected', tone: result.linearBiasDetected ? 'danger' : 'success', metrics: [['Slope', formatMetric(result.regression.coefficients[1].estimate)], ['Intercept', formatMetric(result.regression.coefficients[0].estimate)], ['p-value', formatMetric(result.regression.coefficients[1].pValue)]] };
    return { status: result.stable ? 'No special-cause signal detected' : 'Measurement system may be unstable', tone: result.stable ? 'success' : 'danger', metrics: [['Signals', result.chart.violations.length], ['Center', formatMetric(result.chart.centerLine)], ['I-chart UCL', formatMetric(result.chart.ucl)], ['I-chart LCL', formatMetric(result.chart.lcl)]] };
  }, [result, studyType]);

  const persistAnalysis = () => registerAnalysisResult({ title: `${currentStudy[1]} — ${mapping.measurement || mapping.rating}`, toolId: 'msa', phase: 'Measure', method: result.method, methodVersion: result.methodVersion, validationStatus: MSA_VALIDATION_STATUS[studyType], inputConfiguration: { studyType, mapping, tolerance: Number(tolerance) || null, referenceValue: Number(referenceValue) || null }, variableMapping: mapping, result, interpretation: summary.status });
  const addToProject = () => placement.requestPlacement({ toolId: 'msa', projectId: activeDataset?.projectId, title: `${currentStudy[1]} — ${mapping.measurement || mapping.rating}`, analysis: { title: `${currentStudy[1]} — ${mapping.measurement || mapping.rating}`, toolId: 'msa', phase: 'Measure', method: result.method, methodVersion: result.methodVersion, validationStatus: MSA_VALIDATION_STATUS[studyType], datasetIds: [activeDataset?.id].filter(Boolean), datasetVersionIds: [activeDataset?.versionId].filter(Boolean), inputConfiguration: { studyType, mapping, tolerance: Number(tolerance) || null, referenceValue: Number(referenceValue) || null }, variableMapping: mapping, result, interpretation: summary.status }, reportItem: { toolId: 'msa', phase: 'Measure', timestamp: new Date().toISOString(), statsSummary: Object.fromEntries(summary.metrics), interpretation: summary.status, structuredOutput: structuredReportPayload({ method: result.method, methodVersion: result.methodVersion, configuration: { studyType, mapping, tolerance }, metrics: result, tables: { anova: result.anova || [], withinAppraiser: result.withinAppraiser || [], betweenAppraiser: result.betweenAppraiser || [] }, plots: studyType === 'stability' ? { controlChart: result.chart } : {}, signals: result.chart?.violations || [], interpretation: summary.status }), provenance: { datasetId: activeDataset?.id, datasetVersionId: activeDataset?.versionId, validationStatus: MSA_VALIDATION_STATUS[studyType] } } });
  const reportTitle=`${currentStudy[1]} — ${mapping.measurement||mapping.rating}`,reportKey=`${activeDataset?.projectId||''}:msa:${reportTitle}`,inReport=report.items.some(item=>item.reportKey===reportKey),addToReport=async()=>{if(inReport){report.removeReportItem(report.items.find(item=>item.reportKey===reportKey).id);return}const canonical=analysisResults.find(item=>item.projectId===activeDataset?.projectId&&item.toolId==='msa'&&item.title===reportTitle),analysisId=canonical?.id||persistAnalysis();await report.addReportItem({toolId:'msa',phase:'Measure',projectId:activeDataset?.projectId,title:reportTitle,analysisId,reportKey,timestamp:new Date().toISOString(),statsSummary:Object.fromEntries(summary.metrics),structuredOutput:result,interpretation:summary.status,provenance:{analysisId,datasetId:activeDataset?.id,datasetVersionId:activeDataset?.versionId,method:result.method,methodVersion:result.methodVersion}})};
  const createFindingAction = () => { const analysisId = persistAnalysis(); const inadequate = summary.tone !== 'success'; const finding = createPractitionerFinding({ analysisId, dataset: activeDataset, variable: mapping.measurement || mapping.rating, type: 'measurement_system_inadequate', severity: inadequate ? 'critical' : 'information', statement: `${currentStudy[1]}: ${summary.status}.`, evidence: { resultPath: 'result', studyType, metrics: summary.metrics } }); localStorage.setItem('aureqin_latest_finding', JSON.stringify(finding)); setNotice('Finding created with dataset-version and analysis provenance.'); };

  return <div className="practitioner-workflow">
    <header className="practitioner-hero"><div><span className="eyebrow">Measurement system analysis</span><h1>Design the right MSA study</h1><p>Select a study design, map the active dataset, and receive a practitioner-focused assessment.</p></div><div className="context-chip"><strong>{activeDataset?.name || 'Uploaded study data'}</strong><span>{activeDataset?.versionId ? `Version ${activeDataset.version || 1}` : 'Local analysis'}</span></div></header>
    <div className="study-selector">{STUDIES.map(([id, label, description]) => <button type="button" key={id} className={studyType === id ? 'active' : ''} onClick={() => { setStudyType(id); setResult(null); setError(''); }}><strong>{label}</strong><span>{description}</span></button>)}</div>
    <section className="workflow-card"><div className="workflow-card-heading"><div><span className="step-kicker">Study configuration</span><h2>{currentStudy[1]}</h2><p>{currentStudy[2]}</p></div></div>
      {!hasData && <CSVUploader onData={configureDefaults} />}
      <div className="form-grid">
        {(studyType === 'crossed' || studyType === 'nested') && <>{mapSelect('part', 'Part')}{mapSelect('operator', 'Operator / appraiser')}{mapSelect('measurement', 'Measurement')}<div className="form-group"><label>Process Tolerance (optional)</label><input type="number" step="any" value={tolerance} onChange={event => setTolerance(event.target.value)} /><small>USL − LSL. Used to calculate %Tolerance.</small></div></>}
        {studyType === 'attribute' && <>{mapSelect('item', 'Sample / item')}{mapSelect('operator', 'Appraiser')}{mapSelect('rating', 'Rating')}{mapSelect('trial', 'Trial', false)}{mapSelect('reference', 'Known standard', false)}</>}
        {studyType === 'bias' && <>{mapSelect('measurement', 'Measurement')}<div className="form-group"><label>Known reference value <span className="required-indicator">*</span></label><input type="number" step="any" value={referenceValue} onChange={event => setReferenceValue(event.target.value)} /></div></>}
        {studyType === 'linearity' && <>{mapSelect('reference', 'Reference value')}{mapSelect('measurement', 'Measured value')}</>}
        {studyType === 'stability' && <>{mapSelect('measurement', 'Ordered repeated measurement')}</>}
      </div><button className="btn-primary" type="button" onClick={run}>Run {currentStudy[1]}</button>
    </section>
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    {result && summary && <section className="workflow-card results-card"><div className={`assessment-banner ${summary.tone}`}><span>Measurement system assessment</span><strong>{summary.status}</strong></div><div className="stat-grid">{summary.metrics.map(([label, value]) => <div className="stat-card" key={label}><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>)}</div>
      {(studyType === 'crossed' || studyType === 'nested') && <div className="table-scroll"><table className="professional-table"><thead><tr><th>Source</th><th>SS</th><th>df</th><th>MS</th></tr></thead><tbody>{result.anova.map(row => <tr key={row.source}><td>{row.source}</td><td>{formatMetric(row.ss)}</td><td>{row.df}</td><td>{formatMetric(row.ms)}</td></tr>)}</tbody></table></div>}
      {studyType === 'attribute' && <div className="table-scroll"><table className="professional-table"><thead><tr><th>Comparison</th><th>Agreement</th><th>Kappa</th><th>Meaning</th></tr></thead><tbody>{result.betweenAppraiser.map(row => <tr key={row.appraisers.join('-')}><td>{row.appraisers.join(' vs ')}</td><td>{formatMetric(row.agreement * 100, 1)}%</td><td>{formatMetric(row.kappa, 3)}</td><td>Kappa adjusts observed agreement for agreement expected by chance.</td></tr>)}</tbody></table></div>}
      {studyType === 'linearity' && <ResponsiveContainer width="100%" height={260}><LineChart data={result.biases.map((bias, index) => ({ reference: numeric(raw(mapping.reference))[index], bias }))}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="reference"/><YAxis/><Tooltip/><ReferenceLine y={0} stroke="var(--text-muted)"/><Line dataKey="bias" stroke="var(--accent)" dot /></LineChart></ResponsiveContainer>}
      {studyType === 'stability' && <ResponsiveContainer width="100%" height={260}><LineChart data={result.chart.points.map((point, index) => ({ index: index + 1, value: point.value }))}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="index"/><YAxis/><Tooltip/><ReferenceLine y={result.chart.ucl} stroke="var(--red)"/><ReferenceLine y={result.chart.centerLine} stroke="var(--accent)"/><ReferenceLine y={result.chart.lcl} stroke="var(--red)"/><Line dataKey="value" stroke="var(--accent)" dot /></LineChart></ResponsiveContainer>}
      <p className="interpretation-copy">{result.interpretation || result.limitation || summary.status}</p><div className="workflow-actions"><button className="btn-secondary" type="button" onClick={() => window.print()}>Print</button><button className="btn-secondary" type="button" onClick={createFindingAction}>Create Finding</button><button className="btn-primary" type="button" onClick={addToProject}>Add to Project</button><button className="btn-secondary" type="button" onClick={addToReport}>{inReport?'Remove from Report':'Add to Report'}</button></div>{notice && <div className="inline-notice" role="status">{notice}</div>}</section>}
  </div>;
}
