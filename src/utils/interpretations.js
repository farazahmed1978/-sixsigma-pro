// Rule-based (deterministic) plain-English interpretations for chart results.
// No AI/API calls — this is pure threshold logic, same spirit as the Western
// Electric rules themselves. Free to run, no per-use cost.

export function interpretControlChart({ violationCount, totalPoints, ruleBreakdown }) {
  const lines = [];

  if (violationCount === 0) {
    lines.push(
      `The process shows no signals of special cause variation across ${totalPoints} data points. ` +
      `All points fall within statistical control limits and no Western Electric rule was triggered. ` +
      `This process appears stable and predictable — variation observed is consistent with common cause (random) variation only.`
    );
  } else {
    lines.push(
      `${violationCount} of ${totalPoints} points triggered at least one special-cause signal. ` +
      `This indicates the process is NOT currently in a state of statistical control — something changed the process behavior at these points, ` +
      `and it is worth investigating the specific cause (a shift change, a material lot change, equipment drift, etc.) rather than treating this as expected variation.`
    );
    if (ruleBreakdown) {
      const ruleTexts = [];
      if (ruleBreakdown.rule1) ruleTexts.push(`${ruleBreakdown.rule1} point(s) fell beyond the 3-sigma control limit — the strongest signal of a real process shift.`);
      if (ruleBreakdown.rule2) ruleTexts.push(`${ruleBreakdown.rule2} instance(s) of 2-of-3 consecutive points beyond 2-sigma on the same side — a moderate shift signal.`);
      if (ruleBreakdown.rule3) ruleTexts.push(`${ruleBreakdown.rule3} instance(s) of 4-of-5 consecutive points beyond 1-sigma on the same side — often an early indicator of a developing trend.`);
      if (ruleBreakdown.rule4) ruleTexts.push(`${ruleBreakdown.rule4} run(s) of 8+ consecutive points on one side of the centerline — suggests a sustained shift in the process mean rather than a one-time event.`);
      lines.push(...ruleTexts);
    }
  }

  return lines.join(' ');
}

export function interpretCapability({ cpk, cp }) {
  if (cpk == null) return '';
  let verdict;
  if (cpk >= 1.67) verdict = 'excellent — the process comfortably meets specification with substantial margin.';
  else if (cpk >= 1.33) verdict = 'adequate — the process meets typical industry capability standards.';
  else if (cpk >= 1.0) verdict = 'marginal — the process meets specification but with little margin for drift; expect occasional out-of-spec output.';
  else verdict = 'inadequate — the process is not capable of consistently meeting specification as currently configured, even if it is statistically stable.';

  let note = '';
  if (cp && cpk && cp - cpk > 0.2) {
    note = ' There is a meaningful gap between Cp and Cpk, which indicates the process is not centered within its specification limits — centering the process (without reducing variation) could improve capability further.';
  }

  return `Process capability index (Cpk) is ${cpk.toFixed(3)}, which is ${verdict}${note}`;
}

export function interpretSubgroupChart({ xbarViolations, secondaryViolations, subgroupCount, usingR }) {
  const total = xbarViolations + secondaryViolations;
  if (total === 0) {
    return `Across ${subgroupCount} subgroups, both the X-bar chart and the ${usingR ? 'Range' : 'Standard Deviation'} chart show no out-of-control points. The process mean and within-subgroup variation both appear stable.`;
  }
  const parts = [];
  if (xbarViolations > 0) parts.push(`${xbarViolations} subgroup(s) show the process mean shifting outside control limits`);
  if (secondaryViolations > 0) parts.push(`${secondaryViolations} subgroup(s) show unusual within-subgroup variation (${usingR ? 'range' : 'standard deviation'} out of limits)`);
  return `Across ${subgroupCount} subgroups: ${parts.join(', and ')}. This suggests the process is not currently in statistical control — investigate what changed at the flagged subgroups.`;
}

