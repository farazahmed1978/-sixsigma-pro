# AUREQIN Statistical Validation Register

## Purpose and status rules

This register is the governed evidence record for production statistical calculations. It does not treat a passing unit test, a plausible output, or a QA harness result as independent statistical validation.

- **VALIDATED** requires all material outputs to match authoritative references within declared tolerances, at least two independently verified fixtures, explicit method-equivalence evidence, no open discrepancy, and a completed independent second review.
- **PARTIALLY VALIDATED** means at least one independently evidenced fixture passes, but one or more promotion requirements remain open.
- **UNVALIDATED** means there is no passing independently evidenced executable fixture for the production method.

The executable source of truth is `src/foundation/validationCatalog.js`; promotion gates are enforced in `src/foundation/validation.js`. Run `npm run validate:statistics` for a CI-readable summary covering every production analytics catalog entry plus I-MR.

## Current portfolio summary

| Status | Count | Meaning in this release |
|---|---:|---|
| VALIDATED | 0 | No method has yet completed the required independent second review and fixture depth. |
| PARTIALLY VALIDATED | 6 | One-sample t, Welch t, one-way ANOVA, simple linear regression, I-MR, and the one-sided normal tolerance factor have passing NIST-backed fixtures with documented gaps. |
| UNVALIDATED | 46 | No independently evidenced executable manifest exists yet. |
| **Total** | **52** | 51 analytics-catalog methods plus the governed I-MR engine. |

## Evidence matrix

“Outputs” lists the currently checked material outputs; the executable manifest is definitive. Unless stated otherwise, the reference version is the cited NIST content, accessed 2026-08-09. Default production parameters are two-sided alpha 0.05 / confidence 0.95 where applicable.

