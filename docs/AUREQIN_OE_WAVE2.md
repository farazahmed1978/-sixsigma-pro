# Aureqin OE Wave 2: SPC, MSA, and process capability

## Architecture

Wave 2 introduces pure, versioned engines in `spcEngine.js`, `msaEngine.js`, and `capabilityEngine.js`. React tools remain presentation/adaptation layers. No database migration is required; report payloads retain structured method, version, design, variance components, diagnostics, warnings, and validation status alongside existing screenshots.

## SPC

The shared SPC contract supports ordered observations, rational subgroups, chart constants, observation-specific limits, structured rule violations, stage metadata, historical center/sigma/limits, stability state, and deterministic chart recommendations.

Implemented engines:

- I, MR, and combined I-MR
- Xbar-R for constant subgroup sizes 2–10
- Xbar-S for published constant subgroup sizes 2–20 and 25
- p, np, c, and u attribute charts
- Existing EWMA/CUSUM UI remains intact and is deferred for independent reference validation

Attribute inputs reject negative/non-integer counts, invalid denominators, and defective counts greater than sample size. p/u limits vary by observation when denominators vary. Arbitrary stage overlap and invalid boundaries are rejected. Historical limits are labeled separately from estimated limits.

Rule violations are records rather than colors: stable rule ID/version, involved point indices/values, explanation, severity, and z-score/limit evidence. The engine implements the four common Western Electric zone/run rules plus six-point trend and fourteen-point alternation screens.

## MSA

The MSA engine supports:

- Balanced crossed Gage R&R using two-way random-effects ANOVA variance components, including repeatability, operator, part×operator interaction, reproducibility, part-to-part, total variation, contribution, study variation, tolerance when supplied, ndc, and an ANOVA table.
- Balanced nested Gage R&R with operator, part-within-operator, and repeatability components.
- Attribute agreement: within-appraiser agreement, pairwise between-appraiser agreement, agreement to a supplied standard, practical percentages, and multi-category Cohen kappa where defined.
- Bias using a one-sample t engine and confidence interval.
- Linearity as regression of measurement bias on reference value.
- Stability through the shared I-MR engine, with an explicit limitation that a chart screen does not prove independence.

Unbalanced variance-components models and fixed/random mixed-model selection are deferred; the engine fails with an actionable design error rather than silently applying balanced formulas.

## Capability

Normal capability supports two-sided, LSL-only, and USL-only specifications; Cp, Cpk, Cpu, Cpl, Pp, Ppk, Ppu, Ppl, and Cpm; pooled within-subgroup versus overall sigma; observed versus model-expected nonconformance; normality context; stability evidence; and MSA evidence. Capability is not blocked by unstable/inadequate evidence, but deterministic warnings remain attached to the result.

A guarded lognormal path is implemented for strictly positive data. It returns fitted log parameters, natural percentile spread, nonnormal indices, and expected nonconformance while requiring distribution-fit review. Weibull, gamma, exponential, Box-Cox, and broad distribution selection remain deferred until independently validated. Approximate Cpk intervals follow the NIST large-sample approximation and are suppressed below n=25.

## Cross-tool evidence

Capability accepts stable evidence objects (`id`, `stable`) and measurement-system evidence objects (`id`, `adequate`). These can be supplied only when dataset/version and variable mapping establish identity. The engine stores evidence IDs and deterministic PASS/FAIL/NOT_ASSESSABLE status; it never fabricates a linkage.

Structured SPC violations and capability/MSA warnings are compatible with Foundation-0 finding creation for `special_cause`, `process_unstable`, `capability_below_target`, and `measurement_system_inadequate`. Full Action/Risk/Issue UI is deferred.

## Validation status

- I-MR: PARTIALLY VALIDATED against the existing NIST fixture for moving ranges, centers, I limits, and no outside points. MR-limit and expanded-rule coverage remains incomplete.
- Normal capability: PARTIALLY VALIDATED against NIST-published definitions and worked parameters; the executable suite covers two-sided/one-sided/subgroup/defect paths, but full independent CI and tail-output fixtures remain incomplete.
- Bias, linearity, and MSA stability inherit partially validated one-sample t, regression, and I-MR engines, but the combined MSA workflows remain PARTIALLY VALIDATED at most.
- Xbar-R, Xbar-S, p, np, c, u, crossed Gage R&R, nested Gage R&R, attribute agreement, and lognormal capability: UNVALIDATED. Their deterministic/edge tests are not independent reference fixtures and do not elevate status.
- EWMA, CUSUM, Weibull, gamma, exponential, and Box-Cox: UNVALIDATED/deferred.

Reference authorities: NIST/SEMATECH Engineering Statistics Handbook sections on Shewhart Xbar/R/S charts, process capability definitions/interval approximations/nonnormal remedies, and NIST gauge-study guidance covering repeatability, reproducibility, stability, bias, and linearity.