export function interpretAttributeChart({ chartType, violationCount, totalPoints, center }) {
  const chartNames = { p: 'fraction defective (p)', np: 'number defective (np)', c: 'defect count (c)', u: 'defects per unit (u)' };
  const name = chartNames[chartType] || chartType;
  if (violationCount === 0) {
    return `The ${name} chart shows all ${totalPoints} points within control limits, centered around ${center.toFixed(4)}. Defect/nonconformance behavior appears stable and predictable at this baseline rate.`;
  }
  return `${violationCount} of ${totalPoints} points on the ${name} chart fall outside control limits (center: ${center.toFixed(4)}). This signals the defect rate is not stable — investigate what changed at the flagged points before assuming the current baseline rate will hold going forward.`;
}

export function interpretRunChart({ n, median, runsCount, expectedRuns, runsFlag, longestRunLen, shiftFlag, trendLen, trendFlag }) {
  if (!runsFlag && !shiftFlag && !trendFlag) {
    return `Across ${n} points (median = ${median.toFixed(4)}), the data shows ${runsCount} runs about the median, close to the ${expectedRuns.toFixed(1)} expected by chance. ` +
      `No shift or trend pattern was detected. This process appears to be behaving randomly around a stable center — consistent with common cause variation only.`;
  }
  const lines = [`Across ${n} points (median = ${median.toFixed(4)}), the data shows signs of a non-random pattern:`];
  if (runsFlag) {
    lines.push(runsCount < expectedRuns
      ? `Only ${runsCount} runs were observed versus ${expectedRuns.toFixed(1)} expected — fewer runs than expected suggests clustering or a shift in the process, not pure randomness.`
      : `${runsCount} runs were observed versus ${expectedRuns.toFixed(1)} expected — more runs than expected suggests the data is oscillating more than random chance would predict, possibly from over-adjustment or mixed sources.`
    );
  }
  if (shiftFlag) {
    lines.push(`A run of ${longestRunLen} consecutive points fell on the same side of the median — a strong signal the process mean has shifted.`);
  }
  if (trendFlag) {
    lines.push(`A trend of ${trendLen} consecutive points moving in the same direction was detected — the process may be drifting rather than holding a stable level.`);
  }
  return lines.join(' ');
}

export function interpretHistogram({ n, mean, stddev, skewness }) {
  const absSkew = Math.abs(skewness);
  let shape;
  if (absSkew < 0.5) shape = 'roughly symmetric — consistent with a normal-ish distribution';
  else if (absSkew < 1.0) shape = `moderately ${skewness > 0 ? 'right' : 'left'}-skewed`;
  else shape = `heavily ${skewness > 0 ? 'right' : 'left'}-skewed`;

  let note = '';
  if (absSkew >= 1.0) {
    note = skewness > 0
      ? ' A long right tail like this often points to a lower bound (a physical limit, a minimum spec) with occasional high outliers pulling the distribution — worth checking for a root cause behind the extreme values rather than assuming a normal distribution for downstream capability analysis.'
      : ' A long left tail like this often points to an upper bound with occasional low outliers — worth investigating rather than assuming normality for downstream capability analysis.';
  }

  return `Across ${n} data points (mean = ${mean.toFixed(4)}, std dev = ${stddev.toFixed(4)}), the distribution is ${shape} (skewness = ${skewness.toFixed(3)}).${note}`;
}

export function interpretPareto({ totalCategories, vitalFewCount, vitalFewPct, topCategory, topCategoryPct }) {
  return `Of ${totalCategories} categories, the top ${vitalFewCount} (led by "${topCategory}" at ${topCategoryPct.toFixed(1)}% of the total) account for ${vitalFewPct.toFixed(1)}% of all occurrences. ` +
    `This follows the classic 80/20 pattern — focusing improvement effort on these ${vitalFewCount} categories will yield the largest return, rather than spreading effort evenly across all ${totalCategories}.`;
}

