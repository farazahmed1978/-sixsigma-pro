# AUREQIN OE Wave 4 Closure Matrix

Status describes functional practitioner coverage separately from independent validation status.

| Capability | Before 4C | After 4C | Validation | Remaining limitation |
|---|---|---|---|---|
| Guided reliability workspace | PARTIAL | COMPLETE | N/A shell | Authenticated UI QA remains |
| Censored parametric life data | COMPLETE | COMPLETE | UNVALIDATED | Exact/right censoring; left/interval are specialist-tail |
| Kaplan-Meier | PARTIAL | COMPLETE | UNVALIDATED | Group curves now include confidence, medians, at-risk tables and group censor markers |
| Global log-rank | PARTIAL | COMPLETE | UNVALIDATED | Global k-group test implemented; adjusted pairwise follow-up deferred |
| Arrhenius ALT | PARTIAL | COMPLETE | UNVALIDATED | Right-censored Weibull AFT, absolute temperature, fit diagnostics and future-unit interval; fitted-mean CI withheld |
| Inverse-power ALT | PARTIAL | COMPLETE | UNVALIDATED | Right-censored Weibull AFT; independent reference evidence remains |
| Warranty maturity | PARTIAL | PARTIAL | UNVALIDATED | Follow-up-aware comparisons and immature warnings complete; full dedicated Pareto/cost/cohort chart suite remains UX work |
| Repairable systems | PARTIAL | PARTIAL | UNVALIDATED | Approximate beta interval and independent PLP fixture remain |
| Reliability demonstration | COMPLETE | COMPLETE | UNVALIDATED | Binomial unit plans; exposure-time plans deferred |
| Finite-lot attribute sampling | PARTIAL | COMPLETE | UNVALIDATED | Hypergeometric selection/design implemented; no standards-table equivalence claim |
| Variables acceptance sampling | MISSING | COMPLETE | UNVALIDATED | Rigorous one-sided USL/LSL known-sigma plans; unknown-sigma and standards tables explicitly unsupported |
| Normal tolerance intervals | PARTIAL | COMPLETE | PARTIALLY VALIDATED | Numerical exact one-sided factor; two-sided is explicitly conservative Bonferroni, not mislabeled exact |
| Nonparametric tolerance intervals | MISSING | COMPLETE | UNVALIDATED | First-order Wilks bounds/interval with feasibility refusal and required n |
| Advanced MSA presentation | PARTIAL | COMPLETE | Existing status | Operator means, part-by-appraiser interaction and variation components now charted |
| Laney p′/u′ and G/T charts | COMPLETE | COMPLETE | UNVALIDATED | Independent fixtures and authenticated QA remain |
| Condition-gated findings | PARTIAL | COMPLETE | N/A | No finding is created merely because an analysis exists |
| Project/report/saved result | PARTIAL | PARTIAL | N/A | Automated regressions pass; authenticated four-state/manual reopen QA remains |
| Report print/export | PARTIAL | PARTIAL | N/A | Automated assembly/print tests pass; real authenticated browser print remains manual QA |

## Wave 4 stopping-rule classification

- **A — Enterprise practitioner blocker:** none identified in the implemented core Wave 4 workflows.
- **B — Specialist-tail backlog:** three-parameter Weibull, uncommon lifetime distributions, left/interval censoring, generalized Eyring, unknown-sigma and standards-table variables plans, standards-specific attribute tables, adjusted pairwise survival follow-up, and niche repairable-system models.
- **C — Validation / evidence work:** independent fixtures and second review remain open for nearly all Wave 4 methods. The normal one-sided tolerance factor has one passing NIST fixture and remains PARTIALLY VALIDATED.
- **D — UX / manual-QA issue:** authenticated review of charts, the four project/report states, saved-result reopening, real multi-page browser print/export, and warranty’s full dedicated visualization suite.

Wave 5 capabilities are outside this closure and were not implemented.
