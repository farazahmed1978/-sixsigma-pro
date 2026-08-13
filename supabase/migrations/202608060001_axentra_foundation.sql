-- Aureqin migration-chain bootstrap marker.
--
-- The original migration at this timestamp defined a legacy schema using
-- organization_members, project_documents, evidence_items, and legacy dataset
-- columns. That model was superseded by the canonical project architecture in
-- 202608070001_project_architecture_hardening.sql. Restoring the legacy DDL
-- would create duplicate domain tables and competing auth-user triggers.
--
-- Keep this historical migration slot valid and side-effect-free. The next
-- migration creates the canonical foundation from an empty Supabase database.
begin;
create extension if not exists pgcrypto;
commit;