export function interpretBoxPlot(groups) {
  // groups: array of { group, n, min, max, Q1, Q3, IQR, median, mean, outliers }
  if (groups.length === 1) {
    const g = groups[0];
    const outlierNote = g.outliers.length > 0
      ? ` ${g.outliers.length} outlier(s) fall outside 1.5×IQR from the box — worth investigating individually rather than assuming they're noise.`
      : ' No outliers were detected beyond 1.5×IQR.';
    return `${g.group} (n=${g.n}): median ${g.median.toFixed(3)}, IQR ${g.IQR.toFixed(3)} (Q1=${g.Q1.toFixed(3)}, Q3=${g.Q3.toFixed(3)}).${outlierNote}`;
  }
  const totalOutliers = groups.reduce((s, g) => s + g.outliers.length, 0);
  const medians = groups.map(g => g.median);
  const spread = Math.max(...medians) - Math.min(...medians);
  const widest = groups.reduce((a, b) => (b.IQR > a.IQR ? b : a));
  const narrowest = groups.reduce((a, b) => (b.IQR < a.IQR ? b : a));
  return `Comparing ${groups.length} groups: medians range from ${Math.min(...medians).toFixed(3)} to ${Math.max(...medians).toFixed(3)} (a spread of ${spread.toFixed(3)}). ` +
    `"${widest.group}" shows the most variation (IQR=${widest.IQR.toFixed(3)}), while "${narrowest.group}" is the most consistent (IQR=${narrowest.IQR.toFixed(3)}). ` +
    (totalOutliers > 0 ? `${totalOutliers} total outlier(s) were flagged across all groups — worth investigating before comparing group centers.` : 'No outliers were flagged in any group.');
}

export function interpretScatterPlot({ r, r2, n, xName, yName }) {
  const absR = Math.abs(r);
  const strength = absR >= 0.7 ? 'strong' : absR >= 0.4 ? 'moderate' : absR >= 0.2 ? 'weak' : 'negligible';
  const direction = r > 0 ? 'positive' : 'negative';
  if (absR < 0.2) {
    return `Across ${n} paired observations, there is essentially no linear relationship between ${xName} and ${yName} (r=${r.toFixed(3)}, R²=${(r2 * 100).toFixed(1)}%). ${xName} does not appear to be a useful linear predictor of ${yName}.`;
  }
  return `Across ${n} paired observations, ${xName} and ${yName} show a ${strength} ${direction} linear relationship (r=${r.toFixed(3)}, R²=${(r2 * 100).toFixed(1)}%). ` +
    `${(r2 * 100).toFixed(1)}% of the variation in ${yName} can be explained by ${xName} alone. ` +
    `${strength === 'strong' || strength === 'moderate' ? 'This is a promising candidate predictor to investigate further, though correlation alone does not establish causation.' : 'Other factors likely explain most of the variation in ' + yName + '.'}`;
}

export function interpretMSA({ pctGRR, repeatability, reproducibility, ndc, parts, ops }) {
  let verdict;
  if (pctGRR < 10) verdict = `excellent — the measurement system contributes only ${pctGRR.toFixed(1)}% of total variation, well under the 10% threshold. It is fit for use in process monitoring and improvement decisions.`;
  else if (pctGRR < 30) verdict = `marginal — %GRR = ${pctGRR.toFixed(1)}% falls in the 10–30% range. This may be acceptable depending on the application, but it introduces meaningful measurement noise into any downstream analysis.`;
  else verdict = `unacceptable — %GRR = ${pctGRR.toFixed(1)}% exceeds 30%. Data collected with this measurement system cannot be trusted to reflect true process variation until the system is improved.`;

  const dominant = repeatability >= reproducibility ? 'repeatability (equipment variation)' : 'reproducibility (operator-to-operator variation)';
  const source = repeatability >= reproducibility
    ? 'the gage or measurement device itself — focus improvement on equipment calibration, fixturing, or measurement procedure.'
    : 'differences between operators — focus improvement on training, standardized work instructions, or operator technique.';

  return `Based on ${parts} parts measured by ${ops} operators, this measurement system is ${verdict} ` +
    `The larger contributor is ${dominant}, pointing to ${source} The system can distinguish approximately ${ndc} distinct data categories (NDC); a value below 5 means the system cannot reliably detect process variation at all.`;
}

