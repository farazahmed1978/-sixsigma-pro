// Excerpts from "The Black Belt Standard: IASSC Exam Prep & Practitioner Guide" by Faraz Ahmed,
// mapped to the tool(s) they apply to. Shown as a "From the Book" panel on ToolPage.js so a user
// stuck on a tool can read the underlying concept without leaving the app.
//
// Keys match toolMeta ids in App.js (for /tool/:id pages) plus a couple of standalone routes
// ('hypothesis', 'doe'). Where one book section covers multiple tools (e.g. Gage R&R covers both
// 'msa' and 'gage-rr'), the same entry is reused under both keys.

export const BOOK_EXCERPTS = {
  pareto: {
    chapter: '1.2.4 — Pareto Analysis: The 80/20 Rule in Practice',
    text: `When a quality problem involves multiple defect types, multiple failure modes, or multiple root causes, human nature is to try to fix everything simultaneously. Pareto analysis is the discipline of resisting that impulse. Named after Italian economist Vilfredo Pareto, who observed in 1896 that 80% of Italy's land was owned by 20% of the people, Joseph Juran recognized the same 80/20 pattern in quality data: typically 80% of defects come from 20% of the defect types. He called the high-frequency causes the "vital few" and the low-frequency causes the "trivial many."

How to read a Pareto chart: bars are arranged in descending order of frequency (most common on the left). A cumulative percentage line rises from left to right. The point where the cumulative line crosses 80% marks the boundary between the vital few and the trivial many. Address the vital few first.

Exam note: Pareto analysis is a prioritization tool. It tells you WHERE to focus effort. It does not tell you WHY the problem is happening. Root cause investigation (fishbone, hypothesis testing) happens in Analyze.`,
  },

  fishbone: {
    chapter: '2.1.1 — Cause-and-Effect Analysis: The Fishbone Diagram',
    text: `The fishbone diagram — also called the Ishikawa diagram after its inventor Kaoru Ishikawa, or the cause-and-effect diagram — is the structured tool for generating a comprehensive list of every possible reason a process failure could be occurring. Before the team can confirm what is causing the problem, it must first build an exhaustive list of what could be causing it.

Think of the fishbone diagram as a brainstorm with a skeleton. Without the skeleton, team brainstorms produce duplicates, ignore whole categories, and gravitate toward the two or three causes the loudest voices favor. The fishbone provides structure: each major bone represents a category of causes, and team members hang individual candidate causes as ribs.

The six M categories and what they cover: Man (People) — training level, experience, fatigue, attention, adherence to procedures (people are rarely the true root cause — they usually respond rationally to a broken system). Machine — equipment, tooling, calibration status, preventive maintenance, age and wear. Method — procedures, work instructions, whether standard work exists and is followed. Material — raw materials, components, supplier variation, lot-to-lot inconsistency. Measurement — the measurement system itself: calibration, Gage R&R, resolution, operator technique. Mother Nature (Environment) — temperature, humidity, dust, vibration, seasonal variation.

Critical distinction: the fishbone diagram identifies candidate causes. It does not confirm root causes. Every branch is a hypothesis to be tested in Analyze — never treat a fishbone item as a confirmed root cause without statistical testing.`,
  },

  fmea: {
    chapter: '2.1.4 — FMEA: Failure Mode and Effects Analysis',
    text: `FMEA asks a different question than the fishbone: of everything that could go wrong, which failure modes represent the most serious risk — and what should we do proactively before they happen? It is a structured risk assessment that drives preventive action across multiple DMAIC phases.

Each failure mode is rated on three dimensions: Severity (S) — impact on the customer if the failure occurs, rated 1-10 (1=no effect, 10=hazardous without warning). Occurrence (O) — how frequently this failure mode is expected to happen, rated 1-10 (1=extremely unlikely, 10=almost certain). Detection (D) — how likely the current process is to catch this failure before it reaches the customer, rated 1-10 (1=near-certain detection, 10=no detection capability).

RPN = Severity × Occurrence × Detection (range: 1 to 1,000)

Three rules worth knowing well: (1) RPN = S × O × D — never add the three scores. Multiplication ensures that an extreme value in any one dimension creates a correspondingly extreme RPN. (2) Any failure mode with Severity ≥ 9 requires immediate action regardless of RPN — S=10, O=1, D=1 gives RPN=10, but the potential for a safety hazard demands action regardless of the low overall score. (3) To reduce RPN: reduce Occurrence (improve the process to prevent the failure) or improve Detection (add a control to catch it earlier). Severity cannot be reduced by process improvement — it is fixed by the nature of the failure and its customer impact.`,
  },

  vsm: {
    chapter: '2.1.2 — Value Stream Mapping: Seeing Waste Through the Customer\u2019s Eyes',
    text: `A standard process flowchart shows what steps exist. A Value Stream Map (VSM) shows what those steps actually deliver in terms of customer value — and where value is being destroyed. The VSM adds three layers of information a flowchart lacks: the time dimension (how long each step takes and how long material waits between steps), the inventory dimension (WIP queued at each location), and the quality dimension (first-pass yield at each step).

Takt Time and Process Cycle Efficiency (PCE) are the key metrics that anchor the VSM quantitatively. On the VSM, every process step's cycle time is compared directly against takt time: any step with a cycle time above takt time is a bottleneck.

Takt Time = Available production time / Customer demand rate. Example: 8-hour shift, 30 minutes breaks → available time = 450 minutes. Customer needs 500 units per day. Takt time = 450/500 = 0.90 minutes per unit (54 seconds). Any step with cycle time > 54 seconds is a bottleneck limiting the entire value stream.

PCE = Value-Added Time / Total Lead Time × 100%. World-class manufacturing targets PCE above 25%. Most manufacturing processes run at 5-15%. Service and administrative processes often run below 5%. A PCE of 6% means the product spends 94% of its time waiting — not being transformed. That 94% is the target for Lean improvement.`,
  },msa: {
    chapter: '2.3.3 — Gage Repeatability and Reproducibility',
    text: `Repeatability (Equipment Variation — EV) is variation when the same operator measures the same part with the same gage multiple times. A property of the equipment. Poor repeatability means the gage gives inconsistent readings even with everything else held constant. Root causes: mechanical wear, electronic noise, vibration.

Reproducibility (Appraiser Variation — AV) is variation when different operators measure the same part with the same gage. A property of the operators and measurement procedure. Poor reproducibility means different people get systematically different readings. Root causes: inconsistent technique, different holding positions, inadequate training.

Standard Crossed Gage R&R study: 3 operators × 10 parts × minimum 2 replicates per operator per part = 60 total measurements. Why minimum 2 replicates? With only 1 measurement per operator-part combination, there is no within-cell variation from which to estimate Repeatability. The study must run in random order to prevent operators remembering previous readings.

Exam note: to assess measurement system stability over time, a Control Chart on repeated reference standard measurements is the appropriate tool — a time series plot shows the data but doesn't apply statistical control limits, and a histogram shows distribution but not time-based drift.`,
  },
  'gage-rr': {
    chapter: '2.3.3 — Gage Repeatability and Reproducibility',
    text: `Repeatability (Equipment Variation — EV) is variation when the same operator measures the same part with the same gage multiple times. A property of the equipment. Poor repeatability means the gage gives inconsistent readings even with everything else held constant. Root causes: mechanical wear, electronic noise, vibration.

Reproducibility (Appraiser Variation — AV) is variation when different operators measure the same part with the same gage. A property of the operators and measurement procedure. Poor reproducibility means different people get systematically different readings. Root causes: inconsistent technique, different holding positions, inadequate training.

Standard Crossed Gage R&R study: 3 operators × 10 parts × minimum 2 replicates per operator per part = 60 total measurements. Why minimum 2 replicates? With only 1 measurement per operator-part combination, there is no within-cell variation from which to estimate Repeatability. The study must run in random order to prevent operators remembering previous readings.

Exam note: to assess measurement system stability over time, a Control Chart on repeated reference standard measurements is the appropriate tool — a time series plot shows the data but doesn't apply statistical control limits, and a histogram shows distribution but not time-based drift.`,
  },

  capability: {
    chapter: '2.4 — Process Capability: Cp and Cpk',
    text: `Cp — Potential Capability compares the specification window to the process spread, ignoring where the process is centered. Cp = 1.00: process spread equals specification window — barely acceptable if perfectly centered. Cp ≥ 1.33: standard acceptance threshold. Cp < 1.00: defects will occur even if the process is perfectly centered. Cp's critical limitation: it completely ignores centering — a Cp of 2.0 could mean zero defects (perfectly centered) or nearly all defects (shifted against one specification limit).

Cpk — Actual Capability accounts for both spread and centering by measuring the distance from the process mean to the nearest specification limit.

Cpk = minimum of [ (USL − μ) / 3σ , (μ − LSL) / 3σ ]

Cpk takes the minimum of the upper and lower indices because the nearest specification limit is where defects are most likely to occur — that is the dangerous side.

Three critical rules: Cpk ≤ Cp always (equal only when perfectly centered). Standard threshold: Cpk ≥ 1.33. A negative Cpk means the process mean is outside a specification limit — most output is defective. If Cpk < Cp by a large margin, re-centering is the improvement strategy — not variation reduction.`,
  },

  'control-chart': {
    chapter: '5.2.1 — Control Limits vs. Specification Limits',
    text: `Control limits (UCL/LCL) are calculated FROM the process data — they are statistical boundaries of common cause variation. Specification limits (USL/LSL) are set BY the customer — they are the acceptable range for the product. They measure completely different things: control limits measure STABILITY (is the process predictable?); specification limits measure CAPABILITY (is the process good enough?).

Never plot specification limits on a control chart. A process can be in statistical control (all points within UCL/LCL) while producing 100% defects if the spec limits are tighter than the control limits.

Control limits are calculated FROM process data and measure stability — a point outside them signals a special cause to investigate. Specification limits are set BY the customer and measure capability — a point outside them signals a defect to scrap or rework. Control limits typically sit at ±3σ from the process mean and change only when the process itself changes; specification limits change only when the customer changes their requirement.`,
  },
  'run-chart': {
    chapter: '5.2.1 — Control Limits vs. Specification Limits',
    text: `A run chart is the precursor to a formal control chart — it plots data over time without statistical control limits, useful for spotting obvious trends and shifts before applying the more rigorous control chart analysis.

Control limits (UCL/LCL), once you move to a full control chart, are calculated FROM the process data — they are statistical boundaries of common cause variation. This is different from specification limits (USL/LSL), which are set BY the customer as the acceptable range for the product. Control limits measure STABILITY (is the process predictable?); specification limits measure CAPABILITY (is the process good enough?). Never plot specification limits on a control chart — a process can be in statistical control while still producing defects if the spec limits are tighter than the natural process variation.`,
  },

  hypothesis: {
    chapter: '3.4.1 — Normality Testing: Before Every Other Test',
    text: `Before you choose any parametric hypothesis test, you must determine whether your data is normally distributed. This is not optional — parametric tests assume normality, and using them on non-normal data can produce misleading p-values.

The Anderson-Darling (AD) test compares your data's cumulative distribution function against the theoretical normal CDF and produces a test statistic and a p-value. H₀: data follows a normal distribution. H₁: data does not.

Decision: p > 0.05 = fail to reject H₀ = treat data as approximately normal. p ≤ 0.05 = reject H₀ = data is not normal, consider non-parametric alternatives or data transformation.

Exam note: p > 0.05 does NOT prove the data is perfectly normal. With small samples (n < 20), even substantially non-normal data may not fail the test. With large samples (n > 200), the test becomes very sensitive and may flag minor deviations as significant even when irrelevant in practice. Always combine the p-value with visual inspection of the probability plot and histogram.`,
  },anova: {
    chapter: '3.4.5 — One-Way ANOVA: Three or More Group Means',
    text: `When to use: comparing the means of three or more independent groups of continuous, approximately normal data. Examples: "Do the four production shifts produce parts with different mean dimensions?" "Do the three material suppliers produce materials with different mean tensile strength?"

Why not just run multiple t-tests? If you compare 4 groups with 6 pairwise t-tests each at α=0.05, the overall probability of at least one false positive is 1 − (0.95)⁶ = 26.5%. ANOVA controls the overall Type I error rate at α by testing all groups simultaneously.

What ANOVA actually tests: H₀: all group means are equal. H₁: at least one group mean is different. ANOVA does NOT tell you which group is different — that requires post-hoc tests. The F-ratio = between-group variance / within-group variance. A large F-ratio (small p-value) suggests real group differences.

Step-by-step: (1) Set H₀/H₁, α = 0.05. (2) Check normality for each group (Anderson-Darling). (3) Check equal variances: Bartlett's test (if data is normal) or Levene's test (robust to non-normality). (4) Run ANOVA — get F-statistic and p-value. (5) p ≤ α → reject H₀ → at least one mean differs. (6) Run a post-hoc test (Tukey's HSD) to identify which groups differ.`,
  },

  regression: {
    chapter: '3.5.1 — Scatter Plots and Correlation',
    text: `Before running regression, always plot your data. A scatter plot of Y (vertical axis) vs. X (horizontal axis) shows you the relationship visually — this is step zero in any regression analysis.

What to look for: (1) Direction — does Y tend to increase as X increases (positive) or decrease (negative)? (2) Form — is the relationship linear (points cluster around a straight line) or curved? Linear regression is only appropriate for linear relationships. (3) Strength — are points tightly clustered around the pattern or widely scattered? (4) Outliers — are there individual points that deviate dramatically from the pattern?

Pearson Correlation Coefficient (r) quantifies the strength and direction of the linear relationship between two continuous variables. Range: −1.0 to +1.0. r = +1.0: perfect positive linear relationship. r = +0.7 to +0.9: strong positive. r = +0.4 to +0.7: moderate positive. r = 0 to +0.4: weak positive. r = 0: no linear relationship (could still have a non-linear one).

r² (R-squared) = the proportion of variation in Y explained by the linear relationship with X.`,
  },
  correlation: {
    chapter: '3.5.1 — Scatter Plots and Correlation',
    text: `Before running regression, always plot your data. A scatter plot of Y (vertical axis) vs. X (horizontal axis) shows you the relationship visually — this is step zero in any regression analysis.

What to look for: (1) Direction — does Y tend to increase as X increases (positive) or decrease (negative)? (2) Form — is the relationship linear (points cluster around a straight line) or curved? Linear regression is only appropriate for linear relationships. (3) Strength — are points tightly clustered around the pattern or widely scattered? (4) Outliers — are there individual points that deviate dramatically from the pattern?

Pearson Correlation Coefficient (r) quantifies the strength and direction of the linear relationship between two continuous variables. Range: −1.0 to +1.0. r = +1.0: perfect positive linear relationship. r = +0.7 to +0.9: strong positive. r = +0.4 to +0.7: moderate positive. r = 0 to +0.4: weak positive. r = 0: no linear relationship (could still have a non-linear one).

Correlation does not imply causation. Two variables can have r=0.95 because they are both driven by a third variable — ice cream sales and drowning rates are highly correlated (both peak in summer), but ice cream does not cause drowning.`,
  },

  doe: {
    chapter: '4.3.3 / 4.4.1 — Experiment Design Considerations',
    text: `Every designed experiment requires a few key decisions before running a single trial:

Response variable (Y) — exactly what is measured, how, and with what instrument. Must have valid MSA — measurement system error should be small relative to expected factor effects.

Factors and levels — which X variables are being studied, and at what levels (high/low, coded as +1/−1). Levels must be wide enough to see effects but within a safe, feasible operating range.

Number of runs — determined by the design type (2^k full factorial, fractional, RSM). Each additional run costs time and money but provides more information.

Blocking — group runs that must be performed under the same conditions (same batch, same day, same operator) into blocks, and include the block as a factor in the analysis. This removes known nuisance variation from the error term, making it easier to see the real factor effects.

Nuisance variables — what is held constant (controlled) and what cannot be controlled (blocked or randomized over). Any uncontrolled variable that changes during the experiment can confound the results.`,
  },
};