| Method / implementation version | Status | Reference and dataset | Method / parameters | Verified outputs and tolerance | Fixture / edge coverage | Discrepancy and review |
|---|---|---|---|---|---|---|
| 1-Sample t-Test / 1.0.0 | PARTIALLY VALIDATED | [NIST wafer particle example](https://www.itl.nist.gov/div898/handbook/prc/section2/prc22.htm), 10 published observations | Student one-sample t; mu0=50; two-sided | n, mean, sample SD, t, df; abs .001 / rel .0005 | 1 reference fixture; empty, n=1, missing, zero variance rejected | p-value, SE, CI uncovered; second fixture and independent review open |
| Welch 2-Sample t-Test / 1.0.0 | PARTIALLY VALIDATED | [NIST two-sample t definition](https://www.itl.nist.gov/div898/handbook/eda/section3/eda353.htm), transparent arithmetic fixture A=[1..5], B=[2,4,6,8] | unequal variance; Welch-Satterthwaite df; two-sided | n, means, variances, difference, SE, t, df; abs 1e-10 / rel 1e-8 | 1 formula fixture; unequal n and joint-zero-variance edges | p-value and CI lack independent oracle; second fixture/review open |
| One-Way ANOVA / 1.0.0 | PARTIALLY VALIDATED | [NIST five-machine example](https://www.itl.nist.gov/div898/handbook/ppc/section2/ppc231.htm), 25 published observations | fixed-effects one-factor ANOVA | SS, df, MS; abs 1e-6 / rel .015 to accommodate published rounding | 1 reference fixture; invalid group-size edge | **ANOVA-NIST-F-001 OPEN:** displayed F=9.55 does not reproduce from displayed data/components; F and p excluded; equivalence and review open |
| Linear Regression (simple OLS engine) / 1.0.0 | PARTIALLY VALIDATED | [NIST StRD Norris](https://www.itl.nist.gov/div898/strd/lls/data/LINKS/DATA/Norris.dat), 36 observations and certified results | OLS with intercept; predictor `x` | b0, b1, both coefficient SEs, residual SE, R2, regression/residual SS and MS, F; abs 1e-8 / rel 1e-10 | 1 certified fixture; unequal length, zero predictor/response variance guarded | full declared output families covered; second fixture and independent review remain open |
| Individuals / Moving Range / 1.0.0 | PARTIALLY VALIDATED | [NIST flow-rate example](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc322.htm), 10 observations | MR(2); d2=1.128; 3-sigma I limits | moving ranges, centers, I UCL/LCL, no beyond-limit points; abs .0001 / rel .00001 | 1 reference fixture; missing/non-numeric edge | MR UCL/LCL not printed by cited example; second fixture/review open |
| Paired t-Test | UNVALIDATED | none registered | production route exists; exact implementation not governed here | none | none | executable manifest and reference fixtures required |
| Pooled 2-Sample t-Test | UNVALIDATED | none registered | equal-variance t | none | none | executable manifest and reference fixtures required |
| 1 Proportion | UNVALIDATED | none registered | binomial/proportion inference | none | none | exact vs approximation and interval convention must be fixed before validation |
| 2 Proportions | UNVALIDATED | none registered | difference in proportions | none | none | pooled/unpooled SE and interval convention must be fixed |
| Variance & Standard Deviation | UNVALIDATED | none registered | one/two variance family | none | none | method family must be split into explicit governed variants |
| Chi-Square / Contingency Table | UNVALIDATED | none registered | categorical inference family | none | none | independence vs goodness-of-fit and correction rules must be explicit |
| Fisher Exact Test | UNVALIDATED | none registered | 2x2 exact inference | none | none | two-sided probability convention must be explicit |
| Mann-Whitney U | UNVALIDATED | none registered | rank-sum | none | none | tie correction, exact/asymptotic choice, and continuity correction required |
| Wilcoxon Signed-Rank | UNVALIDATED | none registered | paired rank inference | none | none | zero/tie convention and exact/asymptotic choice required |
| Sign Test | UNVALIDATED | none registered | paired/median sign inference | none | none | zero-difference handling and exact interval required |
| Kruskal-Wallis | UNVALIDATED | none registered | rank-based k-group inference | none | none | tie correction and post-hoc scope required |
| Friedman Test | UNVALIDATED | none registered | repeated rank inference | none | none | ties, missing blocks, and post-hoc scope required |
| Correlation | UNVALIDATED | none registered | Pearson/Spearman/Kendall family | none | none | variants must be separated; p-value/tie conventions required |
| Two-Way ANOVA | UNVALIDATED | none registered | factorial ANOVA | none | none | SS type, balance, contrasts, interaction outputs required |
| Repeated-Measures ANOVA | UNVALIDATED | none registered | within-subject ANOVA | none | none | sphericity corrections and missing-subject policy required |
| Multiple Regression | UNVALIDATED | none registered | OLS with multiple predictors | none | none | encoding, rank deficiency, diagnostics, intervals required |
| Binary Logistic Regression | UNVALIDATED | none registered | binary logit | none | none | optimizer, separation, covariance, CI and ROC conventions required |
| Distribution Analysis | UNVALIDATED | none registered | multi-distribution family | none | none | fit method, parameterization, probability plot and transform variants must be split |
| Full Factorial DOE | UNVALIDATED | none registered | factorial design/analysis | none | none | coding, aliasing, model hierarchy and ANOVA outputs required |
| Fractional Factorial DOE | UNVALIDATED | none registered | fractional design/analysis | none | none | generators, resolution, alias chains and estimability required |
| Response Surface Methodology | UNVALIDATED | none registered | quadratic response surface | none | none | coding, stationary point, canonical analysis and intervals required |
| Central Composite Design | UNVALIDATED | none registered | CCD generator | none | none | alpha convention, center runs, randomization and rotatability required |
| Box-Behnken Design | UNVALIDATED | none registered | BBD generator | none | none | run construction, blocking and randomization required |
| DOE Response Optimization | UNVALIDATED | none registered | desirability optimization | none | none | desirability definitions, weighting, optimizer and confirmation policy required |
| Parametric Life Data / 1.0.0 | UNVALIDATED | none independently registered | right-censored Weibull, Lognormal, Exponential MLE | internal tests only | exact failures/right censoring; all-censored and invalid lifetime guards | independent fixtures, covariance intervals, and reviewer required |
| Kaplan-Meier Survival / 1.0.0 | UNVALIDATED | none independently registered | product-limit estimate with log-log Greenwood interval | internal tests only | ties, right censoring, unreached median | authoritative fixture and independent review required |
| Log-Rank Group Comparison / 1.0.0 | UNVALIDATED | none independently registered | global k-group Mantel log-rank with covariance matrix | internal tests only | ties, two and three groups | authoritative fixture, tie-method equivalence, review required |
| Arrhenius Accelerated Life / 1.0.0 | UNVALIDATED | none independently registered | right-censored Weibull AFT likelihood using absolute temperature | internal tests only | Celsius/Kelvin conversion, censor retention, convergence, absolute-zero and extrapolation guards | independent likelihood/interval fixtures required |
| Inverse Power Accelerated Life / 1.0.0 | UNVALIDATED | none independently registered | right-censored Weibull AFT likelihood on log stress | internal tests only | positive stress, multiple levels, censor retention, convergence, extrapolation | independent likelihood/interval fixtures required |
| Warranty Cohort Analysis / 1.0.0 | UNVALIDATED | none independently registered | shipment exposure, cohort follow-up maturity, age-adjusted rates, costs and modes | internal tests only | missing exposure and immature-cohort warnings | independent maturity/claim-lag fixture required |
| Repairable Systems / 1.0.0 | UNVALIDATED | none independently registered | event/exposure summary and preliminary Crow-AMSAA trend | internal tests only | duplicate events, terminology warning | multi-system observation-end model and reference fixtures required |
| Reliability Demonstration / 1.0.0 | UNVALIDATED | none independently registered | zero-failure binomial demonstration | internal tests only | impossible probability and nonzero-failure guards | authoritative fixture and allowed-failure extension required |
| Attribute Acceptance Sampling / 1.0.0 | UNVALIDATED | none independently registered | binomial or finite-lot hypergeometric single-plan design and OC risks | internal tests only | n>N, invalid c, impossible risk combinations and AQL/LTPD inversion | independent finite-lot fixture required; no standards-table equivalence claimed |
| Variables Acceptance Sampling / 1.0.0 | UNVALIDATED | none independently registered | statistically designed one-sided normal plan, known sigma | internal tests only | USL/LSL, risk design, decision, invalid direction and unknown-sigma refusal | independent reference fixture required; standards-specific and unknown-sigma variants deferred |
| Normal Tolerance Interval / 1.0.0 | PARTIALLY VALIDATED | [NIST one-sided normal tolerance factor](https://www.itl.nist.gov/div898/handbook/prc/section2/prc263.htm), n=43, P=.90, gamma=.99 | numerical exact one-sided noncentral-t-equivalent factor; conservative two-sided Bonferroni construction | n, P, gamma, direction, k=1.8740; abs .001 / rel .0005 | one NIST fixture; sample size, zero variance and impossible inputs | bounds/two-sided factors need independent fixtures; second fixture/review open |
| Nonparametric Tolerance Interval / 1.0.0 | UNVALIDATED | none independently registered | first-order Wilks distribution-free one/two-sided limits | internal tests only | required sample calculation and unsupported-request refusal | authoritative executable fixture and independent review required |
| Laney p′ Chart / 1.0.0 | UNVALIDATED | none independently registered | standardized moving-range dispersion adjustment | internal tests only | invalid counts and zero-dispersion guards | authoritative fixture and independent review required |
| Laney u′ Chart / 1.0.0 | UNVALIDATED | none independently registered | standardized moving-range dispersion adjustment | internal tests only | invalid opportunity and zero-dispersion guards | authoritative fixture and independent review required |
| G Rare-Event Chart / 1.0.0 | UNVALIDATED | none independently registered | geometric opportunities-between-events limits | internal tests only | positive interval guard | limit convention equivalence and independent fixture required |
| T Rare-Event Chart / 1.0.0 | UNVALIDATED | none independently registered | elapsed-time-between-events limits | internal tests only | positive interval guard | distribution/limit convention and independent fixture required |
| Plackett-Burman Screening / 1.0.0 | UNVALIDATED | none independently registered | 4/8/12-run orthogonal screening; main effects | internal tests only | size/factor guards, seeded randomization, orthogonality | published design/effect fixtures and review required |
| Taguchi Robust Design / 1.0.0 | UNVALIDATED | none independently registered | L4/L8/L9 arrays; standard smaller/larger/nominal S/N | internal tests only | factor-level compatibility and S/N edge guards | authoritative array/S/N fixtures required |
| Mixture DOE / 1.0.0 | UNVALIDATED | none independently registered | simplex centroid/lattice; linear/quadratic Scheffé | internal tests only | sum constraint and singularity guards | independent coefficient/ANOVA fixtures required |
| Engineering Monte Carlo / 1.0.0 | UNVALIDATED | none independently registered | seeded distribution propagation and input-response correlation | internal tests only | unsafe expression, distribution, count and correlation guards | independent distribution/quantile fixtures required |
| Tolerance Stack-Up / 1.0.0 | UNVALIDATED | none independently registered | worst case, RSS and Monte Carlo dimensional stack | internal tests only | direction, units and tolerance validation | authoritative engineering fixture required |
| TOST Equivalence / 1.0.0 | UNVALIDATED | none independently registered | Welch/paired TOST workflow | internal tests only | margin, sample and pairing guards | exact small-sample t critical values and independent fixtures required |
| Engineering Sample Size / 1.0.0 | UNVALIDATED | none independently registered | direct-unit normal planning approximations | internal tests only | invalid effect, SD, probability and power guards | noncentral exact engines and independent fixtures required |

## Discrepancy register

| ID | Method | Severity | Observed | Likely cause | Resolution / disposition | Owner | Status |
|---|---|---|---|---|---|---|---|
| ANOVA-NIST-F-001 | One-Way ANOVA | Material | NIST displays F=9.55, while its displayed observations and rounded SS/MS do not reproduce that result. | Apparent source-page transcription or rounding inconsistency; the source does not resolve it. | Do not tune the implementation to the inconsistent number. Exclude F and p from certified outputs; obtain a second authoritative oracle and independent statistical review. | statistical-validation | OPEN |

No implementation was changed to force agreement with a questionable reference value.

## Validation gaps and next actions

1. Obtain an independent statistical reviewer for every candidate promotion; record reviewer identity, date, reviewed fixture versions, and conclusion in the manifest.
2. Add at least one further authoritative fixture per partially validated method. Prefer NIST StRD certified datasets or published R/SciPy/statsmodels examples whose method and defaults are demonstrably equivalent.
3. Complete material output coverage: t-test p-values/CIs, ANOVA F/p, regression coefficient inference, and MR-chart limits.
4. Create executable manifests for P0 production families before expanding method breadth: paired/pooled t, proportions, variance, categorical/exact, nonparametric, correlation, ANOVA variants, multiple/logistic regression, distribution fitting, and DOE analysis/optimization.
5. For every new fixture, capture method name/version, source/version, exact dataset, parameters/options, expected outputs, absolute/relative tolerance rationale, edge-case coverage, equivalence analysis, discrepancy disposition, and second-review record.

## Reproducible commands

```text
npm run validate:statistics
npm test -- --watchAll=false
CI=true npm run build
git diff --check
```