export function interpretMultiVariChart({ groupCol, groups, groupRanges }) {
  if (!groupCol || !groups || groups.length < 2) {
    return `The chart plots the measurement in observation order with no grouping factor applied — look for visible patterns (drift, cycling, or clustering) across the sequence.`;
  }
  const widest = groups[groupRanges.indexOf(Math.max(...groupRanges))];
  const narrowest = groups[groupRanges.indexOf(Math.min(...groupRanges))];
  const spreadRatio = Math.max(...groupRanges) / Math.max(Math.min(...groupRanges), 0.0001);
  const note = spreadRatio > 2
    ? ` "${widest}" shows notably more variation than "${narrowest}" (roughly ${spreadRatio.toFixed(1)}x the range) — this points to ${groupCol} as a meaningful source of variation worth investigating.`
    : ` Variation across ${groupCol} levels looks fairly comparable — ${groupCol} does not stand out as a dominant source of variation on its own.`;
  return `Comparing variation across ${groups.length} levels of ${groupCol}:${note}`;
}

export function interpretAnova({ F, p, dfB, dfW, etaSq, groupStats }, groupingVar, outcomeVar, groupNames) {
  const sig = p < 0.05;
  const sizeWord = etaSq >= 0.14 ? 'large' : etaSq >= 0.06 ? 'medium' : 'small';
  const means = groupStats.map((g, i) => `${groupNames[i]} (mean=${g.mean.toFixed(3)}, n=${g.n})`).join(', ');
  if (!sig) {
    return `One-way ANOVA of ${outcomeVar} across ${groupStats.length} levels of ${groupingVar} found no statistically significant difference ` +
      `(F(${dfB},${dfW})=${F.toFixed(3)}, p=${p.toFixed(4)}). Group means: ${means}. Based on this data, there is not enough evidence to say ${groupingVar} affects ${outcomeVar}.`;
  }
  return `One-way ANOVA of ${outcomeVar} across ${groupStats.length} levels of ${groupingVar} found a statistically significant difference ` +
    `(F(${dfB},${dfW})=${F.toFixed(3)}, p=${p.toFixed(4)}), with a ${sizeWord} effect size (η²=${etaSq.toFixed(3)}). Group means: ${means}. ` +
    `At least one group's average differs from the others — run the post-hoc comparison to see exactly which pairs differ.`;
}

