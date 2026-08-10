# Project placement and cross-reference contract

Project placement is a reference layer, not a second analysis store. A completed analysis retains one canonical ID in the analysis registry. Each location in a project is represented by an `object_link`-compatible reference from that canonical artifact to a canonical project location.

## Placement identity

- `from_type` / `from_id`: canonical analysis or artifact.
- `to_type`: `project_location`.
- `to_id`: `suiteId:phaseId:workflowClusterId`.
- `relationship`: `primary_placement` for the normal project home, or `references` for a future secondary location.
- `project_id` and `organization_id`: ownership boundary used by existing RLS contracts.
- `metadata`: display labels, report inclusion/reference, dataset and version IDs, method, source workflow, creator, and timestamps. It must never contain a copied statistical result payload.

Changing or removing a placement changes only the reference. It does not recreate or delete the canonical analysis and does not implicitly change an existing report item. Report inclusion is an independent reference managed through the existing DMAIC report context.

## Future Project Management references

Future PM records should use the same object-link vocabulary without copying OE evidence:

- Quality review `references` capability analysis.
- Risk `supported_by` FMEA or a statistical finding.
- Action `responds_to` a statistical finding.

The target PM record and canonical OE artifact remain independently owned project assets. Multiple links can point to the same analysis ID, while at most one project placement should normally be marked primary for a given project.

## Compatibility

Legacy analyses without placement metadata are displayed using a non-mutating location inferred from canonical navigation metadata. Unknown or malformed locations resolve to `Project → Unfiled / General` until a practitioner classifies them. The existing Foundation-0 `object_links` schema already supports this model, so this foundation requires no database migration.
