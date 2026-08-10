export const GUIDANCE_SCHEMA_VERSION = 1;

export function createDecisionRule(input = {}) {
  if (!input.id || !input.when || !input.recommendation) throw new Error('Decision rules require id, when, and recommendation.');
  return {
    schemaVersion: GUIDANCE_SCHEMA_VERSION,
    id: input.id,
    version: input.version || '1',
    priority: Number(input.priority) || 0,
    when: input.when,
    recommendation: input.recommendation,
    explanation: input.explanation || '',
    assumptionRuleIds: input.assumptionRuleIds || [],
    nextSteps: input.nextSteps || [],
    source: input.source || {},
  };
}

export function createAssumptionRule(input = {}) {
  if (!input.id || typeof input.evaluate !== 'function') throw new Error('Assumption rules require id and evaluate.');
  return { schemaVersion: GUIDANCE_SCHEMA_VERSION, id: input.id, version: input.version || '1', evaluate: input.evaluate, explanation: input.explanation || '', source: input.source || {} };
}

export function evaluateGuidance(context, rules = [], assumptionRules = []) {
  const applicable = rules.map(createDecisionRule).filter(rule => rule.when(context)).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const assumptionsById = new Map(assumptionRules.map(rule => { const normalized = createAssumptionRule(rule); return [normalized.id, normalized]; }));
  const recommendations = applicable.map(rule => {
    const diagnostics = rule.assumptionRuleIds.map(id => assumptionsById.get(id)).filter(Boolean).map(ruleItem => ({ ruleId: ruleItem.id, ...ruleItem.evaluate(context), explanation: ruleItem.explanation }));
    return { ruleId: rule.id, ruleVersion: rule.version, recommendation: rule.recommendation, explanation: rule.explanation, diagnostics, nextSteps: rule.nextSteps };
  });
  return {
    schemaVersion: GUIDANCE_SCHEMA_VERSION,
    evaluatedAt: new Date().toISOString(),
    inputSummary: context.inputSummary || {},
    recommendations,
    recommended: recommendations[0] || null,
  };
}