export function interpretRMAnova({ F, p, dfCond, dfError, etaSq, condMeans }, conditionNames) {
  const sig = p < 0.05;
  const sizeWord = etaSq >= 0.14 ? 'large' : etaSq >= 0.06 ? 'medium' : 'small';
  const means = condMeans.map((m, i) => `${conditionNames[i]} (mean=${m.toFixed(3)})`).join(', ');
  if (!sig) {
    return `Repeated-measures ANOVA across ${conditionNames.length} conditions found no statistically significant difference ` +
      `(F(${dfCond},${dfError})=${F.toFixed(3)}, p=${p.toFixed(4)}). Condition means: ${means}. There is not enough evidence that these conditions differ.`;
  }
  return `Repeated-measures ANOVA across ${conditionNames.length} conditions found a statistically significant difference ` +
    `(F(${dfCond},${dfError})=${F.toFixed(3)}, p=${p.toFixed(4)}), with a ${sizeWord} effect size (η²=${etaSq.toFixed(3)}). Condition means: ${means}. ` +
    `At least one condition's average differs from the others — run the post-hoc comparison to see exactly which pairs differ, and check Mauchly's test since repeated measures data must meet the sphericity assumption.`;
}
export function interpretTwoWayAnova(r, factorAName, factorBName, outcomeVar) {
  const sigA = r.pa < 0.05, sigB = r.pb < 0.05, sigAB = r.pab < 0.05;
  const parts = [];

  parts.push(
    sigA
      ? `${factorAName} has a statistically significant effect on ${outcomeVar} (F(${r.dfA},${r.dfE})=${r.Fa.toFixed(3)}, p=${r.pa.toFixed(4)}).`
      : `${factorAName} does not show a statistically significant effect on ${outcomeVar} (F(${r.dfA},${r.dfE})=${r.Fa.toFixed(3)}, p=${r.pa.toFixed(4)}).`
  );
  parts.push(
    sigB
      ? `${factorBName} has a statistically significant effect on ${outcomeVar} (F(${r.dfB},${r.dfE})=${r.Fb.toFixed(3)}, p=${r.pb.toFixed(4)}).`
      : `${factorBName} does not show a statistically significant effect on ${outcomeVar} (F(${r.dfB},${r.dfE})=${r.Fb.toFixed(3)}, p=${r.pb.toFixed(4)}).`
  );

  if (sigAB) {
    parts.push(
      `The interaction between ${factorAName} and ${factorBName} is also statistically significant (F(${r.dfAB},${r.dfE})=${r.Fab.toFixed(3)}, p=${r.pab.toFixed(4)}) — ` +
      `this means the effect of one factor depends on the level of the other, so the individual ${factorAName} and ${factorBName} results above should be interpreted with caution ` +
      `(look at the cell means / interaction plot rather than treating each factor's effect as constant across all levels of the other).`
    );
  } else {
    parts.push(
      `The interaction between ${factorAName} and ${factorBName} is not statistically significant (F(${r.dfAB},${r.dfE})=${r.Fab.toFixed(3)}, p=${r.pab.toFixed(4)}) — ` +
      `the two factors appear to act independently on ${outcomeVar}.`
    );
  }

  return parts.join(' ');
}
export function interpretCorrelationMatrix({ cols, mat }) {
  const pairs = [];
  for (let i = 0; i < cols.length; i++) {
    for (let j = i + 1; j < cols.length; j++) {
      pairs.push({ a: cols[i].name, b: cols[j].name, r: mat[i][j] });
    }
  }
  const strong = pairs.filter(p => Math.abs(p.r) >= 0.7).sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  if (strong.length === 0) {
    return `Across ${cols.length} variables, no pair shows a strong correlation (|r| ≥ 0.7). Variables in this set appear to move largely independently of one another.`;
  }
  const top = strong.slice(0, 3).map(p => `${p.a} and ${p.b} (r=${p.r.toFixed(3)})`).join('; ');
  return `Across ${cols.length} variables, ${strong.length} pair(s) show strong correlation (|r| ≥ 0.7). The strongest relationship(s): ${top}. ` +
    `These pairs are good candidates for regression or root-cause investigation — but remember correlation does not establish which variable is driving the other.`;
}

export function interpretRegression({ r2, b0, b1, t, n, xName, yName }) {
  const fitStrength = r2 >= 0.7 ? 'strong' : r2 >= 0.4 ? 'moderate' : 'weak';
  const significant = Math.abs(t) >= 2; // rough rule of thumb, ~95% CI for reasonably large n
  const direction = b1 >= 0 ? 'increases' : 'decreases';

  let text = `Based on ${n} paired observations, ${xName} explains ${(r2 * 100).toFixed(1)}% of the variation in ${yName} (${fitStrength} fit). ` +
    `For every 1-unit increase in ${xName}, ${yName} ${direction} by ${Math.abs(b1).toFixed(4)} on average.`;

  text += significant
    ? ` The slope is statistically meaningful (t=${t.toFixed(2)}), supporting a real relationship rather than random noise.`
    : ` The slope's significance is borderline (t=${t.toFixed(2)}) — with this sample size, be cautious about treating the relationship as firmly established.`;

  if (r2 < 0.4) {
    text += ` Given the weak fit, consider whether other predictors, interactions, or a non-linear relationship better explain ${yName}.`;
  }
  return text;
}

