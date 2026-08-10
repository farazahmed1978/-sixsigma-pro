# Aureqin OE Wave 2B: practitioner completion audit

Status terms: **Yes** means accessible in the normal tool workflow; **Partial** means the existing specialist screen remains less guided than the shared SPC/MSA/capability workflow. Validation statuses require independent executable evidence, not internal tests.

| Capability | Engine | UI | Guided input | Results | Interpretation | Reportable | Validation |
|---|---:|---:|---:|---:|---:|---:|---|
| I / MR / I-MR | Yes | Yes | Yes | Yes | Yes | Structured | PARTIALLY VALIDATED |
| Xbar-R | Yes | Yes | Yes | Yes | Yes | Structured | UNVALIDATED |
| Xbar-S | Yes | Yes | Yes | Yes | Yes | Structured | UNVALIDATED |
| p / np / c / u | Yes | Yes | Partial | Yes | Yes | Yes | UNVALIDATED |
| EWMA / CUSUM | Existing UI | Yes | Yes | Yes | Yes | Yes | UNVALIDATED |
| Special-cause rules | Yes | Yes | Selectable for I-MR | Structured signals | Yes | Structured | Inherits chart |
| Stages | I-MR engine | Yes | Named non-overlapping ranges | Stage limits | Yes | Structured | Inherits I-MR |
| Historical parameters | I-MR, Xbar engines | I-MR | Explicit center/sigma | Labeled limit basis | Yes | Structured | Inherits chart |
| Crossed Gage R&R | Yes | Yes | Yes | Variance, ANOVA, % metrics, ndc | Yes | Structured | UNVALIDATED |
| Nested Gage R&R | Yes | Yes | Yes | Variance, ANOVA, % metrics, ndc | Yes | Structured | UNVALIDATED |
| Attribute agreement | Yes | Yes | Yes | Within/between/standard/Kappa | Yes | Structured | UNVALIDATED |
| Bias | Yes | Yes | Yes | Bias, CI, t, p | Yes | Structured | PARTIALLY VALIDATED |
| Linearity | Yes | Yes | Yes | Bias plot and regression | Yes | Structured | PARTIALLY VALIDATED |
| MSA stability | Shared I-MR | Yes | Yes | Chart and signals | Yes | Structured | PARTIALLY VALIDATED |
| Cp/Cpk, Pp/Ppk | Yes | Yes | Yes | Primary hierarchy | Yes | Structured | PARTIALLY VALIDATED |
| Cpm | Yes | Yes | Target optional | Yes | Yes | Structured | PARTIALLY VALIDATED |
| One-sided capability | Yes | Yes | Only relevant limit required | Yes | Yes | Structured | PARTIALLY VALIDATED |
| Subgroup capability | Yes | Yes | Subgroup mapping | Within/overall sigma | Yes | Structured | PARTIALLY VALIDATED |
| Stability evidence | Yes | Yes | Strict ID matching | Status/warning | Yes | Structured | Evidence-dependent |
| MSA evidence | Yes | Yes | Strict ID matching | Status/warning | Yes | Structured | Evidence-dependent |
| Lognormal capability | Yes | Yes | Guarded selection | Cnp/Cnpk and tails | Yes, with fit warning | Structured | UNVALIDATED |
| Observed vs expected nonconformance | Yes | Yes | Automatic | Percent and PPM | Yes | Structured | Inherits model |

## Workflow contracts

- Analysis records retain project, dataset, immutable dataset-version, variable mappings, configuration, engine method/version, validation status, full-precision results, and deterministic interpretation.
- SPC and MSA evidence links are accepted by capability only when dataset ID, dataset-version ID, and measurement variable match exactly.
- Report binder payloads are semantic objects containing configuration, metrics, tables, plots, signals, warnings, interpretation, and evidence IDs; screenshots are optional presentation artifacts rather than the data contract.
- Practitioner findings preserve analysis, project, dataset/version, variable, deterministic statement, structured evidence, and timestamp. Full PM action management remains out of scope.
- Display formatting occurs only at render time. Engine values and persisted structured outputs retain full precision.

## Independent validation still required

No validation status was promoted in Wave 2B. Internal deterministic tests cover Xbar-R, Xbar-S, attribute charts, Gage R&R, bias, linearity, stage validation, identity matching, and display formatting, but do not constitute an external oracle. To promote methods, add reviewed executable fixtures from authoritative published raw datasets with expected limits/variance components/tails and tolerances—especially Xbar-R, Xbar-S, p/np/c/u, crossed Gage R&R, bias, and linearity.

## Deliberate remaining limits

- Xbar stage-specific estimation remains engine-limited; the practitioner stage editor currently applies to I-MR.
- Historical parameter entry is exposed for I-MR; subgroup historical entry remains an engine capability awaiting a dedicated subgroup-limit editor.
- Attribute-chart chart-selection guidance remains on its existing specialist screen rather than being merged with the continuous chart tool.
- Full server-persisted findings/actions and a report renderer migration remain future platform work; current records use the existing additive local analysis/report contracts.
