# Aureqin Foundation Architecture

## Purpose and invariants

Foundation-0 introduces additive platform contracts shared by Operational Excellence, Project Management, and future suites. It does not replace current contexts or UI. Existing local-storage records continue to load, and the database migration adds rather than renames or deletes data.

Core invariants:

- Every project-scoped object carries organization and project scope.
- Suite-specific values live in extensible metadata/content, not new duplicate systems.
- Dataset versions—not only mutable datasets—are analysis inputs.
- Findings and downstream work are linked records, not copied prose.
- Validation status comes only from executable, independently verified fixtures.
- Export sources are semantic models; screenshots are render outputs, never the sole source of truth.
- Future AI retrieval occurs only after authenticated authorization/RLS filtering.

## 1. Shared object model

`src/foundation/sharedContracts.js` defines the common object envelope and adapters for Task, Milestone, Risk, Issue, Action, Approval, Resource, Cost, Benefit, KPI, Comment, Dataset, Dataset Version, Analysis, Finding, Decision, Evidence, Artifact, Report, and Activity Event.

Common fields include stable identity and scope, creator/owner, title/description, status/priority, source references, suite/methodology/lifecycle, timestamps, version, typed links, and extensible metadata. `createResource` intentionally supports person, team, machine, work center, and facility. `adaptLegacyObject` preserves existing IDs and marks origin rather than rewriting stored data.

The SQL layer keeps existing domain tables, adds common columns, and introduces only missing generic tables (`findings`, `object_links`, `analysis_dataset_versions`, `resources`, `costs`, `benefits`, `kpis`, and `comments`).

### Scope classification

- **Organization-scoped and optionally project-scoped:** Resource, Cost, Benefit, KPI, and Comment. These may exist before or outside a project; `organization_id` is required for new rows while `project_id` is nullable. A trigger verifies that an optional project belongs to the same organization.
- **Necessarily project-scoped:** Task, Milestone, Risk, Issue, Action, Approval, Dataset, Dataset Version, Analysis, Finding, Decision, Evidence, Artifact, Report, Activity Event, and Foundation-0 Object Link. Their meaning and access are anchored to a project.
- **Resource identity:** a Resource is its own domain record. It is not an `auth.users` record. `owner_id` may name the responsible user, while `resource_type` supports person, team, machine, work center, or facility. Capacity, calendar, capabilities, site, and availability are extension fields; no allocation engine is implied.

## 2. Statistical validation framework

`src/foundation/validation.js` provides recursive expected-output comparison, per-field absolute/relative tolerances, case execution, and evidence-derived method status:

- `VALIDATED`: every catalog case has independently verified expected output and passes.
- `PARTIALLY VALIDATED`: at least one verified case passes, but coverage is incomplete or another verified case fails.
- `UNVALIDATED`: no independently verified executable case exists.

Fixtures carry input, expected structured outputs, tolerances, and reference metadata. Unverified fixtures are never executed as proof. `validationCatalog.js` establishes representative entries for one-sample t, Welch two-sample t, one-way ANOVA, linear regression, and I-MR. All are currently `UNVALIDATED`; their sample inputs are scaffolding, not claimed reference results.

## 3. Dataset/version provenance

The canonical chain is:

`Project → Dataset → Dataset Version → Analysis → Finding → Action/Risk/Issue/Decision → Evidence/Artifact → Report`

Dataset records now receive a stable `versionId` when normalized. Each mutation increments the legacy numeric version and creates a new version ID. The database `dataset_versions` table gains parent-version, fingerprint, change summary, and schema metadata fields. `analysis_dataset_versions` is the authoritative many-to-many relation between an analysis and one or more immutable dataset versions; it records dataset role and enforces organization/project consistency. The legacy `analyses.dataset_version_ids` array remains a transitional cache only. Full snapshot persistence/fingerprinting remains deferred.

## 4. Analysis reproducibility

`createAnalysisMetadata` records method and method version, dataset IDs and version IDs, legacy numeric version, parameters, variable mappings, execution identity/time, result schema version, and validation status. `AnalysisContext.registerAnalysisResult` adds this contract under `reproducibility` while preserving every existing top-level field.

Legacy analyses lacking this block remain readable. Adapters can construct metadata on read without destructive migration.

## 5. Finding/action traceability

`createFinding` formalizes statistical findings, special-cause signals, capability failures, root causes, schedule variances, and threshold breaches. `createObjectLink`/`linkFindingTo` connect a finding to an Action, Risk, Issue, Decision, Evidence, Artifact, Document, or Report. The database `object_links` table supports typed, unique project-scoped relations in both directions.