export function interpretDescriptiveStats({ n, mean, median, stddev, skewness, kurtosis, coefVar }) {
  const shapeNote = Math.abs(skewness) < 0.5
    ? 'approximately symmetric'
    : `${Math.abs(skewness) < 1 ? 'moderately' : 'heavily'} ${skewness > 0 ? 'right' : 'left'}-skewed`;
  const kurtNote = Math.abs(kurtosis) < 0.5
    ? 'a roughly normal peak/tail shape'
    : kurtosis > 0
      ? 'heavier tails than a normal distribution (more extreme values than expected)'
      : 'lighter tails than a normal distribution (fewer extreme values than expected)';
  const spreadNote = coefVar < 15
    ? 'relatively low variability relative to the mean'
    : coefVar < 30
      ? 'moderate variability relative to the mean'
      : 'high variability relative to the mean — worth checking whether this data represents a single stable process';

  return `Across ${n} observations (mean=${mean.toFixed(4)}, median=${median.toFixed(4)}, std dev=${stddev.toFixed(4)}), the distribution is ${shapeNote} with ${kurtNote}. ` +
    `The coefficient of variation (${coefVar.toFixed(1)}%) indicates ${spreadNote}. ` +
    `${Math.abs(skewness) >= 1 ? 'Given the skew, consider nonparametric methods or a data transformation before applying tests that assume normality.' : 'A normal distribution is a reasonable working assumption for downstream parametric analysis.'}`;
}

export function interpretFMEA({ rows }) {
  const critical = rows.filter(r => r.rpn >= 200);
  const high = rows.filter(r => r.rpn >= 100 && r.rpn < 200);
  const avgRPN = rows.length ? Math.round(rows.reduce((s, r) => s + r.rpn, 0) / rows.length) : 0;
  const openCount = rows.filter(r => r.status === 'Open' || r.status === 'In Progress').length;

  if (critical.length === 0 && high.length === 0) {
    return `Across ${rows.length} failure modes (avg RPN = ${avgRPN}), none currently reach the High (≥100) or Critical (≥200) threshold. The process is in reasonable shape, but keep monitoring — RPN scores should be revisited whenever controls or the process itself change.`;
  }

  const topRisk = [...rows].sort((a, b) => b.rpn - a.rpn)[0];
  const lines = [`Across ${rows.length} failure modes (avg RPN = ${avgRPN}): ${critical.length} are Critical (RPN ≥ 200) and ${high.length} are High (RPN 100–199).`];
  lines.push(`The top risk is "${topRisk.failureMode}" in ${topRisk.processStep} (RPN = ${topRisk.rpn}) — ${topRisk.effect ? `effect: ${topRisk.effect}.` : ''} This should be the first priority for corrective action.`);
  if (openCount > 0) lines.push(`${openCount} item(s) still show Open or In Progress status — track these to closure and re-score after each action to confirm RPN actually drops.`);
  return lines.join(' ');
}

export function interpretFishbone({ problem, causes }) {
  const counts = Object.entries(causes).map(([cat, list]) => [cat, list.length]);
  const total = counts.reduce((s, [, c]) => s + c, 0);
  if (total === 0) {
    return `No causes have been logged yet for "${problem}". Brainstorm across all 6M categories (Man, Machine, Method, Material, Measurement, Mother Nature) before prioritizing root-cause investigation.`;
  }
  const sorted = [...counts].sort((a, b) => b[1] - a[1]);
  const [topCat, topCount] = sorted[0];
  const emptyCats = counts.filter(([, c]) => c === 0).map(([cat]) => cat);
  let text = `For "${problem}", ${total} potential cause(s) were identified across the 6M categories. "${topCat}" has the most (${topCount}) — this is the category to prioritize for root-cause verification (5 Whys, data collection) before moving to solutions.`;
  if (emptyCats.length > 0) {
    text += ` No causes were logged under ${emptyCats.join(', ')} — worth a second brainstorming pass to check these aren't being overlooked.`;
  }
  return text;
}

export function interpretVSM({ efficiency, totalLeadTime, totalVATime, totalInventory, steps, taktTime }) {
  const nvaTime = totalLeadTime - totalVATime;
  const biggestWait = [...steps].sort((a, b) => b.waitTime - a.waitTime)[0];
  let verdict;
  if (efficiency > 50) verdict = 'good process efficiency — most of the lead time is spent adding value the customer pays for.';
  else if (efficiency > 25) verdict = 'moderate efficiency — a significant share of lead time is non-value-added, mainly wait time between steps.';
  else verdict = 'low process efficiency — the large majority of lead time is waste (wait, transport, inventory), not value-added work.';

  return `Process efficiency is ${efficiency.toFixed(1)}% (${totalVATime} min value-added out of ${totalLeadTime} min total lead time, ${nvaTime} min non-value-added) — ${verdict} ` +
    `The single largest source of delay is "${biggestWait.name}" with ${biggestWait.waitTime} min of wait time — this is the best first target for improvement. ` +
    `Total in-process inventory across all steps is ${totalInventory} units, against a takt time of ${(taktTime).toFixed(2)} min per unit needed to meet customer demand.`;
}

