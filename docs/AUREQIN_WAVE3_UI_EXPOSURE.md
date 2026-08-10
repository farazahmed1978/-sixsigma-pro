# Aureqin Wave 3 practitioner exposure matrix

Assessment date: 2026-08-09. UI completeness is independent of statistical validation. `COMPLETE` means a practitioner can discover, configure, execute, interpret, and report the method. `PARTIAL` means a usable workflow exists but an important practitioner control or report detail remains. `ENGINE ONLY` means the implementation is not reasonably usable from the product. `MISSING` means no supported implementation is claimed.

| Capability | Engine | Workspace / selection and mapping | Interpretation, report, provenance | Search / navigation | UI status | Validation |
|---|---|---|---|---|---|---|
| One-sample t and mean CI | Yes | Hypothesis Testing; worksheet or manual measurement and target | Hierarchical result, report, method/version | Guided, direct, global alias | COMPLETE | PARTIALLY VALIDATED |
| Paired t and difference CI | Yes | Hypothesis Testing; Before and After columns/manual data | Result, report, paired method provenance | Guided, direct, global alias | COMPLETE | UNVALIDATED |
| Welch two-sample t and difference CI | Yes | Hypothesis Testing; two independent groups; explicit default | Result, assumptions, report | Guided, direct, global alias | COMPLETE | PARTIALLY VALIDATED |
| Pooled two-sample t | Yes | Same workspace; intentional variance-model selector | Equal-variance limitation, report/provenance | Direct alias/deep link | COMPLETE | UNVALIDATED |
| One proportion, Wilson CI, exact binomial path | Yes | Hypothesis Testing; event and trial counts | Exact-path warning, interval, report | Guided/direct/global alias | COMPLETE | UNVALIDATED |
| Two proportions and difference CI | Yes | Hypothesis Testing; two event/trial pairs | Sparse Fisher pathway warning, report | Guided/direct/global alias | COMPLETE | UNVALIDATED |
| One variance / SD | Yes | Hypothesis Testing; measurement/manual data and target SD | CI, strong normality warning, report | Guided/direct/global alias | COMPLETE | UNVALIDATED |
| Two variances | Yes | Hypothesis Testing; two groups | Ratio CI, nonnormality warning, report | Direct/global alias | COMPLETE | UNVALIDATED |
| Levene / Brown-Forsythe context | Existing | ANOVA companion analysis | Assumption result | ANOVA workspace/search | COMPLETE | UNVALIDATED |
| Bartlett context | Existing | ANOVA companion analysis | Assumption result | ANOVA workspace/search | COMPLETE | UNVALIDATED |
| Chi-square goodness-of-fit | Yes | Hypothesis Testing; observed and expected counts | Ranked category residual evidence and report | Direct/global alias | COMPLETE | UNVALIDATED |
| Chi-square independence | Yes | Hypothesis Testing; editable contingency table | Expected-count diagnostics, report | Guided/direct/global alias | COMPLETE | UNVALIDATED |
| Fisher exact | Yes | Hypothesis Testing; explicit 2x2 table | Sparse-table explanation, report | Guided/direct/global alias | COMPLETE | UNVALIDATED |
| Cramér's V | Yes | Visible with contextual association language | Structured result and report | Categorical workflow | COMPLETE | UNVALIDATED |
| Standardized residuals / contributors | Yes | Top contributors plus expandable full table | Observed/expected/direction retained | Categorical workflow | COMPLETE | UNVALIDATED |
| Mann-Whitney U | Yes | Hypothesis Testing; independent groups | Tie/approximation warning and report | Guided/direct/global alias | COMPLETE | UNVALIDATED |
| Wilcoxon signed-rank | Yes | Hypothesis Testing; paired mapping | Approximation warning and report | Direct/global alias | COMPLETE | UNVALIDATED |
| Exact sign test | Yes | Hypothesis Testing; paired mapping | Positive/negative/zero hierarchy and report | Direct/global alias | COMPLETE | UNVALIDATED |
| Kruskal-Wallis | Yes | Hypothesis Testing; 3 mapped groups | Rank result and limitations | Direct/global alias | COMPLETE | UNVALIDATED |
| Dunn post-hoc | Yes | Hypothesis Testing; 3 mapped groups | Adjusted pair table and report | Direct/global alias | COMPLETE | UNVALIDATED |
| Friedman repeated-rank analysis | Yes | Hypothesis Testing; 3 paired conditions | Result and report | Direct/global alias | COMPLETE | UNVALIDATED |
| One-way ANOVA | Yes | ANOVA; response and grouping variable | Assumptions, interpretation, report/provenance | Navigation/global search | COMPLETE | PARTIALLY VALIDATED |
| Tukey HSD / Tukey-Kramer | Yes | On-demand ANOVA companion | Pair differences, simultaneous CI, adjusted p | Tukey global alias opens ANOVA | COMPLETE | UNVALIDATED |
| Bonferroni comparisons | Yes | On-demand ANOVA companion | Adjusted pair output | ANOVA/global alias | COMPLETE | UNVALIDATED |
| Games-Howell | Yes | On-demand ANOVA companion | Unequal-variance rationale and pair output | ANOVA/global alias | COMPLETE | UNVALIDATED |
| Two-way / factorial ANOVA | Yes | ANOVA; response plus two categorical factors | Main and interaction results/report | Navigation/global search | COMPLETE | UNVALIDATED |
| Repeated-measures ANOVA | Yes | ANOVA; condition columns in subject order | Sphericity context and report | Navigation/global search | COMPLETE | UNVALIDATED |
| Simple linear regression | Existing | Regression; X and Y mapping | Fit, intervals/diagnostics/report | Navigation/global search | COMPLETE | PARTIALLY VALIDATED |
| Multiple linear regression | Yes | Multiple Regression; response and predictors | Practitioner result/report/provenance | Navigation/global search | COMPLETE | UNVALIDATED |
| Categorical predictors | Yes | Predictor chips identify categorical variables | Reference-coded coefficient output | Regression aliases | COMPLETE | UNVALIDATED |
| Interaction terms | Yes | Progressive Model terms control | Explicit coefficients/diagnostic errors | Regression aliases | COMPLETE | UNVALIDATED |
| Polynomial terms | Yes | Quadratic continuous-term control | Explicit coefficients/diagnostic errors | Regression aliases | COMPLETE | UNVALIDATED |
| Coefficient confidence intervals | Yes | Multiple Regression results | Visible per coefficient and reported | Regression workspace | COMPLETE | UNVALIDATED |
| Prediction intervals | Yes | Base-input prediction editor handles categorical, interaction, polynomial terms | Mean CI, individual PI, inputs and confidence retained | Regression alias | COMPLETE | UNVALIDATED |
| VIF | Yes | Progressive diagnostics | Visible table and report payload | Regression alias | COMPLETE | UNVALIDATED |
| Leverage, Cook's distance, influential observations | Yes | Progressive diagnostics | Visible source-row table and report | Regression alias | COMPLETE | UNVALIDATED |
| Residual diagnostics | Yes | Histogram and Q-Q controls | Visible and captured in result image | Regression workspace | COMPLETE | UNVALIDATED |
| AIC / BIC | Yes | Progressive diagnostics | Visible and reported | Regression aliases | COMPLETE | UNVALIDATED |
| Binary logistic regression | Yes | Logistic; binary response and predictors | Practitioner result/report/provenance | Navigation/global search | COMPLETE | UNVALIDATED |
| Logistic categorical predictors | Yes | Predictor chips identify categorical variables | Reference-coded coefficients | Logistic aliases | COMPLETE | UNVALIDATED |
| Odds ratios and confidence intervals | Yes | Logistic results table | Visible and reported | Logistic workspace | COMPLETE | UNVALIDATED |
| Classification metrics / confusion matrix | Yes | Logistic diagnostics/results | Accuracy, sensitivity, specificity, cells | Logistic aliases | COMPLETE | UNVALIDATED |
| ROC / AUC | Yes | Plotted ROC with threshold points and adjustable classification threshold | AUC, curve, threshold and warning reported | Logistic alias | COMPLETE | UNVALIDATED |
| Convergence / separation diagnostics | Yes | Logistic diagnostics | Visible actionable warnings and report | Logistic workspace | COMPLETE | UNVALIDATED |
| Pearson correlation | Yes | Correlation/Hypothesis workspaces; paired columns | Coefficient, inference, causality warning | Global alias | COMPLETE | UNVALIDATED |
| Spearman correlation | Yes | Hypothesis Testing; paired columns | Rank result/report | Global alias | COMPLETE | UNVALIDATED |
| Kendall correlation | Yes | Hypothesis Testing; paired columns | Rank result/report | Global alias | COMPLETE | UNVALIDATED |
| Normal distribution fit | Yes | Distribution Analysis; numeric column | AIC/BIC/KS, plot, caveats, report | Navigation/global alias | COMPLETE | UNVALIDATED |
| Lognormal distribution fit | Yes | Distribution Analysis | Same | Global alias/deep link | COMPLETE | UNVALIDATED |
| Weibull distribution fit | Yes | Distribution Analysis | Same, positive-data limitation | Global alias/deep link | COMPLETE | UNVALIDATED |
| Exponential distribution fit | Yes | Distribution Analysis | Same, constant-rate limitation | Global alias/deep link | COMPLETE | UNVALIDATED |
| Gamma distribution fit | Yes | Distribution Analysis | Same | Global alias/deep link | COMPLETE | UNVALIDATED |
| Probability plots | Yes | Candidate selector and responsive plot | Interpretation and caveats | Distribution workspace | COMPLETE | UNVALIDATED |
| Box-Cox exploration | Yes | Explicit non-destructive action | Lambda, limitations, source preservation | Global alias | COMPLETE | UNVALIDATED |
| Full two-level factorial DOE | Yes | DOE; factors, levels, response | Effects/ANOVA, warnings | Navigation/global alias | COMPLETE | UNVALIDATED |
| Fractional factorial DOE | Yes | DOE design selector | Resolution, generators, aliases, warnings | Global alias/deep link | COMPLETE | UNVALIDATED |
| Replication | Yes | DOE selector | Pure-error availability disclosed | DOE workspace | COMPLETE | UNVALIDATED |
| Center points | Yes for full factorial | Full-factorial-only selector | Clearly marked and excluded from contrasts | DOE workspace | COMPLETE | UNVALIDATED |
| Blocking | Yes | Block selector and visible run block | Stored in design provenance | DOE workspace | COMPLETE | UNVALIDATED |
| Seeded randomization / standard order | Yes | Seed control; run/standard order columns | Seed and order provenance | DOE workspace | COMPLETE | UNVALIDATED |
| Main effects and interactions | Yes | Analysis table | Effect order, SS/F/p where estimable | DOE workspace | COMPLETE | UNVALIDATED |
| DOE optimization | Yes | Explicit maximum-response action | Recommended settings and limitation | Global alias | COMPLETE | UNVALIDATED |
| DOE confirmation run | Yes | Observed response entry | Predicted/observed deviation record | Global alias | COMPLETE | UNVALIDATED |
| Response-surface methodology | Yes | DOE guided workflow; continuous factors, responses, diagnostics, contours, optimization, confirmation | Full design/model/report/provenance contract | DOE navigation and RSM aliases | COMPLETE | UNVALIDATED |
| Central composite design | Yes | Rotatable and face-centered CCD, cube/axial/center points | Alpha, coded/natural settings, seed and run order retained | CCD/global aliases | COMPLETE | UNVALIDATED |
| Box-Behnken design | Yes | 3–7 factors, center points, coded/natural matrix | Design metadata, seed and run order retained | Box-Behnken/global aliases | COMPLETE | UNVALIDATED |
| Mixture designs | No | No unsupported controls shown | Not claimed | Not indexed | MISSING | UNVALIDATED |

## Remaining exposure gaps

- Full multi-response desirability is intentionally deferred; the response array contract remains additive for future expansion.
- A heavy 3D plotting dependency was intentionally avoided. The current responsive iso-color contour surface exposes factor planes, ranges, predictions, and held-factor metadata.
- Prediction intervals need a safe new-row design-matrix encoder that reuses fitted categorical levels before a practitioner editor can be exposed.
- Response-surface, mixture, screening, mixed-model, MANOVA, survival, time-series, reliability, and Monte Carlo capabilities remain intentionally outside the Wave 3 claim.
