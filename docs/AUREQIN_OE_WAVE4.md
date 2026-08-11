# AUREQIN OE Wave 4 Completion Matrix

Status is based on practitioner usability, not engine existence. `COMPLETE` is intentionally unused where independent validation, required UI depth, or enterprise workflow coverage remains open.

| Capability | Status | UI exposure | Report support | Project support | Validation | Known limitation |
|---|---|---|---|---|---|---|
| Guided Reliability workspace | PARTIAL | Reliability Analysis Workspace | Structured semantic payload | Independent Add to Project | N/A shell | Dataset column mapping remains CSV-oriented |
| Life-data identity and censoring | PARTIAL | Failure vs censored CSV status | Censoring definition retained | Yes | UNVALIDATED | Exact failures/right censoring only; left/interval architected but deferred |
| Weibull 2-parameter censored MLE | COMPLETE | Life Data study with probability diagnostic, reliability and hazard plots | Parameters and observed-information intervals, B-life intervals, requested-time metrics, comparison, plot data | Yes | UNVALIDATED | Intervals are asymptotic; 3-parameter deferred |
| Lognormal censored MLE | PARTIAL | Life Data study | Semantic estimates/diagnostics | Yes | UNVALIDATED | No parameter intervals |
| Exponential censored MLE | PARTIAL | Life Data study | Semantic estimates/diagnostics | Yes | UNVALIDATED | No parameter intervals |
| Distribution comparison | PARTIAL | Life Data results | log likelihood, AIC, BIC | Yes | UNVALIDATED | No naive GOF p-values; graphical diagnostics incomplete |
| Kaplan-Meier | PARTIAL | Grouped step curves, confidence lines, censor counts and at-risk tables | Risk/event/survival tables and intervals | Yes | UNVALIDATED | Distinct censor glyphs on the curve remain incomplete |
| Grouped KM / log-rank | PARTIAL | Separate rendered group results and two-group log-rank | Group curves/tables/comparison retained | Yes | UNVALIDATED | Log-rank currently supports exactly two groups |
| Arrhenius ALT | PARTIAL | Stress-life CSV workflow with fitted relationship | coefficients, prediction, AF, range, diagnostics, warnings | Yes | UNVALIDATED | Censored ALT is explicitly refused; prediction intervals unavailable |
| Inverse-power ALT | PARTIAL | Same guarded ALT workspace | coefficients, prediction, AF and diagnostics | Yes | UNVALIDATED | Exact failures only; independent validation required |
| Warranty analysis | PARTIAL | Cohort table, age/cumulative trend and failure-mode evidence | Exposure-aware rates, costs, cohorts, age and modes | Yes | UNVALIDATED | Pareto rendering and mature-cohort/claim-lag adjustment remain deferred |
| Repairable systems | PARTIAL | Observation-end aware multi-system workflow | cumulative failures/exposure, PLP beta/scale, CI and diagnostics | Yes | UNVALIDATED | Approximate beta interval; independent PLP fixture required |
| Reliability demonstration | COMPLETE | Allowed-failure input including zero failures | required units, achieved confidence and assumptions | Yes | UNVALIDATED | Binomial unit plans only; time/exposure plans deferred |
| Attribute acceptance sampling | COMPLETE | Evaluate or design statistical single plans | designed n/c, OC/AOQ/AOQL/ATI and entered risks | Yes | UNVALIDATED | Binomial design; finite-lot hypergeometric and standards tables deferred |
| Variables acceptance sampling | MISSING | None | No | No | UNVALIDATED | Deferred rather than approximated |
| Normal tolerance intervals | PARTIAL | Tolerance Interval study | Limits, content, confidence, terminology | Yes | UNVALIDATED | Approximate k-factor only; exact/nonparametric methods deferred |
| Advanced capability intervals/nonnormal | MISSING | Existing capability unchanged | Existing only | Existing only | Existing status | Audit completed; unsafe additions deferred |
| Advanced MSA depth | PARTIAL | Existing crossed/nested UI now exposes ANOVA, variance components, contribution, study variation, tolerance, ndc and hierarchy | Structured tables retained | Existing support | Existing status | Dedicated operator comparison visualization remains limited |
| SPC enterprise additions | COMPLETE | Laney p′/u′ and G/T integrated into Attribute Charts | Existing semantic/chart support | Existing support | UNVALIDATED | Independent fixtures and authenticated UI QA required |
| Reliability findings | COMPLETE | Deterministic Create Finding action in Wave 4 workspace | Numerical evidence retained | Additive contract compatible | N/A | Threshold customization remains basic |
| Saved result contract | PARTIAL | Canonical analysis created through shared actions | Read-only saved payload compatible | Binder Open Result compatible | N/A | Safe Open in Tool/re-run mapping not added |
| Print regression | PARTIAL | Uses semantic tables and existing report renderer | Entire/selected architecture reused | N/A | N/A | Manual authenticated multi-page browser-print QA required |
| Navigation/search | COMPLETE | One grouped workspace in Analyze plus acceptance entry in Control | N/A | N/A | N/A | Deep link opens workspace; study query preselection is not yet implemented |

## Explicitly deferred

- Three-parameter Weibull, Gamma censored MLE, left/interval censoring.
- Full ALT censored stress-life fitting, inverse-power and generalized Eyring models.
- Variables sampling, standards-table claims, exact normal and nonparametric tolerance intervals.
- Laney p′/u′ and rare-event charts.
- ARIMA, forecasting, mixture DOE, Plackett–Burman, broad screening expansion, and general power/sample-size work remain Wave 5.
