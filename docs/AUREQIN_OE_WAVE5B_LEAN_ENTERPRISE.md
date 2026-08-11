# AUREQIN OE Wave 5B — Lean Enterprise

## Completion matrix

| Capability | Engine | Practitioner UI | Visual | Persistence/versioning | Project/report | Findings | Status / limitation |
|---|---|---|---|---|---|---|---|
| VSM current/future | Nodes, semantic links, timeline | Symbol/link authoring | SVG map | Artifact contract/revisions | Yes/Yes | Evidence-ready | PARTIAL — positioning is click/configuration based; full drag/delete/data-box editing and server repository remain |
| Waste | Eight-category contract | Map-linked vocabulary | Map evidence | Artifact field | Yes/Yes | Conditional | PARTIAL |
| Takt/capacity/constraint | Complete deterministic calculations | Guided result | Semantic output | Analysis result | Yes/Yes | Rules available | COMPLETE |
| Yamazumi/line balance | Loads, reassignment, efficiency/delay | Guided result | Data contract | Analysis result | Yes/Yes | Above-takt rule | PARTIAL — interactive stacked chart pending |
| Standard Work | Sequence/timing/WIP/takt | Guided result | Combination-sheet data | Revision contract | Yes/Yes | Deviation rule | PARTIAL — chart/location authoring pending |
| Kanban/pull/FIFO | Rounded Kanban/max-WIP engine | Guided result | Semantic output | Revision contract | Yes/Yes | Overflow rule | PARTIAL |
| Heijunka/EPEI | Pattern, changeover feasibility, EPEI | Guided result | Pattern data | Revision contract | Yes/Yes | Infeasibility | PARTIAL — box visualization pending |
| OEE/TPM | A/P/Q and six losses | Guided result | Loss data | Analysis result | Yes/Yes | Loss thresholds | COMPLETE engine/UI |
| SMED | Internal/external timeline and future reduction | Guided result | Timeline data | Revision contract | Yes/Yes | Setup rule | PARTIAL — direct resequencing UI pending |
| Jidoka/Andon | Operational status contract | Workflow guidance | Status model | Artifact contract | Yes/Yes | Recurrence | ENGINE ONLY |
| A3/Kaizen/Gemba/audit | Structured evidence architecture | Workflow guidance | N/A | Artifact/link contract | Yes/Yes | Conditional | ENGINE ONLY |
| Daily Management | Target/gap/abnormality/escalation | Guided result | Board data | Artifact contract | Yes/Yes | Miss rule | PARTIAL |
| Hoshin/X-Matrix | Relationship integrity/strength | Guided result | Matrix data | Revision contract | Yes/Yes | Coverage | PARTIAL — interactive matrix editor pending |
| Sustainment | Evidence contract | Guidance | Summary data | Artifact links | Yes/Yes | Conditional | ENGINE ONLY |

## Fictional benchmark

The fictional **Aurelia mixed-model assembly line** produces families A, B and C. Manual QA should build a current VSM, calculate takt/capacity, identify observed constraint evidence, balance stations, create a future pull state, size Kanban/FIFO, assess Heijunka/EPEI feasibility, reduce changeover with SMED, establish Standard Work, decompose OEE losses, capture an abnormality, link an A3 and Kaizen, review SQDCP metrics, connect the initiative to an X-Matrix objective, and verify sustainment evidence. No proprietary Toyota data or artwork is used.

## Remaining-gap classification

### Final practitioner-UI pass

| Previous mainstream blocker | After final pass | Practitioner evidence |
|---|---|---|
| Authenticated artifact list/save/reopen | COMPLETE | The Lean route now uses authenticated user, organization and selected project context; lists canonical type/revision/status/owner/date; supports New, Open, Save revision, Archive and `?openLean=<id>` reopening. |
| VSM visual editing | COMPLETE for mainstream map editing | SVG add/select/drag, label and process-data editor, delete, semantic connect/reconnect/type/delete, live timeline, saved revision and independent future-state clone. |
| Yamazumi visual authoring | PARTIAL | Practitioner rows are editable/reorderable and engine metrics refresh, but the presentation is not yet a true stacked station chart with takt overlay or cross-station drag targets. |
| Standard Work Combination Sheet / Chart | PARTIAL | Editable sequenced work rows persist, but the horizontal combination timeline and draggable operator-location/path chart are not implemented. |
| Heijunka box | PARTIAL | Products, demand and leveling calculations are editable/persisted, but the UI does not yet render the required product-row by pitch-column box. |
| A3 / Kaizen / Gemba / audit | COMPLETE for structured record authoring | Structured fields replace demo responses and use the common canonical record/revision repository. Evidence is captured as canonical reference fields; a relationship inspector/selector remains a gap. |
| Daily Management / Jidoka | PARTIAL | Operational fields are editable and persisted, but Daily Management is not yet a KPI board and Jidoka is not yet a visual status board. |
| X-Matrix / catchball | PARTIAL | Durable structured editing exists, but X-Matrix relationship create/delete/strength visualization is not implemented. |
| Sustainment / findings / evidence graph | NOT COMPLETE | No dedicated evidence-based sustainment evaluation, deterministic Create Finding controls, or canonical relationship inspector exists in the final UI. |

