import React from 'react';

const labels = { PASS: 'Pass', WARNING: 'Review', FAIL: 'Fail', NOT_ASSESSABLE: 'Not assessable' };

export default function AssumptionReportCard({ report, compact = false }) {
  if (!report?.diagnostics?.length) return null;
  return <section className={`assumption-report-card ${compact ? 'compact' : ''}`} aria-label="Assumption report card">
    <header><div><span>ASSUMPTION REPORT CARD</span><h3>What Aureqin found</h3></div><small>Rules {report.ruleVersion}</small></header>
    <div className="assumption-report-grid">{report.diagnostics.map(item => <article key={item.id} className={`assumption-${item.status.toLowerCase().replace('_', '-')}`}>
      <div><strong>{item.label}</strong><span>{labels[item.status] || item.status}</span></div>
      <p>{item.message}</p>
      {!compact && <><small><b>Why it matters:</b> {item.implication}</small><small><b>Consider next:</b> {item.recommendedNextStep}</small>{Number.isFinite(item.statistic) && <small>{item.method}: statistic {item.statistic.toFixed(4)}{Number.isFinite(item.pValue) ? ` · p ${item.pValue < .001 ? '< .001' : item.pValue.toFixed(4)}` : ''}</small>}</>}
    </article>)}</div>
  </section>;
}
