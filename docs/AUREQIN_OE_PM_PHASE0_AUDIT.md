# Aureqin Operational Excellence + Project Management Phase 0 Forensic Benchmark Audit

**Audit type:** read-only forensic benchmark  
**Benchmark snapshot:** August 2026  
**Repository state:** current uncommitted working tree inspected; no runtime code, schema, migration, dependency, or Git state changed by this audit.

## Executive finding

Aureqin is presently a credible project-connected document and lightweight analysis platform, not yet an incumbent-displacement product for either target discipline. Operational Excellence has useful worksheet, DMAIC workspace, charting, hypothesis-test, ANOVA, regression, SPC, and reporting foundations. Its principal blockers are method breadth, practitioner-depth diagnostics, cross-tool workflow, export fidelity, and—most importantly—independent numerical validation. Project Management has a strong document-shell foundation and project asset model, but lacks the scheduling, task-execution, resource, cost, EVM, portfolio, and automation engines that distinguish professional PM software from a document library.

The primary litmus test is applied strictly: a route or form is not credited as benchmark depth when the normal end-to-end practitioner job still requires an incumbent.

## Evidence and method

Evidence was gathered by static inspection of routes, contexts, tools, workspace configuration, persistence, export paths, and tests. Representative implementation anchors include `src/App.js`, `src/pages/Worksheet.js`, `src/context/WorksheetContext.js`, `src/context/ProjectsContext.js`, `src/context/AnalysisContext.js`, `src/context/ReportContext.js`, `src/components/DocumentWorkspace.js`, `src/pages/ProjectDetail.js`, `src/pages/ReportBuilder.js`, `src/pages/HypothesisTesting.js`, `src/pages/DOEPage.js`, `src/utils/statTests.js`, `src/tools/*`, and `src/config/*Templates.js`.

Status scores used for coverage are IMPLEMENTED = 1.00, NEEDS VALIDATION = 0.60, PARTIAL = 0.35, MISSING = 0.00. Priority weights are P0 = 5, P1 = 2, P2 = 1. Deliberately excluded items are omitted from denominators. Displacement readiness uses P0 only and discounts NEEDS VALIDATION to 0.40 and PARTIAL to 0.20. Validation readiness requires executable reference-result tests rather than comments or UI behavior.

