# AUREQIN OE Wave 5A — Product Development Closure

## Completion matrix

| Capability | Before closure | After closure | UI / persistence | Project / report | Validation / limitation |
|---|---|---|---|---|---|
| Requirement records | PARTIAL | COMPLETE | Authenticated project-scoped CRUD, search, archive and revision history | Structured placement/report payload | Workflow capability; not statistical |
| CTQ records | PARTIAL | COMPLETE | Editable specifications, owners, methods, requirement links and warnings | Structured placement/report payload | No silent revision overwrite |
| Verification plan | PARTIAL | COMPLETE | Create, duplicate, edit, reorder value, filter and execute | Structured matrix payload | Not a LIMS or PM schedule |
| Verification state model | PARTIAL | COMPLETE | Guarded Draft → Planned → Ready → execution/result transitions | Status retained | PASS requires rationale, canonical evidence and saved analysis |
| Evidence relationships | PARTIAL | COMPLETE | Canonical object links; saved evidence opens result/document/report route | Independent Project/Report behavior | Relationship is not authorization evidence |
| Traceability | PARTIAL | COMPLETE | Requirement → CTQ → risk → test → evidence → result → finding matrix | Semantic table | Flags every missing/failed/open relationship |
| Findings | ENGINE ONLY | COMPLETE | Dedicated condition-gated Create Finding from verification execution | Provenance retained; no PM task | Corrective-action workflow remains future PM integration |
| Pilot readiness | PARTIAL | COMPLETE | Ready / At Risk / Not Ready / Not Assessable with evidence counts | Semantic summary | Not formal release authorization |
| Configurable analytics | PARTIAL | COMPLETE | Editable structured authoring for PB, Taguchi, mixture, Monte Carlo, stack, TOST and sample size | Existing canonical actions | New numerical methods remain UNVALIDATED |
| Plackett-Burman | COMPLETE | COMPLETE | Editable factors/runs/seed configuration | Yes / Yes | 4/8/12 designs; no pure-error inference without replication |
| Taguchi | COMPLETE | COMPLETE | Editable array, factors, levels, objective and responses | Yes / Yes | L4/L8/L9; specialist arrays deferred |
| Mixture DOE | COMPLETE | COMPLETE | Editable components, total, design, model and responses | Yes / Yes | Extreme vertices/mixture-process deferred |
| Monte Carlo | COMPLETE | COMPLETE | Editable inputs, units, distributions, parameters, expression, specs, count and seed | Yes / Yes | Safe expressions; synchronous cap 200,000 |
| Tolerance stack | COMPLETE | COMPLETE | Editable contributors, directions, tolerances, units and CTQ specs | Yes / Yes | RSS assumptions disclosed |
| Authorization | MISSING | COMPLETE | Authenticated user plus organization/project guards, RLS and scope triggers | N/A | Object links never grant access |
| Legacy handling | PARTIAL | COMPLETE | Safe normalizers accept old local/demo shapes without treating them as persisted evidence | N/A | Demo records require explicit save |

## Persistence architecture

Migration `202608100001_product_development_records.sql` is additive and must run after `202608090001_foundation_shared_contracts.sql`. It creates organization/project-scoped requirements, CTQs, verifications and immutable revision rows. Canonical evidence uses the existing `object_links` table. RLS uses `axentra_org_role`; authenticated members can author, while deletion is restricted to admin/owner. Project/organization triggers reject cross-scope writes. The migration was created but not executed.

## Orion X1 authenticated QA scenario

The Orion X1 sealed board connector is fictional and contains no proprietary information.

1. Sign in, select the Orion X1 project, and create `REQ-001` for insertion force.
2. Create `CTQ-001`, unit N, target 25, LSL 20 and USL 30; link it to `REQ-001`.
3. Change USL to 28 N with rationale and verify the revision shows prior/new values.
4. Link existing DFMEA risk `DFMEA-001` through project risk identity.
5. Configure an eight-run Plackett-Burman screen for geometry, resin, plating and preload; save the result.
6. Configure Taguchi/RSM evidence and a Monte Carlo/tolerance stack with real units and specifications.
7. Create `DV-001`, define sample, equipment, conditions, measurement system and acceptance criterion.
8. Move it Draft → Planned → Ready → In Progress.
9. Attach the saved screening/capability analysis by canonical ID and use Open Evidence to reopen the saved result.
10. Enter observed rationale and confirm PASS remains blocked until evidence and analysis are attached.
11. If the criterion fails, record Failed and create a verification finding; confirm the matrix shows Open Finding.
12. Attach Wave 4 reliability-demonstration/life-data evidence to the reliability verification.
13. Review traceability flags and the deterministic pilot-readiness state.
14. Add selected requirement/verification/readiness summaries independently to Project and Report.
15. Reopen saved evidence from Binder and print/export the assembled authenticated report.

## Stopping-rule classification

- **A — Mainstream blocker:** none identified after migration deployment and authenticated QA.
- **B — Specialist tail:** PLM baselines/e-signatures, full LIMS execution, advanced Taguchi arrays, extreme-vertices mixtures, mixture-process modeling and specialist standards.
- **C — Validation/evidence:** all Wave 5A numerical engines remain UNVALIDATED pending independent fixtures and review.
- **D — UX/manual QA:** migration deployment, authenticated RLS exercise, browser accessibility/responsiveness, four placement/report states and real multi-page print/export.