The final pass removes hard-coded calculation-only demo tabs from the routed Lean workspace. It does not classify generic structured forms as completion where a visual mainstream workflow was explicitly required.

### Final-1 production-flow visuals

| Workflow | Before | After | Practitioner evidence | Test evidence |
|---|---|---|---|---|
| Yamazumi | Editable rows; no stacked chart | COMPLETE | Proportional stacked station columns, VA/NVA elements, takt line, totals, above-takt state, drag/drop station targets, accessible station/reorder controls and live balance metrics; common save/reopen/revision shell | `LeanFlowVisuals.test.js`: rendered stations/takt, reassignment, metric changes and serialized reopen |
| Standard Work Combination Sheet | Generic work rows | COMPLETE | Original Aureqin elapsed-time visualization for manual/machine/walking/waiting, takt line, totals, category editing, add/delete/reorder, owner/effective date; shares work-element IDs with the Standard Work artifact | `LeanFlowVisuals.test.js`: rendered category tracks, authored times, totals and retained identity |
| Standard Work Chart | No location/path canvas | COMPLETE | Draggable work locations, sequence-derived movement path, rename/delete, WIP and safety/quality/start/end markers; coordinates and markers live in the same revision payload | `LeanFlowVisuals.test.js`: rendered locations/path and persisted coordinates/markers |
| Heijunka Box | Editable inputs; no box | COMPLETE | Product-family rows by pitch columns, editable production cards, demand/pack/time/changeover inputs, leveled mix, slot utilization, visible infeasibility and conditional SMED Opportunity guidance | `LeanFlowVisuals.test.js`: rendered pitch cells, slot editing, allocation and infeasibility |

### Final-2 Lean management system

| Workflow | Before | After | Practitioner evidence | Test evidence |
|---|---|---|---|---|
| Daily Management | Structured fields; no operational board | COMPLETE | Configurable category lanes and KPI cards; target rules, gap/status, periodic history trend, ownership, comments, escalation and explicit KPI-miss → canonical abnormality action | `LeanManagementVisuals.test.js`: rendered KPI creation, miss, escalation, abnormality link action, history and serialized reopen |
| Jidoka / Abnormality | Structured fields; no status board | COMPLETE | Filterable Normal/Attention/Stopped/Escalated/Contained/Closed lanes; containment, escalation, response, disposition, evidence and A3/finding references; deterministic disposition/evidence closure guard | `LeanManagementVisuals.test.js`: create, contain, escalate, respond, guarded close and persisted state |
| X-Matrix / Catchball | Structured text; no relationship visualization | COMPLETE | Four editable strategy dimensions, owners, 1/3/9 relationship lifecycle and visual lines, alignment-gap guidance; Catchball proposal/feedback/revision/agreement history with explicit agreed-target application | `LeanManagementVisuals.test.js`: entity/relationship create-edit-delete, gaps, Catchball history/agreement and serialized state |
| Sustainment | No practitioner assessment | COMPLETE | Configurable labeled defaults, saved-evidence selection/opening, deterministic Sustaining/At Risk/Not Sustained/Not Assessable result and visible rationale; explicitly not a maturity certification | `LeanManagementVisuals.test.js`: linked evidence, deterministic status/rationale, evidence opening and serialized reopen |

Closure reassessment: durable organization/project-scoped records, append-only revision snapshots, and canonical evidence links are now implemented. Migration `202608100002_lean_enterprise_records.sql` must be applied after `202608100001_product_development_records.sql`; it has not been executed. Server triggers reject project/organization mismatches, RLS uses the existing organization role model, authenticated writes bind the actor, and revision mutation/deletion is denied. No service-role browser access is introduced.

The remaining **A** gaps are visual practitioner execution: authenticated save/reopen is not yet wired into the Lean workspace; VSM drag/data-box controls, interactive Yamazumi, Standard Work Combination/Chart, Heijunka box, structured A3/Kaizen/Gemba/audit, operational Daily Management/Jidoka, and interactive X-Matrix surfaces remain incomplete. Engine contracts now support immutable VSM movement/edit/delete/reconnection and Yamazumi reassignment/edit/reorder, but engine-only capability is not counted as COMPLETE. **C** additionally includes staged migration/RLS adversarial testing; **D** includes authenticated reopening, tablet/touch review, and real print/export QA.

- **A — Mainstream blocker:** full visual VSM drag/edit/delete/data-box persistence; interactive Yamazumi; Standard Work Combination/Chart authoring; operational A3/Kaizen/Gemba/audit forms; Heijunka box; durable server repositories for Lean artifacts.
- **B — Specialist tail:** MES/Andon hardware, CMMS, ERP, advanced sequencing optimization and proprietary audit/production systems.
- **C — Validation/evidence:** independent Lean calculation fixtures and practitioner review.
- **D — UX/manual QA:** authenticated placement/report, saved artifact reopening, touch accessibility and real print/export.