Official incumbent references establish the comparison bar. Minitab documents broad analytics across data preparation, statistics, quality, modeling, DOE, reliability, time series, and multivariate work; its MSA workflow includes continuous and attribute systems, and its capability workflows distinguish within and overall variation, nonnormal methods, transformations, indices, performance, and confidence bounds. Microsoft Project documents dependency-driven scheduling, critical paths, resource leveling, and up to eleven baselines containing dates, duration, work, and cost. Asana documents portfolios, workload, forms, approvals, dashboards, and rules. See [Minitab analytics](https://support.minitab.com/en-us/minitab-solution-center/analytics/), [Minitab MSA](https://support.minitab.com/en-us/minitab/help-and-how-to/quality-and-process-improvement/measurement-system-analysis/supporting-topics/basics/about-measurement-systems-analysis/), [Minitab capability](https://support.minitab.com/en-us/minitab/help-and-how-to/quality-and-process-improvement/capability-analysis/how-to/capability-analysis/between-within-capability-analysis/interpret-the-results/key-results/), [Microsoft scheduling](https://support.microsoft.com/en-us/project/how-project-schedules-tasks-behind-the-scenes), [Microsoft baselines](https://support.microsoft.com/en-us/office/create-or-update-a-baseline-or-an-interim-plan-in-project-desktop-7e775482-ac84-4f4a-bbd0-592f9ac91953), [Microsoft resource leveling](https://support.microsoft.com/en-us/office/resource-leveling-dialog-box-0d280b16-2753-4630-8cca-8c50915df9f5), and [Asana business features](https://help.asana.com/s/article/learn-about-asana-business-features).

## Master benchmark matrix

Abbreviations: **TC** = test coverage; **RV** = reference validation; **UE** = user exit trigger; **SP** = shared primitive; **FSR** = future-suite reuse; **Phase** = recommended build wave; **Risk** = S/M/L/XL complexity.

| Suite | Domain | Requirement | Benchmark Product | Current Aureqin Implementation | File / Route | Status | Depth Notes | Current Test Coverage | Reference Validation | User Exit Trigger | Priority | Shared Primitive | Future-Suite Reuse | Recommended Build Phase | Risk / Complexity | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| OE | Data | CSV import; copy/paste; blank grid | Minitab/Excel | Papa Parse, paste dialog, editable grid | `Worksheet.js`; `/worksheet` | IMPLEMENTED | Credible baseline ingestion | None | Browser behavior only | NO | P0 | Dataset | High | OE-0 | S | CSV only |
| OE | Data | XLS/XLSX import | Excel/Minitab | No workbook parser | Worksheet | MISSING | Common exit for business data | None | None | YES | P0 | Dataset | High | OE-0 | M | Preserve sheets/types later |
| OE | Data | Multiple named project datasets | Minitab | Create/switch/rename/duplicate/archive/delete | `WorksheetContext.js` | IMPLEMENTED | Local-storage registry with project ID | None | None | NO | P0 | Dataset | High | OE-0 | S | No server collaboration |
| OE | Data | Data types and missing-data profile | Minitab | Auto/numeric/categorical/date labels; missing summary | Worksheet | PARTIAL | Type enforcement and missing treatment absent | None | None | MAYBE | P0 | Dataset | High | OE-0 | M | Detection heuristic |
| OE | Data | Filters and sorting | Excel/Minitab | Contains-filter and in-place single-column sort | Worksheet | PARTIAL | No compound predicates/saved filters/null semantics | None | None | MAYBE | P0 | Dataset | High | OE-0 | M | Sorting mutates dataset |
| OE | Data | Calculated columns; recode; transformations | Minitab | No expression/transformation system | — | MISSING | Routine preparation exits to Excel/Minitab | None | None | YES | P0 | Dataset | High | OE-0 | L | Include provenance |
| OE | Data | Standardize; grouped calculations | Minitab | Not found | — | MISSING | Needed for modeling/preparation | None | None | MAYBE | P1 | Dataset | High | OE-0 | M | Deterministic operations |
| OE | Data | Sampling and random data | Minitab | No worksheet commands | — | MISSING | DOE/simulation workflow gap | None | None | MAYBE | P1 | Dataset | High | OE-3 | M | Seeded reproducibility |
| OE | Data | Stack/unstack; joins; reshape/pivot | Excel/Minitab | Not found | — | MISSING | Forces routine data prep outside Aureqin | None | None | YES | P0 | Dataset | High | OE-0 | L | Key/type conflict handling |
| OE | Data | Date/time operations | Excel/Minitab | Detection only | Worksheet | MISSING | No parse/extract/lag/window operations | None | None | MAYBE | P1 | Dataset | High | OE-0 | M | Locale/timezone rules |
| OE | Data | Versions, lineage, undo/recovery | Minitab/Excel | Version counter and 50 action labels | `WorksheetContext.js` | PARTIAL | No snapshots, diff, rollback, source lineage, undo | None | None | YES | P0 | Dataset/Activity | High | OE-0 | L | History is not recovery |
| OE | Data | Reusable variable selections/cleaning workflow | Minitab | Tool-specific selectors; no reusable recipe | Tools/Worksheet | MISSING | Repeated mapping and prep | None | None | YES | P0 | Analysis/Dataset | High | OE-0 | L | Saved semantic selections |
| OE | Graphing | Descriptive statistics and CIs | Minitab | Descriptive tool and basic worksheet summaries | `DescriptiveStats.js` | NEEDS VALIDATION | Useful output; insufficient automated proof | None | Code comments only | YES | P0 | Analysis | High | OE-1 | M | Reference fixtures required |
| OE | Graphing | Histogram, boxplot, scatterplot, Pareto, run chart | Minitab | Dedicated Recharts tools | `src/tools/*` | NEEDS VALIDATION | Functional baseline, limited customization | None | None | MAYBE | P0 | Analysis/Evidence | High | OE-1 | M | Verify bins/quartiles/Pareto rules |
| OE | Graphing | Dot, matrix, bar, probability, empirical plots | Minitab | No benchmark-complete suite | — | MISSING | Probability plot particularly blocks assumptions | None | None | YES | P0 | Analysis | High | OE-1 | L | Bar fragments do not equal graph tool |
| OE | Graphing | Grouping/faceting/reference lines/annotations | Minitab | Limited hard-coded overlays | Tools | PARTIAL | No reusable graph grammar/editor | None | None | YES | P0 | Evidence | High | OE-5 | L | Needed for report-ready output |
| OE | Graphing | Diagnostic/time-series/contour/surface plots | Minitab | Some regression residual output; no general suite | Tools | PARTIAL | DOE/model diagnostics incomplete | None | None | MAYBE | P1 | Analysis | High | OE-3 | L | Contour/surface absent |
| OE | Assumptions | Normality test (Anderson-Darling equivalent) | Minitab | AD implementation used in ANOVA companions | `statTests.js`; AnovaTool | NEEDS VALIDATION | Approximation has no executable reference tests | None | Commented provenance | YES | P0 | AnalysisRule | High | OE-1 | M | Add known datasets and tails |
| OE | Assumptions | Levene/Brown-Forsythe and Bartlett | Minitab | Both implemented and surfaced in ANOVA | same | NEEDS VALIDATION | P0 workflow exists but numerical/edge proof absent | None | None | YES | P0 | AnalysisRule | High | OE-1 | M | Empty/small/constant groups |
| OE | Assumptions | Distribution fitting and probability plots | Minitab | Not found | — | MISSING | Blocks nonnormal capability/model choice | None | None | YES | P0 | Analysis | High | OE-1 | L | Candidate distributions + GOF |
| OE | Assumptions | Box-Cox/transformations | Minitab | Not found | — | MISSING | No integrated corrective path | None | None | YES | P0 | Dataset/Analysis | High | OE-1 | M | Persist lambda and transformed specs |
| OE | Assumptions | Outlier and influence workflow | Minitab | IQR counts; regression fragments | Worksheet/Regression | PARTIAL | No review/exclusion provenance or sensitivity run | None | None | YES | P0 | Evidence/Analysis | High | OE-1 | L | Must prevent silent deletion |
| OE | Hypothesis | 1/2-sample and paired t; 1/2 proportions | Minitab | UI and calculations present | `HypothesisTesting.js`; `statTests.js` | NEEDS VALIDATION | Breadth credible; no executable oracle suite | None | Comments cite spot values | YES | P0 | Analysis | High | OE-1 | M | Welch/pooled and exact boundaries |
| OE | Hypothesis | Variance, chi-square, contingency, Fisher | Minitab | Chi-square/Fisher present; variance breadth limited | HypothesisTesting/statTests | PARTIAL | No complete variance-test workflow | None | None | YES | P0 | Analysis | High | OE-1 | M | Sparse expected counts |
| OE | Hypothesis | Nonparametric equivalents | Minitab | Mann-Whitney, Wilcoxon, Kruskal-Wallis, Friedman, Dunn | same | NEEDS VALIDATION | Normal approximations and ties need proof | None | Code comments only | YES | P0 | Analysis | High | OE-1 | L | Exact/small-sample behavior |
| OE | Hypothesis | Equivalence/noninferiority | Minitab | Not found | — | MISSING | Relevant in quality validation | None | None | MAYBE | P1 | Analysis | High | OE-3 | M | TOST and proportion variants |
| OE | Hypothesis | Effect sizes, CIs, power/sample size | Minitab | Dedicated tools/calculators | routes under `/tool` | NEEDS VALIDATION | Useful baseline; disconnected choices | None | None | YES | P0 | Analysis | High | OE-1 | M | Test against R/SciPy/G*Power |
| OE | ANOVA | One-way ANOVA | Minitab | Implemented with companion tests | `AnovaTool.js` | NEEDS VALIDATION | No automated numerical/diagnostic proof | None | None | YES | P0 | Analysis | High | OE-3 | M | Validate SS/df/F/p |
| OE | ANOVA | Multi-factor and interactions | Minitab | Two-way implementation | AnovaTool/statTests | NEEDS VALIDATION | Fixed two-factor path, limited GLM flexibility | None | None | YES | P0 | Analysis | High | OE-3 | L | Unbalanced/missing cells risk |
| OE | ANOVA | Repeated measures | Minitab | RM ANOVA and Mauchly path | AnovaTool/statTests | NEEDS VALIDATION | Correction/edge depth uncertain | None | None | YES | P0 | Analysis | High | OE-3 | L | Validate sphericity corrections |
| OE | ANOVA | General linear model | Minitab | No general design-matrix UI/model | — | MISSING | Cannot cover covariates/nesting/general factors | None | None | YES | P1 | Analysis | High | OE-3 | XL | Shared modeling core |
| OE | ANOVA | Tukey HSD | Minitab | No exact Tukey; Bonferroni Welch approximation is labeled | statTests | MISSING | Games-Howell exists, Tukey benchmark absent | None | None | YES | P0 | Analysis | High | OE-3 | M | Do not relabel approximation |
| OE | ANOVA | Bonferroni and Games-Howell | Minitab | Pairwise Bonferroni and studentized-range GH | statTests | NEEDS VALIDATION | Exactness claim lacks regression fixtures | None | None | YES | P0 | Analysis | High | OE-3 | M | Compare R/Python/Minitab |
| OE | ANOVA | Residual diagnostics/effect sizes | Minitab | Companion checks; incomplete residual suite | AnovaTool | PARTIAL | No comprehensive residual plots/influence | None | None | YES | P0 | Analysis | High | OE-3 | L | Persist diagnostic findings |
| OE | Regression | Simple/multiple regression | Minitab | Dedicated tools and matrix solver | Regression tools/statTests | NEEDS VALIDATION | Baseline coefficients/fit; no oracle tests | None | None | YES | P0 | Analysis | High | OE-3 | L | Singular/missing/high leverage cases |
| OE | Regression | Polynomial/interactions/categorical predictors | Minitab | Limited/manual predictor handling | Regression tools | PARTIAL | No formula/design-matrix builder | None | None | YES | P0 | Analysis | High | OE-3 | L | Shared model specification |
| OE | Regression | Logistic regression | Minitab | Iterative logistic implementation | `LogisticRegressionTool.js` | NEEDS VALIDATION | Convergence/separation diagnostics insufficient | None | None | MAYBE | P1 | Analysis | High | OE-3 | L | Validate coefficients/CI/classification |
| OE | Regression | Selection, multicollinearity, influence | Minitab | Some statistics, no complete workflow | Regression tools | PARTIAL | No robust model-selection/diagnostic loop | None | None | YES | P0 | Analysis | High | OE-3 | L | VIF/leverage/Cook's D |
| OE | Regression | Prediction/confidence intervals and optimization | Minitab | Limited or absent end-to-end | Regression/DOE | PARTIAL | No reusable prediction scenario/optimizer | None | None | MAYBE | P1 | Analysis | High | OE-3 | L | Model asset required |
| OE | SPC | I-MR and Xbar-R | Minitab | Implemented with Western Electric rule logic | `ControlChart.js` | NEEDS VALIDATION | Constants/formulas/subgroup edge cases untested | None | None | YES | P0 | Analysis/Evidence | High | OE-2 | L | Reference chart fixtures |
| OE | SPC | Xbar-S | Minitab | Not found | — | MISSING | Routine larger-subgroup chart | None | None | YES | P0 | Analysis | High | OE-2 | M | Share subgroup engine |
| OE | SPC | p, np, c, u | Minitab | Attribute chart modes implemented | `AttributeChart.js` | NEEDS VALIDATION | Unequal opportunities and invalid counts need proof | None | None | YES | P0 | Analysis | High | OE-2 | L | Exact benchmark datasets |
| OE | SPC | CUSUM and EWMA | Minitab | Implemented with parameters and visualization | ControlChart | NEEDS VALIDATION | Design/ARL semantics and limits unproven | None | None | MAYBE | P1 | Analysis | High | OE-2 | L | Validate steady-state/startup |
| OE | SPC | Special-cause tests, stages, historical parameters | Minitab | Rule flags; no full staged/historical workflow | ControlChart | PARTIAL | No phase recalculation/exclusion audit | None | None | YES | P0 | Analysis/Evidence | High | OE-2 | XL | Core chart engine concern |
| OE | SPC | Annotations, interpretation, report integration | Minitab | Basic narratives/Add to Report | ControlChart/ReportContext | PARTIAL | Limited editability and provenance | None | None | MAYBE | P0 | Evidence/Report | High | OE-5 | M | Store chart config + violations |
| OE | Capability | Cp/Cpk | Minitab | Basic two-sided normal calculation | `CapabilityAnalysis.js` | NEEDS VALIDATION | Uses simple SD; within-subgroup model unclear | None | None | YES | P0 | Analysis/Evidence | High | OE-2 | L | Stability and normality gates |
| OE | Capability | Pp/Ppk/Cpm and one-sided specs | Minitab | Missing | same | MISSING | Common practitioner output | None | None | YES | P0 | Analysis | High | OE-2 | M | Distinguish within/overall |
| OE | Capability | Nonnormal, transformations, fitting | Minitab | Missing | — | MISSING | Major real-world exit trigger | None | None | YES | P0 | Analysis | High | OE-2 | XL | Distribution engine |
| OE | Capability | CIs, subgroup behavior, yield/PPM/DPMO | Minitab | Empirical out-of-spec only; sigma calculator separate | Capability/Sigma | PARTIAL | No integrated expected performance or bounds | None | None | YES | P0 | Analysis | High | OE-2 | L | Avoid empirical/expected confusion |
| OE | MSA | Crossed Gage R&R | Minitab | Range-method-like repeatability/reproducibility | `MSA.js` | NEEDS VALIDATION | Not benchmark ANOVA GRR; interaction absent | None | None | YES | P0 | Analysis/Evidence | High | OE-2 | XL | Current simple formula is high risk |
| OE | MSA | Nested Gage R&R | Minitab | Missing | — | MISSING | Required for destructive testing/nested studies | None | None | YES | P0 | Analysis | High | OE-2 | L | Shared variance components |
| OE | MSA | Attribute agreement | Minitab | Documentation workspace only, no analysis engine | MSA workspace/config | MISSING | A form is not agreement statistics | None | None | YES | P0 | Analysis | High | OE-2 | L | Kappa/accuracy/repeatability |
| OE | MSA | Bias, linearity, stability | Minitab | Workspace fields only | config/MSA | MISSING | No calculations/plots | None | None | YES | P0 | Analysis | High | OE-2 | L | Reference value model |
| OE | MSA | %study variation, %tolerance, ndc, interaction graphics | Minitab | %GRR and ndc estimates; no tolerance/interaction suite | MSA | PARTIAL | Insufficient professional interpretation | None | None | YES | P0 | Analysis | High | OE-2 | L | Validate negative variance handling |
| OE | Sampling | Attribute/variable acceptance sampling and OC curves | Minitab | Not found | — | MISSING | Manufacturing quality exit | None | None | YES | P1 | Analysis | High | OE-4 | L | AQL/RQL and risks |
| OE | Sampling | Design, producer/consumer risk, AQL/LTPD | Minitab | General sample-size calculator only | SampleSizeCalculator | MISSING | Not acceptance sampling | None | None | MAYBE | P1 | Analysis | High | OE-4 | L | Plans and switching rules later |
| OE | DOE | Full factorial design/analysis | Minitab | Page and analysis utility exist | `DOEPage.js`; statTests | NEEDS VALIDATION | Limited design generation/analysis depth | None | None | YES | P0 | Analysis | High | OE-3 | XL | End-to-end reference designs |
| OE | DOE | Fractional/screening, alias/confounding | Minitab | Not benchmark complete | DOEPage | PARTIAL | Some UI concepts do not establish generator/alias depth | None | None | YES | P0 | Analysis | High | OE-3 | XL | Design algebra engine |
| OE | DOE | Blocking, replication, randomization, center points | Minitab | Partial controls | DOEPage | PARTIAL | Verify actual generated design semantics | None | None | YES | P0 | Analysis | High | OE-3 | L | Preserve run order/random seed |
| OE | DOE | Effects, interactions, ANOVA, residuals | Minitab | Basic full-factorial analysis | statTests/DOEPage | NEEDS VALIDATION | No test corpus; diagnostics incomplete | None | None | YES | P0 | Analysis | High | OE-3 | XL | General model core |
| OE | DOE | Optimization, contour/surface, confirmation runs | Minitab | Missing/incomplete | DOEPage | MISSING | Prevents closed-loop DOE workflow | None | None | YES | P0 | Analysis | High | OE-3 | L | Model-to-run workflow |
| OE | DOE | RSM, mixture, design power/sizing | Minitab | Missing | — | MISSING | Specialist breadth | None | None | MAYBE | P2 | Analysis | Medium | OE-6 | XL | Long-term vision, not launch gate |
| OE | Resampling | Permutation/randomization and bootstrap CI | Minitab | Not found | — | MISSING | Modern robust inference gap | None | None | MAYBE | P1 | Analysis | High | OE-3 | L | Seeded engine |
| OE | Reliability | Weibull/failure-time/censoring/life estimates | Minitab | Not found | — | MISSING | Important to reliability practitioners, not all OE users | None | None | MAYBE | P1 | Analysis | High | OE-6 | XL | Product decision on target segment |
| OE | Reliability | Accelerated life/specialist reliability | Minitab | Not found | — | MISSING | Specialist depth | None | None | NO | P2 | Analysis | Medium | OE-6 | XL | Potential future suite |
| OE | Time series | Trend/moving average/smoothing/decomposition/forecast | Minitab | Run chart only; no forecasting workflow | RunChart | MISSING | Common operational analytics gap | None | None | MAYBE | P1 | Analysis | High | OE-6 | XL | Supply Chain reuse |
| OE | Time series | ARIMA, diagnostics, forecast intervals | Minitab | Missing | — | MISSING | Specialist/SC-forward | None | None | NO | P2 | Analysis | High | OE-6 | XL | Keep generic model assets |
| OE | Multivariate | PCA/clustering/factor/discriminant | Minitab | Correlation and multi-vari chart only | tools | MISSING | Methods absent | None | None | MAYBE | P2 | Analysis | High | OE-6 | XL | Do not confuse Multi-Vari with multivariate suite |
| OE | Lean workspace | Charter/SIPOC/VOC/CTQ/stakeholders | Minitab Workspace | Rich charter and reusable document shell/configs | ProjectCharter/DocumentWorkspace | PARTIAL | Strong forms; limited object propagation and analytics | None | None | MAYBE | P0 | Document/Stakeholder | High | OE-4 | L | UI depth varies by document |
| OE | Lean workspace | Process/cross-functional maps and VSM | Minitab Workspace | Process/VSM workspaces and standalone VSM tool | configs/tools | PARTIAL | Not a mature diagramming/connector engine | None | None | YES | P0 | Artifact | High | OE-4 | XL | Interaction/export fidelity |
| OE | Lean workspace | Fishbone, 5 Why, C&E matrix, FMEA | Minitab Workspace | Fishbone/FMEA tools; template coverage | tools/configs | PARTIAL | Separate records, weak variable/action linkage | None | None | YES | P0 | Document/Risk/Action | High | OE-4 | L | One shared FMEA model needed |
| OE | Lean workspace | Waste, takt/cycle, standard work, Kaizen | Minitab Workspace | VSM calculations and document forms | configs/ValueStreamMap | PARTIAL | No integrated improvement execution | None | None | MAYBE | P1 | KPI/Task/Document | High | OE-4 | L | Work management dependency |
| OE | Lean workspace | Control/action plans, tollgates, closure | Minitab Workspace | Document configs and navigation | control/improve templates | PARTIAL | No workflow approvals/gates/action engine | None | None | YES | P0 | Approval/Task/Document | High | OE-4 | XL | Shared PM primitive |
| OE | Lean workspace | Benefits/financial impact/lessons learned | Minitab Workspace | Charter/document fields | ProjectCharter/configs | PARTIAL | No benefits realization ledger | None | None | MAYBE | P0 | Benefit/Cost/Document | High | OE-4 | L | PM reuse |
| OE | Flow | Charter/CTQ/process variables feed downstream | Integrated suite | Basic shared project fields only | ProjectsContext/DocumentWorkspace | MISSING | Documents remain mostly JSON islands | None | None | YES | P0 | Document/KPI | High | OE-4 | XL | Stable typed references required |
| OE | Flow | Dataset selections survive tool handoff | Minitab | Active dataset context and column pickers | Worksheet/ToolPage | PARTIAL | Good foundation; mappings/results not universal | None | None | YES | P0 | Dataset/Analysis | High | OE-0 | L | Multi-dataset tools unresolved |
| OE | Flow | Findings create actions; risks/issues/actions shared | Integrated suite | Generic project assets, but no coherent workflow | contexts | PARTIAL | No finding-to-action traceability lifecycle | None | None | YES | P0 | Action/Risk/Evidence | High | OE-4 | XL | PM engine dependency |
| OE | Flow | Statistical outputs feed reports | Minitab | Add-to-report snapshots and images | ReportContext/tools | PARTIAL | Not all tools; raster and stale snapshots | None | None | YES | P0 | Analysis/Evidence/Report | High | OE-5 | L | Link live config/result provenance |
| OE | Guidance | Deterministic test-selection rules | Minitab Assistant | Worksheet recommendations based on coarse types | Worksheet | MISSING | Recommendation links are not validity rules | None | None | YES | P0 | AnalysisRule | Very high | OE-5 | XL | AI must consume, not replace |
| OE | Guidance | Assumption rules/report cards/next steps | Minitab Assistant | Tool-local prose and companion panels | tools | PARTIAL | No reusable evaluated rule graph | None | None | YES | P0 | AnalysisRule/Evidence | Very high | OE-5 | L | Version rules and citations |
| OE | Guidance | Tool handoff/sample-size/stability warnings | Minitab Assistant | Ad hoc warnings | tools | PARTIAL | No cross-tool state machine | None | None | YES | P0 | AnalysisRule | Very high | OE-5 | L | Deterministic audit trail |
| OE | Export | Print and PDF | Minitab/Office | Browser print; html2canvas JPEG into jsPDF | DocumentWorkspace/ReportBuilder | PARTIAL | Functional but rasterized and pagination fragile | None | Visual only | YES | P0 | Report | Very high | OE-5 | L | Text not reliably editable/searchable |
| OE | Export | Vector/SVG/high-resolution chart export | Minitab | Recharts SVG in DOM; no first-class export | tools/report | MISSING | Report capture converts to PNG/JPEG | None | None | YES | P0 | Evidence | Very high | OE-5 | L | Preserve chart spec + SVG |
| OE | Export | Word/PowerPoint copy/editable tables | Minitab/Office | No DOCX/PPTX/export clipboard contract | — | MISSING | Routine executive workflow exit | None | None | YES | P0 | Report/Artifact | Very high | OE-5 | XL | Office-ready semantic output |
| OE | Export | Binder/project export, pagination, metadata/provenance | Minitab Workspace | Report builder and snapshots; no complete binder package | ReportBuilder | PARTIAL | Limited headers/footers/appendix/version lineage | None | None | YES | P0 | Report/Evidence | Very high | OE-5 | L | Reproducible package manifest |
| PM | Initiation | Request, business case, charter, objectives, scope | Asana/Smartsheet | Charter plus configured document workspaces | ProjectCharter/DocumentWorkspace | PARTIAL | Strong capture, no intake funnel/scoring workflow | None | None | MAYBE | P0 | Project/Document | High | PM-1 | L | Documents are not portfolio intake |
| PM | Initiation | Sponsor, owner, stakeholders, assumptions, constraints | PM suite | Project fields and document tables | contexts/configs | PARTIAL | Data duplicated across document JSON | None | None | MAYBE | P0 | Stakeholder/Project | High | PM-1 | L | Canonical object references needed |
| PM | Initiation | Preliminary risks, prioritization, approval | Smartsheet/Asana | Risk/approval document fields | configs | PARTIAL | No scoring queue, approval workflow, audit SLA | None | None | YES | P0 | Risk/Approval | High | PM-1 | L | Governance engine |
| PM | Scope | Requirements/deliverables/acceptance criteria | PM suite | Generic PMP document templates | `pmpTemplates.js` | PARTIAL | Mostly generic sections/tables, not traceable objects | None | None | YES | P0 | Requirement/Deliverable | High | PM-1 | XL | Requirement primitive absent |
| PM | Scope | WBS hierarchy/work packages/milestones | Microsoft Project | WBS documents only | pmpTemplates | MISSING | No hierarchical executable work model | None | None | YES | P0 | Task/Milestone | Very high | PM-1 | XL | Foundation for scheduler |
| PM | Scope | Reusable project templates/cloning | Asana/Smartsheet | Document configs; no full project clone engine | configs/projects | PARTIAL | Cannot clone linked schedule/resources/governance | None | None | MAYBE | P1 | Project | High | PM-1 | L | Stable IDs/remapping |
| PM | Scheduling | Tasks/subtasks, durations, dates, milestones | Microsoft Project | No professional task schedule model found | — | MISSING | Fundamental subsystem absent | None | None | YES | P0 | Task/Milestone | Very high | PM-2 | XL | Document timeline tables do not qualify |
| PM | Scheduling | Predecessors/successors; FS/SS/FF/SF | Microsoft Project | Missing | — | MISSING | No dependency graph | None | None | YES | P0 | Dependency | Very high | PM-2 | XL | Typed edges |
| PM | Scheduling | Leads/lags, calendars, nonworking time | Microsoft Project | Missing | — | MISSING | Cannot calculate credible dates | None | None | YES | P0 | Calendar/Dependency | Very high | PM-2 | XL | Locale/work calendar hierarchy |
| PM | Scheduling | Constraints, deadlines, recurring work | Microsoft Project | Missing | — | MISSING | No constraint semantics/recalculation | None | None | YES | P0 | Task | High | PM-2 | XL | Explicit conflict diagnostics |
| PM | Scheduling | Forward/backward pass, early/late dates | Microsoft Project | Missing | — | MISSING | No CPM engine | None | None | YES | P0 | Schedule | High | PM-2 | XL | Deterministic DAG tests |
| PM | Scheduling | Total/free float, critical/near-critical path | Microsoft Project | Missing | — | MISSING | Core scheduling discipline absent | None | None | YES | P0 | Schedule | High | PM-2 | XL | Multiple calendars complicate float |
| PM | Scheduling | Recalculation and dependency propagation | Microsoft Project | Missing | — | MISSING | Manual tables cannot propagate change | None | None | YES | P0 | Schedule | Very high | PM-2 | XL | Transactional calculation engine |
| PM | Scheduling | Baselines, variance, what-if | Microsoft Project | Document baseline forms only | configs | MISSING | No computed schedule/work/cost baseline | None | None | YES | P0 | Baseline | Very high | PM-2 | XL | Preserve approved baseline versions |
| PM | Views | Grid/list and Gantt | MS Project/Smartsheet | No executable task grid/Gantt found | — | MISSING | Timeline document is not a schedule view | None | None | YES | P0 | Task/Schedule | High | PM-3 | XL | Virtualized large plans |
| PM | Views | Kanban/calendar/timeline/milestone views | Asana/Smartsheet | No shared task views | — | MISSING | Users exit for daily execution | None | None | YES | P0 | Task/View | Very high | PM-3 | XL | One query/view model |
| PM | Views | Saved filters/grouping/sorting/zoom/dependency graphics | PM suites | Missing | — | MISSING | Professional navigation absent | None | None | YES | P1 | View | High | PM-3 | L | Permissions and sharing |
| PM | Execution | Assignment/status/priority/due dates | Asana/Smartsheet | Fields appear in tables; no canonical task service | documents | PARTIAL | Not consolidated into My Work | None | None | YES | P0 | Task/User | Very high | PM-3 | XL | Avoid per-document task copies |
| PM | Execution | Comments/mentions/attachments/checklists | Asana | Missing or future placeholders | — | MISSING | Collaboration exits immediately | None | None | YES | P0 | Comment/Artifact/Task | Very high | PM-3 | XL | Notifications/permissions |
| PM | Execution | Activity history/notifications/reminders | Asana/Smartsheet | Project activity events; no notification engine | Intelligence/ProjectsContext | PARTIAL | Local activity list only | None | None | YES | P0 | ActivityEvent | Very high | PM-3 | XL | Server events required |
| PM | Execution | Recurring tasks, My Work, approvals | Asana | Approval documents but no execution queues | configs | MISSING | No cross-project personal work | None | None | YES | P0 | Task/Approval | Very high | PM-3 | XL | Identity/organization scope |
| PM | Resources | Directory/role/skill/availability/calendar | Microsoft Project | People fields only | documents/project | MISSING | No resource model/availability | None | None | YES | P0 | Resource | Very high | PM-4 | XL | Generalize beyond people |
| PM | Resources | Planned/actual effort, workload/allocation/utilization | MS Project/Asana | Missing | — | MISSING | No capacity math | None | None | YES | P0 | Resource/Assignment | Very high | PM-4 | XL | Time-phased units |
| PM | Resources | Over-allocation/capacity/demand/portfolio workload | MS Project/Asana | Missing | — | MISSING | PMO cannot balance supply and demand | None | None | YES | P0 | Resource/Portfolio | Very high | PM-4 | XL | Requires scheduler |
| PM | Resources | Reassignment/conflict resolution/leveling | Microsoft Project | Missing | — | MISSING | No leveling engine | None | None | YES | P1 | Resource/Schedule | High | PM-4 | XL | Deterministic policies |
| PM | Cost | Rates, planned/actual hours, time tracking | Microsoft Project/Smartsheet | Financial-impact document fields only | configs | MISSING | No time/cost ledger | None | None | YES | P0 | Cost/Resource | Very high | PM-4 | XL | Currency/rate effective dates |
| PM | Cost | Fixed/variable costs, budget, actuals, commitments | Microsoft Project | Missing | — | MISSING | Budget documentation not calculation | None | None | YES | P0 | Cost | High | PM-4 | XL | Accounting integration future |
| PM | Cost | Forecast, burn, variance | PM suites | Missing | — | MISSING | Cannot control financial performance | None | None | YES | P0 | Cost/KPI | High | PM-4 | L | Derived from approved baseline |
| PM | EVM | PV, EV, AC, CV, SV, CPI, SPI | Microsoft Project | No data-derived EVM engine | — | MISSING | Dashboard placeholder/document not sufficient | None | None | YES | P0 | Baseline/Cost/KPI | High | PM-4 | XL | Requires WBS, status date, actuals |
| PM | EVM | BAC, EAC, ETC, VAC, TCPI | Microsoft Project | Missing | — | MISSING | No forecast formulas/data integrity | None | None | MAYBE | P1 | Cost/KPI | High | PM-4 | L | Multiple EAC methods |
| PM | RAID | Risks/assumptions/issues/dependencies with owners | PM suites | Documents and some project risk count | configs/ProjectDetail | PARTIAL | Records are fragmented, not canonical RAID objects | None | None | YES | P0 | Risk/Issue/Dependency | Very high | PM-5 | XL | Migration from document rows |
| PM | RAID | Probability/impact/exposure/response/triggers/residual | PM suites | Risk tables cover subsets | configs | PARTIAL | No scoring model, heatmap, residual lifecycle | None | None | YES | P0 | Risk | High | PM-5 | L | Configurable matrices |
| PM | RAID | Escalation and decision log | PM suites | Decision/log documents | pmpTemplates | PARTIAL | No workflow/escalation linkage | None | None | MAYBE | P0 | Decision/Approval | High | PM-5 | L | Immutable decisions/audit |
| PM | Change | Request and scope/schedule/cost/resource/risk impact | PM suites | Change-request document | pmpTemplates | PARTIAL | No linked impact computation | None | None | YES | P0 | Change/Approval | Very high | PM-5 | XL | Integrate scheduler/budget |
| PM | Change | Approval, baseline update, audit history | Microsoft Project/Smartsheet | Approval table only | documents | MISSING | No controlled baseline transaction | None | None | YES | P0 | Approval/Baseline/Activity | Very high | PM-5 | XL | Segregation of duties |
| PM | Stakeholders | Register and power/interest | PM suites | Stakeholder workspace/table | configs | PARTIAL | Good capture, weak canonical linkage | None | None | MAYBE | P0 | Stakeholder | High | PM-5 | M | One shared record |
| PM | Stakeholders | RACI and communication plan | PM suites | Document workspaces | configs | PARTIAL | No task/deliverable integration | None | None | MAYBE | P0 | Stakeholder/Resource | High | PM-5 | L | Matrix and cadence events |
| PM | Stakeholders | Meeting notes/actions/status requests/escalation | Asana/Smartsheet | Meeting Minutes document and action rows | templates | PARTIAL | No recurring collection/action synchronization | None | None | YES | P0 | Meeting/Action | High | PM-5 | L | Shared actions required |
| PM | Agile | Backlog/epics/stories/sprints/points | Asana | Not found | — | MISSING | Hybrid teams leave platform | None | None | MAYBE | P1 | WorkItem/Iteration | High | PM-3 | XL | Product decision: target breadth |
| PM | Agile | Velocity/burndown/Kanban/WIP | Asana | Missing | — | MISSING | No agile execution analytics | None | None | MAYBE | P1 | KPI/View | High | PM-3 | L | Depends on work-item engine |
| PM | Agile | Hybrid milestones/iteration planning | PM suites | Documents only | — | MISSING | No hybrid schedule linkage | None | None | MAYBE | P1 | Milestone/Iteration | High | PM-3 | XL | Avoid parallel task models |
| PM | Portfolio | Project hierarchy/program/portfolio | Asana/MS Project | Flat projects plus active project | ProjectsContext | MISSING | No program/portfolio entities | None | None | YES | P0 | Program/Portfolio | Very high | PM-6 | XL | Organization governance |
| PM | Portfolio | Cross-project dependencies/objectives | PM suites | Missing | — | MISSING | Strategic execution gap | None | None | YES | P0 | Dependency/Objective | Very high | PM-6 | XL | Scheduler rollup |
| PM | Portfolio | Prioritization/scoring/funding/resource constraints | Smartsheet/Asana | Missing | — | MISSING | PMO exits to spreadsheets | None | None | YES | P0 | Portfolio/Cost/Resource | Very high | PM-6 | XL | Scenario engine |
| PM | Portfolio | Roadmap/milestone rollup/calendar/health | PM suites | Project dashboard only | ProjectDetail | PARTIAL | Single-project asset counts, no rollup | None | None | YES | P0 | Portfolio/KPI | High | PM-6 | XL | Time-phased aggregation |
| PM | Portfolio | Benefits/risks/executive dashboard | PM suites | Project fields/documents | ProjectDetail/configs | PARTIAL | No portfolio aggregation or realization tracking | None | None | YES | P0 | Benefit/Risk/KPI | High | PM-6 | L | Canonical metrics first |
| PM | Dashboards | Project health/schedule/milestone | PM suites | Executive project home with basic metadata/counts | ProjectDetail | PARTIAL | No computed schedule health | None | None | YES | P0 | KPI | High | PM-6 | L | Current score mostly document completion |
| PM | Dashboards | Budget/EVM/risk/issues/resources/workload | PM suites | Asset/risk counts; no engines | ProjectDetail | MISSING | Cannot derive trustworthy control metrics | None | None | YES | P0 | KPI | High | PM-6 | XL | Do not fabricate dashboards |
| PM | Dashboards | Benefits/portfolio/automated status reports | PM suites | Report builder and docs | ReportBuilder | PARTIAL | Manual snapshots, no scheduled data-derived report | None | None | YES | P0 | Report/KPI | Very high | PM-6 | XL | Narrative provenance |
| PM | Automation | Status rules/reminders/due-date alerts | Asana/Smartsheet | Missing | — | MISSING | Manual administration burden | None | None | YES | P0 | Rule/Activity | Very high | PM-6 | XL | Event/rule engine |
| PM | Automation | Approvals/escalations/recurring work | Asana/Smartsheet | Static approval documents | configs | MISSING | No executable workflow | None | None | YES | P0 | Approval/Rule | Very high | PM-6 | XL | Idempotent actions |
| PM | Automation | Threshold/assignment/workflow rules | Smartsheet/Asana | Missing | — | MISSING | Enterprise teams exit | None | None | MAYBE | P1 | Rule | Very high | PM-6 | XL | Audit and loop prevention |
| PM | Interop | CSV/Excel import | Smartsheet/MS Project | Worksheet CSV only; no PM plan import | Worksheet | MISSING | Data worksheet does not import task plans | None | None | YES | P0 | Project/Task | High | PM-7 | XL | XLSX mapping wizard |
| PM | Interop | MS Project compatibility | Microsoft Project | None | — | MISSING | Migration/round-trip blocker | None | None | YES | P1 | Schedule | High | PM-7 | XL | XML/MPP strategy decision |
| PM | Interop | Calendar import/export | PM suites | None | — | MISSING | External scheduling unavoidable | None | None | MAYBE | P1 | Calendar | High | PM-7 | M | ICS initially |
| PM | Interop | PDF/report/chart export | PM suites | Raster PDF/report builder | ReportBuilder/DocumentWorkspace | PARTIAL | No professional vector/editable deliverables | None | None | YES | P0 | Report | Very high | PM-7 | L | Same export platform as OE |
| PM | Interop | API readiness | PM suites | Context/localStorage-heavy frontend model | contexts | PARTIAL | Supabase foundations exist elsewhere, domain APIs not evident | Auth/domain contexts | No contract tests | YES | P0 | All | Very high | PM-1 | XL | Multiuser concurrency essential |

## Shared primitive fitness

| Primitive | Classification | Current evidence | Future-suite test | Required generalization |
|---|---|---|---|---|
| Project | NEEDS GENERALIZATION | Broad JSON asset container with organization/project IDs | A healthcare flow-improvement project fits, but governed type/version contracts are weak | Normalize lifecycle, fields, relations, permissions, versioning |
| Program | SUITE-SPECIFIC / ABSENT | No durable entity found | Cannot roll up a construction program | Introduce generic hierarchy and governance |
| Portfolio | SUITE-SPECIFIC / ABSENT | No entity | Cannot prioritize a supply-chain initiative portfolio | Generic scoring, funding, objectives, rollups |
| Task | NEEDS GENERALIZATION | Table rows/actions, no canonical task | A shortage action would duplicate across documents | One work-item/task primitive with typed relations |
| Milestone | SUITE-SPECIFIC / ABSENT | Document fields | Manufacturing launch milestone cannot drive schedule | Canonical zero-duration schedule item |
| Risk | NEEDS GENERALIZATION | Document/evidence fragments | Patient-flow operational risk conceptually fits but lacks canonical lifecycle | Typed risk, scoring model, responses, links |
| Issue | SUITE-SPECIFIC / ABSENT | Issue-log document only | Supplier disruption cannot flow into actions | Canonical issue lifecycle |
| Decision | NEEDS GENERALIZATION | Decision-log document rows | Regulated approval decision needs immutable audit | Canonical immutable decision + rationale/references |
| Action | NEEDS GENERALIZATION | Document table rows | Shortage corrective action needs one owner/status record | Canonical action linked from any artifact |
| Approval | NEEDS GENERALIZATION | Approval tables, not engine | Quality release approval needs workflow and signatures | State machine, policy, evidence, audit |
| Artifact | FUTURE-SUITE SAFE foundation | Project artifacts/evidence concepts | Construction inspection artifact fits | Add typed schema, versions, retention, permissions |
| Evidence | NEEDS GENERALIZATION | Evidence library metadata and links | Inspection evidence fits but statistical configs/results vary | Typed payloads, immutable provenance, versioned renderers |
| Dataset | NEEDS GENERALIZATION | Multi-dataset context with columns/history | Supply-chain demand data fits | Server persistence, schema/version lineage, recipes, access control |
| Analysis | FUTURE-SUITE SAFE foundation | Generic project/dataset/config/result links | Forecast or safety analysis can fit | Versioned tool contracts and reproducibility manifests |
| Report | NEEDS GENERALIZATION | Generic items/snapshots | Future suites can contribute snapshots but not semantic sections safely | Versioned section blocks, live references, render targets |
| Stakeholder | NEEDS GENERALIZATION | Repeated document table data | Public-sector stakeholder fits | Canonical contact/role/engagement object |
| User | FUTURE-SUITE SAFE foundation | Supabase auth/profile foundation | Cross-suite user fits | Domain roles/skills/availability remain separate |
| Organization | FUTURE-SUITE SAFE foundation | Organization-aware contexts | Multi-suite tenant fits | Governance and object-level permissions |
| Resource | SUITE-SPECIFIC / ABSENT | People/owner strings | A machine/work center does not fit safely | Polymorphic person/equipment/work-center resource plus calendars |
| Cost | NEEDS GENERALIZATION | Charter financial fields | Procurement/healthcare cost needs ledger semantics | Currency, period, type, baseline/actual/forecast |
| Benefit | NEEDS GENERALIZATION | Document fields | Capacity/revenue/safety benefit fits conceptually | Quantified benefit, owner, realization dates, evidence |
| KPI | NEEDS GENERALIZATION | Dashboard/document values | OTIF or patient wait-time fits | Formula, source, cadence, target, history, confidence |
| Comment | SUITE-SPECIFIC / ABSENT | No shared threaded comment object | Cross-suite collaboration cannot reuse | Threading, mentions, permissions, immutable audit |
| Activity event | NEEDS GENERALIZATION | Local project activity examples | Any suite event can fit, but event taxonomy/durability weak | Server event envelope, actor, object, causation, idempotency |

## Validation inventory

Only two test files were found: authentication behavior and entitlement-model behavior. No executable statistical reference suite and no scheduling test network were found. Comments in `statTests.js` that cite spot comparisons are useful implementation notes but do not qualify as repeatable validation.

| Area | Calculation test | Reference dataset/result | External comparison | Edge/missing/invalid/small-sample coverage | Verdict |
|---|---|---|---|---|---|
| Descriptive/graphs | No | No | No | No systematic suite | NEEDS VALIDATION |
| Hypothesis/nonparametric | No | Comments only | Claimed spot values only | Incomplete | NEEDS VALIDATION |
| ANOVA/post-hoc/assumptions | No | No | No executable R/SciPy/Minitab oracle | High-risk gaps | NEEDS VALIDATION |
| Regression/logistic | No | No | No | Singular, separation, influence unproven | NEEDS VALIDATION |
| SPC/attribute/CUSUM/EWMA | No | No | No | Constants, changing denominators, small samples unproven | NEEDS VALIDATION |
| Capability | No | No | No | One-sided/nonnormal/subgroup paths absent | NEEDS VALIDATION |
| MSA | No | No | No | Study balance, interaction, tolerance unproven | NEEDS VALIDATION |
| DOE | No | No | No | Aliasing/unbalanced/diagnostics unproven | NEEDS VALIDATION |
| Scheduling/CPM | Not applicable—engine absent | No deterministic network | No | No calendar/lag/constraint/baseline tests | MISSING |

Minimum release validation must use versioned fixtures with expected statistics, df, p-values, intervals, flags, indices, and plots compared to authoritative R/SciPy/Minitab outputs; property tests for invariants; invalid/NaN/constant/small/unbalanced data; and reproducible seeded algorithms. Scheduling requires deterministic networks covering all dependency types, leads/lags, calendars, constraints, forward/backward pass, float, critical/near-critical paths, propagation, and approved baselines.

## Export fidelity audit

- Recharts generally renders SVG interactively, but the reporting/export route captures DOM output through `html2canvas` and embeds PNG/JPEG-like raster content in jsPDF. This is not vector-chart parity.
- Print and PDF exist, but there is no evidence of robust pagination contracts, widow/orphan handling, repeated table headers, high-resolution chart policies, semantic appendices, or reproducibility manifests.
- No native DOCX/PPTX export or supported editable copy/paste path was found. Users still need Word/PowerPoint for polished executive deliverables.
- Tables remain editable in the application but are snapshots in reports; chart specifications, dataset versions, analysis parameters, and rule violations are not consistently preserved as a reproducible evidence package.
- “Add to Report” is a valuable foundation, but a binder/project package needs typed live references, frozen versions, metadata, headers/footers, contents, appendices, and asset provenance.

## Deterministic guidance architecture required

No reusable deterministic statistical guidance engine was found. Worksheet recommendations are based mainly on detected column types, while tools contain local prose and warnings. Required architecture:

1. **Statistical Decision Rules:** versioned declarative rules consuming question, response/predictor types, independence, pairing, group count, repeated structure, censoring, subgrouping, and intended inference.
2. **Assumption Rules:** machine-evaluated prerequisites and diagnostics with applicability, thresholds, caveats, severity, and evidence references.
3. **Diagnostic Report Cards:** immutable results combining validity, stability, sample adequacy, missingness, effect/practical significance, and limitations.
4. **Next-Step Rules:** deterministic recommended alternatives, transformations, data-collection actions, post-hoc procedures, or escalation.
5. **Tool Handoff Rules:** typed mapping of dataset version, columns, filters, design, assumptions, and prior results into the next tool without re-entry.

An LLM may later explain or summarize these objects. It must not select statistical validity independently, modify deterministic outcomes, or obscure rule/version provenance.

## Evidence-based completion metrics

Counts reflect the matrix’s deliberately grouped practitioner requirements; grouped rows are scored as one auditable capability contract.

| Suite | Priority | Total | Implemented | Partial | Missing | Needs validation |
|---|---:|---:|---:|---:|---:|---:|
| OE | P0 | 66 | 2 | 27 | 19 | 18 |
| OE | P1 | 15 | 0 | 3 | 10 | 2 |
| OE | P2 | 4 | 0 | 0 | 4 | 0 |
| PM | P0 | 47 | 0 | 19 | 28 | 0 |
| PM | P1 | 10 | 0 | 1 | 9 | 0 |
| PM | P2 | 0 | 0 | 0 | 0 | 0 |

| Suite | Capability coverage | Incumbent displacement readiness | Validation readiness |
|---|---:|---:|---:|
| Operational Excellence | **32%** | **22%** | **0%** |
| Project Management | **13%** | **8%** | **0%** |

Capability coverage applies status and priority weights across all rows. Displacement readiness includes P0 only with harsher discounts because an unvalidated formula or shallow workflow cannot safely displace an incumbent. Validation readiness counts only credible executable reference validation; authentication/entitlement tests do not validate suite capability. Scores are directional repository evidence, not marketing completion percentages.

## Why Would the User Still Leave Aureqin?

### For Minitab

- Prepare real datasets using joins, reshape, recode, calculated columns, transformations, grouped operations, reusable recipes, and recoverable history.
- Run independently validated assumption tests, probability plots, exact post-hoc workflows, full GLM, advanced regression diagnostics, and resampling.
- Use professional SPC stages/historical parameters, Xbar-S and broader charts, nonnormal/one-sided capability, expected PPM and confidence bounds.
- Conduct crossed/nested/attribute/bias/linearity/stability MSA at accepted practitioner depth.
- Generate and analyze full/fractional/RSM designs with aliasing, diagnostics, optimization, and confirmation runs.
- Perform acceptance sampling, reliability, time-series, or multivariate analysis.

### For Minitab Workspace

- Build high-fidelity process/cross-functional maps and VSMs with robust connectors and export.
- Maintain typed traceability from CTQ to measures, process variables, FMEA, analyses, actions, control plans, tollgates, and realized benefits.
- Produce a governed project binder rather than disconnected document snapshots.

### For Microsoft Project

- Build a dependency-driven schedule with four link types, leads/lags, calendars, constraints, CPM, float, recalculation, baselines, and variance.
- Assign time-phased resources/costs, resolve over-allocation, level work, and compute EVM from actual plan data.

### For Smartsheet

- Operate task grids, Gantt/calendar/Kanban views, forms, approvals, automation, cross-sheet reporting, dashboards, and governed intake.
- Import/export operational plans and collaborate on shared live records.

### For Asana

- Manage daily assignments, comments, mentions, attachments, checklists, reminders, recurring work, My Work, portfolios, goals, workload, approvals, and rules.
- Run agile/hybrid delivery with boards, iterations, WIP, and cross-project visibility.

### For Excel

- Import XLSX, manipulate and reconcile data, pivot/join/recode, create calculated columns, and manage financial/resource models.
- Compensate for absent PM engines with bespoke trackers and formulas.

### For PowerPoint and Word

- Produce editable, vector, brand-controlled charts and tables; professional pagination; executive narratives; appendices; and client-ready packs.
- Copy analysis output without raster degradation and revise it outside Aureqin.

## Recommended build waves

1. **Foundation-0 — validation and contracts:** statistical reference harness, dataset/version/analysis contracts, canonical IDs/relations, evidence provenance, and export specification. This precedes feature expansion because current analytical claims are unproven.
2. **OE-1 — P0 data and assumptions:** XLSX; recipes, transforms, joins/reshape; probability plots/distribution fitting; normality/variance/outlier workflows; validated core inference.
3. **OE-2 — SPC/MSA/capability:** shared subgroup engine, Xbar-S/stages/rules; complete normal/nonnormal capability; crossed/nested/attribute/bias/linearity/stability MSA.
4. **OE-3 — ANOVA/regression/DOE:** general model specification, Tukey and diagnostics, model assets, fractional designs/aliasing/optimization/confirmation.
5. **OE-4 — Lean workflow parity:** typed CTQ/process-variable/FMEA/action/control-plan/benefit traceability and production-grade diagramming/tollgates.
6. **OE-5 — deterministic guidance and export:** decision rules, diagnostic cards, handoffs, vector/Office-ready output, governed binder, displacement validation.
7. **PM-1 — shared PM model:** canonical requirement, deliverable, work item, milestone, resource, RAID, change, approval, calendar, cost, and baseline primitives; multiuser service contracts.
8. **PM-2 — scheduling engine:** dependency graph, calendars, constraints, CPM/float, propagation, baselines, variance, what-if, and deterministic tests.
9. **PM-3 — execution and views:** grid/Gantt/Kanban/calendar, assignments, collaboration, My Work, saved views, notifications, agile/hybrid atop one work model.
10. **PM-4 — resources/cost/EVM:** availability, time-phased allocation, workload, actuals, budgets, forecasts, EVM, then leveling.
11. **PM-5 — governance:** canonical RAID, decisions, stakeholder/RACI/communications, change impact and approval-to-baseline workflow.
12. **PM-6 — portfolio and automation:** programs/portfolios, intake/scoring/funding, rollups, dashboards, rules, PMO controls.
13. **PM-7 — interoperability and final displacement validation:** XLSX/Project/calendar migration strategy, professional exports, scale/performance, reference customer scenarios.
14. **Later specialist waves:** acceptance sampling, reliability, advanced time series, multivariate, RSM/mixture DOE, and advanced portfolio optimization according to validated segment demand.

## Highest-risk implementation areas

1. Statistical correctness and communicating uncertainty without a regression/reference corpus.
2. CPM scheduling across dependency types, multiple calendars, constraints, baselines, and incremental recalculation.
3. Canonical cross-document objects and migration from existing additive JSON/local-storage records without duplication or data loss.
4. MSA variance-components rigor and nonnormal capability/distribution fitting.
5. Resource/cost/EVM integration, where apparently reasonable dashboards can become mathematically misleading.
6. Deterministic guidance governance, including rule versions, traceability, conflicts, and safe AI explanation boundaries.
7. Vector/semantic multi-format export with stable pagination and reproducible evidence.

## Product decisions and ambiguities

- Define the first displacement persona precisely: broad LSS practitioner, manufacturing quality engineer, healthcare/process-improvement leader, or advanced statistician. This determines whether acceptance sampling and reliability are P1 or launch-adjacent.
- Decide whether Aureqin targets Microsoft Project schedule fidelity or collaboration-first PM with selective CPM. The requested benchmark implies the former and therefore an XL engine.
- Decide the required MS Project interoperability level: import-only via supported interchange, round-trip XML, or MPP compatibility.
- Decide whether agile delivery is first-class or an extension of one canonical work-item model; a separate agile schema would create long-term duplication.
- Decide which outputs must be editable in DOCX/PPTX versus vector PDF/SVG and whether a full project binder is regulated-record grade.
- Define cloud/multiuser/offline requirements. Local-storage foundations cannot deliver PM collaboration, audit, automation, or portfolio guarantees.
- Define statistical validation authorities and acceptable tolerances per method (Minitab, R, SciPy/statsmodels, published standards).

## Benchmark rebaseline policy

This snapshot is **August 2026**. Before each major release gate, re-check current Minitab, Minitab Workspace/Assistant, Microsoft Project/Planner, Smartsheet, and Asana capabilities and official documentation. Re-score only after executable validation and realistic end-to-end practitioner scenarios—not after adding routes or forms.
