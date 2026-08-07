# Local project migration

Existing keys are preserved, including `sixsigmapro_projects`, `sixsigmapro_datasets_v1`, analysis/report keys, and active selections.

After authentication, Axentra detects local projects and offers an explicit import. It never deletes the local source. Each imported project receives `local_migration_key = local:<original-id>` and the database unique constraint `(organization_id, local_migration_key)` makes retries idempotent.

The import-complete marker is written only after every project succeeds. On network or permission failure, the marker is not written and the prompt offers a retry. The source remains a usable backup until cloud behavior has been verified.

Document and dataset migration should follow the project mapping returned by the project import, retaining each current schema version and structured JSON. Large dataset bodies can later move to Storage without changing consumers because dataset access is behind the repository.