export function interpretSigmaLevel({ dpmo, sigmaLevel, yieldPct, units, opportunities, defects }) {
  const benchmarks = [
    { sigma: 6, dpmo: 3.4, label: 'World class' },
    { sigma: 5, dpmo: 233, label: 'Excellent' },
    { sigma: 4, dpmo: 6210, label: 'Industry average' },
    { sigma: 3, dpmo: 66807, label: 'Below average' },
    { sigma: 2, dpmo: 308537, label: 'Poor' },
  ];
  const nearest = benchmarks.reduce((a, b) => (Math.abs(b.sigma - sigmaLevel) < Math.abs(a.sigma - sigmaLevel) ? b : a));
  const nextBenchmark = benchmarks.filter(b => b.sigma > Math.floor(sigmaLevel)).sort((a, b) => a.sigma - b.sigma)[0];

  let text = `Based on ${defects} defects across ${units} units (${opportunities} opportunities per unit), this process runs at ${dpmo.toFixed(0)} DPMO (${yieldPct.toFixed(3)}% yield), which is a ${sigmaLevel.toFixed(2)}σ process (using the standard 1.5σ long-term shift) — closest to "${nearest.label}" territory.`;

  if (nextBenchmark) {
    const dpmoReduction = ((dpmo - nextBenchmark.dpmo) / dpmo * 100).toFixed(1);
    text += ` Reaching the next full sigma level (${nextBenchmark.sigma}σ) would require cutting DPMO to ${nextBenchmark.dpmo.toLocaleString()} — a ${dpmoReduction}% reduction in current defect rate.`;
  } else {
    text += ` This is already at or above world-class (6σ) performance.`;
  }
  return text;
}

export function interpretSampleSize({ mode, n, confidenceLevel, marginOfError, stdDev, proportion }) {
  if (mode === 'continuous') {
    return `To estimate the population mean within ±${marginOfError} at ${confidenceLevel}% confidence (using an estimated standard deviation of ${stdDev}), a sample of at least ${n} observations is required. ` +
      `A larger std dev estimate or a tighter margin of error would increase this number — this calculation is only as good as the std dev estimate going in.`;
  }
  return `To estimate a population proportion within ±${(marginOfError * 100).toFixed(1)} percentage points at ${confidenceLevel}% confidence (assuming a proportion near ${proportion}), a sample of at least ${n} observations is required. ` +
    `Using p=0.5 gives the most conservative (largest) sample size when the true proportion is unknown — if you have a better estimate, the required n usually drops.`;
}

export function interpretPower({ mode, n, power, effectSize, stdDev, alpha }) {
  if (mode === 'solveForN') {
    return `To detect a difference of ${effectSize} (with an estimated std dev of ${stdDev}) at ${(power * 100).toFixed(0)}% power and α=${alpha}, each group needs at least ${n} observations (${n * 2} total for a two-sample comparison). ` +
      `This is an approximation using the normal distribution rather than the exact noncentral t-distribution — treat it as a solid planning estimate, and note that smaller expected effect sizes require dramatically larger samples.`;
  }
  const verdict = power >= 0.8 ? 'adequate' : power >= 0.5 ? 'underpowered — real effects of this size have a meaningful chance of being missed' : 'severely underpowered — this study is unlikely to detect the effect even if it truly exists';
  return `With ${n} observations per group, detecting a difference of ${effectSize} (std dev ${stdDev}) at α=${alpha} gives approximately ${(power * 100).toFixed(1)}% power — ${verdict}. ` +
    `The conventional minimum target is 80% power; below that, a "no significant difference" result is hard to distinguish from "not enough data to tell."`;
}
