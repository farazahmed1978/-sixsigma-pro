# Axentra database schema

Axentra uses organizations as the access boundary. Every new Auth user receives a profile, personal organization, and owner membership from the `handle_new_user` trigger. Projects belong to organizations; documents, datasets, versions, analyses, evidence, reports, execution records, and activity inherit both organization and project ownership.

Dataset metadata is stored in `datasets`; immutable payload versions are stored in `dataset_versions`. `storage_path` prepares large payloads for Supabase Storage while `structured_data` supports the initial small-dataset path.

Shared documents use the unique `(project_id, document_type)` identity, so Lean Six Sigma and PMP navigation can reference one record. Structured content remains JSONB with an explicit schema version.

RLS is enabled on every application table. Organization membership grants reads. Owners/admins/members may edit project assets; viewers are read-only. Only owners/admins manage organization-level membership and subscription data. Profiles and preferences are self-scoped.

Major application events belong in `project_activity`; tokens, credentials, raw passwords, and secrets must never be logged.
