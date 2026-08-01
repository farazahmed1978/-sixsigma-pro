import React, { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useReport } from '../context/ReportContext';
import { interpretSigmaLevel } from '../utils/interpretations';
import { invNorm } from '../utils/statMath';
import './Tool.css';

const BENCHMARKS = [
  { sigma: 6, dpmo: 3.4 },
  { sigma: 5, dpmo: 233 },
  { sigma: 4, dpmo: 6210 },
  { sigma: 3, dpmo: 66807 },
  { sigma: 2, dpmo: 308537 },
  { sigma: 1, dpmo: 690000 },
];

export default function SigmaCalculator() {
  const { addReportItem } = useReport();
  const wrapperRef = useRef(null);
  const [units, setUnits] = useState('');
  const [opportunities, setOpportunities] = useState('1');
  const [defects, setDefects] = useState('');
  const [results, setResults] = useState(null);
  const [addedToReport, setAddedToReport] = useState(false);

  const calculate = () => {
    const u = +units, o = +opportunities, d = +defects;
    if (!u || !o || d < 0 || isNaN(d)) return;

    const totalOpportunities = u * o;
    const dpu = d / u;
    const dpmo = (d / totalOpportunities) * 1_000_000;
    const yieldFraction = Math.max(0, 1 - d / totalOpportunities);
    const yieldPct = yieldFraction * 100;
    const rty = Math.exp(-dpu) * 100; // Poisson-based rolled throughput yield

    // Sigma level with the standard 1.5-sigma long-term shift
    const zShortTerm = invNorm(yieldFraction);
    const sigmaLevel = zShortTerm + 1.5;

    setResults({ units: u, opportunities: o, defects: d, dpu, dpmo, yieldPct, rty, sigmaLevel, zShortTerm });
    setAddedToReport(false);
  };

  const handleAddToReport = useCallback(async () => {
    if (!wrapperRef.current || !results) return;

    const canvas = await html2canvas(wrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const interpretation = interpretSigmaLevel(results);

    addReportItem({
      title: 'Sigma Level / DPMO Calculator',
      toolId: 'sigma-calculator',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: {
        'Units': results.units,
        'Opportunities/Unit': results.opportunities,
        'Defects': results.defects,
        'DPU': results.dpu.toFixed(4),
        'DPMO': results.dpmo.toFixed(1),
        'Yield %': results.yieldPct.toFixed(3) + '%',
        'RTY %': results.rty.toFixed(3) + '%',
        'Sigma Level': results.sigmaLevel.toFixed(2),
      },
      interpretation,
      rawData: [],
    });

    setAddedToReport(true);
  }, [results, addReportItem]);

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.5rem' }}>Sigma Level / DPMO Calculator</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Converts defect counts into DPMO (Defects Per Million Opportunities) and a process sigma level, using the standard 1.5σ long-term shift.
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label>Units Produced/Inspected</label>
            <input type="number" min="1" value={units} onChange={e => setUnits(e.target.value)} placeholder="e.g. 500" />
          </div>
          <div className="form-group">
            <label>Opportunities per Unit</label>
            <input type="number" min="1" value={opportunities} onChange={e => setOpportunities(e.target.value)} placeholder="e.g. 5" />
          </div>
          <div className="form-group">
            <label>Defects Observed</label>
            <input type="number" min="0" value={defects} onChange={e => setDefects(e.target.value)} placeholder="e.g. 12" />
          </div>
        </div>
        <button className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={calculate} disabled={!units || !opportunities || defects === ''}>Calculate</button>
      </div>

      {results && (
        <>
          <div ref={wrapperRef}>
            <div className="stat-grid">
              {[
                ['DPU', results.dpu.toFixed(4)],
                ['DPMO', results.dpmo.toFixed(1)],
                ['Yield %', results.yieldPct.toFixed(3) + '%'],
                ['RTY %', results.rty.toFixed(3) + '%'],
                ['Sigma Level', results.sigmaLevel.toFixed(2)],
                ['Short-Term Z', results.zShortTerm.toFixed(2)],
              ].map(([l, v]) => (
                <div key={l} className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{v}</div><div className="stat-label">{l}</div></div>
              ))}
            </div>

            <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
              <div className="section-title" style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Sigma Level Benchmark</div>
              <table className="data-table">
                <thead><tr><th>Sigma</th><th>DPMO</th><th>Your Process</th></tr></thead>
                <tbody>
                  {BENCHMARKS.map(b => (
                    <tr key={b.sigma} style={{ background: Math.floor(results.sigmaLevel) === b.sigma ? 'var(--accent-dim)' : undefined }}>
                      <td style={{ fontWeight: 600 }}>{b.sigma}σ</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{b.dpmo.toLocaleString()}</td>
                      <td>{Math.floor(results.sigmaLevel) === b.sigma ? '◀ You are here' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn-primary no-print" onClick={handleAddToReport}>
              {addedToReport ? '✓ Added to Report' : '📄 Add to Report'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
