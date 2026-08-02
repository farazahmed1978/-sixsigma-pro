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
  },

  msa: {
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

Decision: p > 0.05 = fail to reject H₀ = treat data as approximately normal. p ≤ 0.05 = reject H₀ = data is not normal, consider non-parametric alternatives or data transformation.Exam note: p > 0.05 does NOT prove the data is perfectly normal. With small samples (n < 20), even substantially non-normal data may not fail the test. With large samples (n > 200), the test becomes very sensitive and may flag minor deviations as significant even when irrelevant in practice. Always combine the p-value with visual inspection of the probability plot and histogram.`,
  },

  anova: {
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
    text: `Why DOE beats one-factor-at-a-time (OFAT): imagine understanding whether temperature (A) and pressure (B) affect seal strength. Change A while holding B constant and you miss something — maybe A only matters when B is high. That's an interaction, and OFAT cannot find it. DOE fixes this by changing ALL factors simultaneously in a structured pattern. The ±1 coding ensures each effect is estimated independently of the others (orthogonality).

A 2^k full factorial tests k factors each at 2 levels (high: +1, low: −1). Every possible combination of factor levels is tested. Total runs = 2^k. It estimates all main effects and all interaction effects without confounding.

Every designed experiment requires a few key decisions before running a single trial: the Response variable (Y) — exactly what is measured, with valid MSA already confirmed. Factors and levels — which X variables, at what high/low settings, wide enough to see effects but within a safe operating range. Number of runs — determined by the design type; each additional run costs time and money but provides more information. Blocking — group runs that must happen under the same conditions into blocks, removing known nuisance variation from the error term. Nuisance variables — what's held constant vs. what's blocked or randomized over; any uncontrolled variable that changes during the experiment can confound the results.`,
  },

  charter: {
    chapter: '1.3.1 — Writing a Valid Problem Statement and Charter',
    text: `A Problem Statement must describe WHAT is failing, WHERE, and by HOW MUCH — never a solution and never an assumed cause. "Our sealing process has poor quality and we need better equipment" is invalid — it contains a solution, and solutions belong in Improve. The valid rewrite: "The seal burst pressure failure rate increased from 1.2% in Q1 to 4.8% in Q3. Three hospital customers have placed the facility on quality probation." Likewise, "Our team is not following the procedure correctly" assumes a root cause — root causes are confirmed in Analyze, never stated in Define. Describe the output that's failing, not the cause you suspect.

The Goal Statement must be SMART: Specific, Measurable, Achievable, Relevant, and Time-bound. Example: "Reduce the seal burst pressure failure rate from 4.8% to ≤0.5% by end of Q1 next year, as measured by end-of-line burst pressure testing at the Greenville facility."

The remaining Charter elements: Business Case (quantifies Cost of Poor Quality, states expected benefit), Project Scope (process start/end points, what's included and explicitly excluded), Primary Metric Y (baseline and target), Secondary Metrics (what must not worsen), Project Team, Timeline (tollgate dates per phase), and Champion Signature — formal authorization without which the project has no authority to pull resources or implement changes.`,
  },

  sipoc: {
    chapter: '1.2.1 — SIPOC: Defining Project Scope',
    text: `The most important use of the SIPOC is defining project scope. The first step and last step define the project boundaries — everything between them is in scope. This prevents scope creep, the tendency for projects to expand until they become unmanageable.

The correct build sequence is right to left: start with Customer and Outputs — what does the customer receive and what are the requirements? — then work leftward to Process, Inputs, and Suppliers. The diagram is read left to right but built right to left. It contains only 4-7 high-level steps — it is not a detailed flowchart.

The SIPOC vs. the X-Y Matrix: the SIPOC establishes process boundaries and surfaces candidate inputs. The X-Y Matrix then scores each of those inputs against the customer's CTQs to prioritize which ones deserve investigation in Analyze. The SIPOC feeds the X-Y Matrix — the two tools work in sequence, not as substitutes for each other.`,
  },

  voc: {
    chapter: '1.1.5 — The Four Voices: VOC, VOB, VOE, and VOP',
    text: `Before the team can define Y, it must understand what different stakeholders actually need. Lean Six Sigma distinguishes four "voices" — each capturing a different perspective.

Voice of the Customer (VOC) represents the customer's actual needs — both stated and unstated — based on real data, not internal assumptions. Unstated needs are requirements so fundamental customers assume them without saying so; failing to meet an unstated need causes catastrophic dissatisfaction even when all stated needs are met. Collection methods: customer surveys (broad reach, limited to what you think to ask), one-on-one interviews (best for uncovering unstated needs), focus groups (useful for consensus but prone to dominant-voice bias), Gemba observation (watching customers use your product in their actual environment), and complaint/warranty data.

Voice of the Business (VOB) is what the organization needs to remain viable and strategically on track — financial targets, KPIs, leadership direction. A project that perfectly satisfies customers but destroys profitability has failed the VOB.

Voice of the Employee (VOE) is what the people who actually perform the work know about barriers and quality problems — frontline employees often know a process is failing before any data confirms it.

Voice of the Process (VOP) is what the process actually delivers, expressed through data — control charts, capability indices, DPMO. The gap between VOC and VOP is the reason for the project in the first place.

A complete CTQ (Critical to Quality characteristic) has four elements: the feature being measured, a measurable attribute, a target value, and specification limits (which become the LSL/USL).`,
  },

  'data-collection': {
    chapter: '3.2.3 — Sampling Techniques and Uses',
    text: `The sampling method determines whether data truly represents the population. All sampling decisions must be made before data collection, not after.

Simple random sampling: every unit has equal probability of selection. Use when the population is homogeneous. Systematic sampling: every kth unit — fast and simple, but risky if the process has a cycle of period k, since systematic sampling may always catch the same phase. Stratified sampling: divide into subgroups (strata) by a known characteristic (shift, machine, supplier) and sample proportionally from each — this ensures all subgroups are represented rather than being missed by chance. Rational subgroups: measurements taken close together in time or space so that only common cause variation exists WITHIN the subgroup — this is the foundation of control charting, and typically requires 20-25 subgroups before setting control limits.

Confidence interval for the mean: x̄ ± t(α/2, n−1) × (s/√n). A 95% CI does not mean "95% probability the true mean is in this interval" — the true mean is fixed, it either is or isn't in your interval. The 95% refers to the reliability of the method: if you took many different random samples and built a CI from each, approximately 95% of those intervals would contain the true mean.`,
  },

  'control-plan': {
    chapter: '5.2 — Control Phase Rapid Recognition',
    text: `A working reference for what tool or response applies to a given Control-phase situation:

Control limits vs. spec limits — never equal. Control limits come from process data (stability); spec limits come from the customer (capability). n=1 per observation → I-MR chart, UCL = X̄ + 2.66×MR̄. Subgroup size 2-8 → X-bar/R chart, constants A₂/D₃/D₄ from the table for that n. Subgroup size >8 → X-bar/S chart, constants A₃/B₃/B₄. Defective units with variable sample size → P chart (variable control limits); defective units with constant sample size → NP chart (fixed limits). Defect counts with constant area → C chart, UCL = c̄ + 3√c̄; defect counts with variable area → U chart.

Need to detect a shift of about 1σ quickly? A standard Shewhart chart needs roughly 43 samples — use CuSum or EWMA instead for faster detection of small sustained shifts.

The four process states worth knowing: Ideal (in control + conforming — no action needed). Threshold (in control but producing non-conforming output — fix capability, not stability). False Security (NOT in control, but output happens to look OK right now) — this is the most dangerous state, since it looks fine while the process is actually unpredictable; find special causes immediately, don't wait for defects to show up.`,
  },

  'spc-rules': {
    chapter: '5.2.11 — WECO Special Cause Rules',
    text: `The Western Electric Company (WECO) rules provide 8 patterns that signal a special cause on a control chart. Rules 1-4 are applied most commonly in practice; every additional rule increases sensitivity to real shifts but also increases the false-alarm rate.

Rule 1 — one point beyond ±3σ: sudden large shift, a single unusual event, or measurement error. Rule 2 — 9 consecutive points on the same side of the centerline: a sustained mean shift (new process level, material lot change, operator change). Rule 3 — 6 consecutive points trending in one direction: gradual drift (tool wear, temperature build-up, gradual material depletion). Rule 4 — 14 consecutive points alternating up/down: a systematic pattern, often sampling alternating between two different process streams. Rule 5 — 2 of 3 consecutive points beyond 2σ: a moderate sustained shift toward one control limit. Rule 6 — 4 of 5 consecutive points beyond 1σ: a moderate sustained mean shift. Rule 7 — 15 consecutive points within ±1σ: a mixture of two distributions (stratification). Rule 8 — 8 consecutive points outside ±1σ (avoiding the center): a mixture, data systematically avoiding the centerline.

Every WECO signal requires investigation, documentation, identification of the assignable cause, corrective action, and documentation of the resolution. Tampering — adjusting the process every time a point moves above or below the mean without an actual signal — increases variation rather than reducing it.`,
  },
};