Because endpoints are polymorphic (`from_type/from_id` and `to_type/to_id`), PostgreSQL cannot provide ordinary endpoint foreign keys. The domain/service layer must verify that both endpoint objects exist and belong to the link organization/project before creation. RLS and the project/organization trigger prevent unrestricted cross-organization links, but an object-link row is never authorization evidence by itself. Future AI retrieval must authorize and retrieve each endpoint independently.

No full UI workflow is included in this wave.

## 6. Activity-event model

`createActivityEvent` defines actor, organization/project scope, event type, subject type/ID, time, summary, and metadata. Metadata must not contain secrets or raw dataset content. Existing activity rows remain valid; the migration adds event/subject fields.

## 7. Export architecture

`src/foundation/exportModels.js` separates:

- Chart Model → chart renderer → SVG/PNG/PDF
- Table Model → table renderer → HTML/CSV/XLSX/DOCX
- Report Model → report renderer → print/PDF/DOCX/PPTX

`ExportRendererRegistry` provides format-specific renderer registration and capability checks. A tested SVG renderer contract proves the boundary, but existing Recharts/report UI is intentionally not rewritten. Native production SVG, DOCX, PPTX, and XLSX renderers are deferred.

## 8. Deterministic guidance

`src/foundation/guidance.js` defines versioned `StatisticalDecisionRule`, `AssumptionRule`, diagnostic results, recommendations, and next steps. Rules are plain deterministic predicates/evaluators, ordered by explicit priority and rule ID. Evaluation returns rule IDs and versions for explainability.

This is infrastructure only; it is not a complete decision tree. An LLM must never substitute for these validity rules.

## 9. Future AI authorization boundary

Required flow:

`authenticated user → authenticated client/API → RLS/authorization → permitted organization/project/object scope → retrieval → optional AI`

Forbidden flow:

`AI or browser service-role → unrestricted database → client-side filtering`

`createAuthorizedRepository` requires an authenticated session and explicit organization, project, and object scope before invoking a query. Its query implementation must use the normal authenticated client. No service-role key, RLS bypass, embedding store, or AI code is introduced.

## 10. Permission extension strategy

Current organization membership and RLS policies remain the minimum boundary. Every new SQL table enables RLS and uses the same organization-role policies as existing project objects. Optional project references are checked against row organization, and provenance links check both analysis and dataset-version scope. The object envelope leaves extension points for stricter suite/project/object policy metadata. Field-level restrictions should later be enforced server-side through views/RPCs or policy-aware services—not by hiding client fields.

## 11. Backward compatibility

- No existing table or column is deleted or renamed.
- Existing contexts retain their storage keys and top-level records.
- Dataset numeric `version` remains supported alongside `versionId`.
- The legacy analysis dataset-version ID array remains readable, while new authoritative relations use bridge rows.
- Analysis top-level fields remain supported; `reproducibility` is additive.
- Legacy adapters preserve identifiers and source metadata.
- Billing, subscriptions, entitlements, trials, auth, reports, documents, navigation, and calculators are untouched.

## 12. Migration order

For a database that already has the current production migrations, run only:

1. `supabase/migrations/202608090001_foundation_shared_contracts.sql`

For a clean database, execute in filename order:

1. `202608060001_axentra_foundation.sql`
2. `202608070001_project_architecture_hardening.sql`
3. `202608070002_aureqin_suite_entitlements.sql`
4. `202608070003_user_workspace_provisioning.sql`
5. `202608080001_billing_subscription_foundation.sql`
6. `202608080002_suite_interest_waitlist.sql`
7. `202608090001_foundation_shared_contracts.sql`

The new migration stops with an explicit prerequisite error if required project-domain tables are absent. It is idempotent where practical through `IF NOT EXISTS` and policy replacement.

## 13. Deferred work

- Independently source and review statistical expected values, then enable runners for page-local calculations.
- Extract UI-local calculators into pure versioned method modules without changing formulas.
- Persist full dataset snapshots, hashes, transformation recipes, and retention policies.
- Add finding/action UI and service synchronization.
- Build production semantic SVG/PNG/PDF/Office renderers and migrate report snapshots gradually.
- Implement the full deterministic decision/assumption rule catalog.
- Define object and field-level permission policy services.
- Add backend synchronization, concurrency controls, and event delivery.
- CPM, resource leveling, EVM, AI, embeddings, and broad statistical expansion remain outside Foundation-0.
