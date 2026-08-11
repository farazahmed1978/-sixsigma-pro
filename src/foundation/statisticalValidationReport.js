import { ANALYTICS_CATALOG } from '../config/analyticsCatalog';
import { VALIDATION_STATUS } from './provenance';
import { STATISTICAL_VALIDATION_CATALOG } from './validationCatalog';
import { validateMethod } from './validation';

const STATUS_ORDER = [VALIDATION_STATUS.VALIDATED, VALIDATION_STATUS.PARTIALLY_VALIDATED, VALIDATION_STATUS.UNVALIDATED];

export function buildStatisticalValidationSummary() {
  const executable = new Map(STATISTICAL_VALIDATION_CATALOG.map(manifest => {
    const result = validateMethod(manifest, manifest.runner);
    return [manifest.methodId, { manifest, result }];
  }));
  const methods = ANALYTICS_CATALOG.map(method => {
    const governed = executable.get(method.id) || (method.id === 'linear-regression' ? executable.get('simple-linear-regression') : null);
    return governed ? {
      methodId: method.id,
      methodName: method.name,
      status: governed.result.status,
      fixtureCount: governed.result.verifiedFixtureCount,
      passingFixtureCount: governed.result.results.filter(item => item.pass).length,
      referenceCount: new Set(governed.manifest.cases.map(item => item.reference?.url).filter(Boolean)).size,
      discrepancyCount: (governed.manifest.discrepancies || []).length,
      unresolvedDiscrepancyCount: governed.result.unresolvedDiscrepancies.length,
      missingRequiredOutputs: governed.result.missingRequiredOutputs,
      promotionBlockers: governed.result.promotionBlockers,
    } : {
      methodId: method.id,
      methodName: method.name,
      status: VALIDATION_STATUS.UNVALIDATED,
      fixtureCount: 0,
      passingFixtureCount: 0,
      referenceCount: 0,
      discrepancyCount: 0,
      unresolvedDiscrepancyCount: 0,
      missingRequiredOutputs: [],
      promotionBlockers: ['noExecutableValidationManifest'],
    };
  });
  const imr = executable.get('individuals-moving-range');
  methods.push({
    methodId: 'individuals-moving-range', methodName: 'Individuals / Moving Range', status: imr.result.status,
    fixtureCount: imr.result.verifiedFixtureCount, passingFixtureCount: imr.result.results.filter(item => item.pass).length,
    referenceCount: new Set(imr.manifest.cases.map(item => item.reference?.url).filter(Boolean)).size,
    discrepancyCount: (imr.manifest.discrepancies || []).length,
    unresolvedDiscrepancyCount: imr.result.unresolvedDiscrepancies.length,
    missingRequiredOutputs: imr.result.missingRequiredOutputs, promotionBlockers: imr.result.promotionBlockers,
  });
  const statusCounts = Object.fromEntries(STATUS_ORDER.map(status => [status, methods.filter(item => item.status === status).length]));
  return { generatedBy: 'src/foundation/statisticalValidationReport.js', methodCount: methods.length, statusCounts, methods };
}

export function formatStatisticalValidationSummary(summary = buildStatisticalValidationSummary()) {
  const lines = [
    `Statistical validation summary: ${summary.methodCount} methods`,
    ...STATUS_ORDER.map(status => `${status}: ${summary.statusCounts[status]}`),
    '',
    'method\tstatus\tfixtures passed/verified\treferences\tdiscrepancies open/total\tpromotion blockers',
  ];
  summary.methods.forEach(item => lines.push([
    item.methodId, item.status, `${item.passingFixtureCount}/${item.fixtureCount}`, item.referenceCount,
    `${item.unresolvedDiscrepancyCount}/${item.discrepancyCount}`, item.promotionBlockers.join(',') || 'none',
  ].join('\t')));
  return lines.join('\n');
}
