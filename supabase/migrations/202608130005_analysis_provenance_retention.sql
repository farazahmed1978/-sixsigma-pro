alter table public.datasets add column if not exists deleted_at timestamptz;
alter table public.dataset_versions add column if not exists source_deleted_at timestamptz;
alter table public.analyses add column if not exists provenance_status text not null default 'complete';
do $$ begin if not exists(select 1 from pg_constraint where conname='analyses_provenance_status_check' and conrelid='public.analyses'::regclass) then alter table public.analyses add constraint analyses_provenance_status_check check(provenance_status in('complete','legacy-incomplete')); end if; end $$;

update public.analyses a set provenance_status=case when cardinality(a.dataset_version_ids)>0 and jsonb_typeof(a.variable_mapping)='object' and a.variable_mapping<>'{}'::jsonb and a.executed_at is not null and not exists(select 1 from unnest(a.dataset_version_ids) version_id where not exists(select 1 from public.dataset_versions v where v.id=version_id)) then 'complete' else 'legacy-incomplete' end;

create or replace function public.aureqin_require_analysis_provenance() returns trigger language plpgsql security invoker set search_path=public as $$declare version_id uuid;begin
 if new.provenance_status='legacy-incomplete' then if tg_op='INSERT' then raise exception 'New analyses require complete canonical provenance';end if;return new;end if;
 if cardinality(new.dataset_version_ids)=0 then raise exception 'Analysis requires at least one dataset version';end if;
 if jsonb_typeof(new.variable_mapping) is distinct from 'object' or new.variable_mapping='{}'::jsonb then raise exception 'Analysis requires a canonical variable mapping';end if;
 if new.executed_at is null then raise exception 'Analysis requires an execution timestamp';end if;
 foreach version_id in array new.dataset_version_ids loop if not exists(select 1 from public.dataset_versions v where v.id=version_id and v.organization_id=new.organization_id and v.project_id=new.project_id) then raise exception 'Analysis dataset version % does not exist in the analysis scope',version_id;end if;end loop;
 new.provenance_status='complete';return new;end$$;
revoke all on function public.aureqin_require_analysis_provenance() from public;grant execute on function public.aureqin_require_analysis_provenance() to authenticated;
drop trigger if exists analyses_require_provenance on public.analyses;create trigger analyses_require_provenance before insert or update of dataset_version_ids,variable_mapping,executed_at,provenance_status on public.analyses for each row execute function public.aureqin_require_analysis_provenance();

create or replace function public.aureqin_sync_analysis_dataset_versions() returns trigger language plpgsql security definer set search_path=public as $$declare version_id uuid;begin if new.provenance_status<>'complete' then return new;end if;delete from public.analysis_dataset_versions where analysis_id=new.id;foreach version_id in array new.dataset_version_ids loop insert into public.analysis_dataset_versions(organization_id,project_id,analysis_id,dataset_version_id,dataset_role,created_by) values(new.organization_id,new.project_id,new.id,version_id,'primary',new.created_by) on conflict(analysis_id,dataset_version_id,dataset_role) do nothing;end loop;return new;end$$;
revoke all on function public.aureqin_sync_analysis_dataset_versions() from public;
drop trigger if exists analyses_sync_dataset_versions on public.analyses;create trigger analyses_sync_dataset_versions after insert or update of dataset_version_ids on public.analyses for each row execute function public.aureqin_sync_analysis_dataset_versions();

create or replace function public.aureqin_retain_dataset_provenance() returns trigger language plpgsql security invoker set search_path=public as $$begin update public.datasets set status='deleted',deleted_at=coalesce(deleted_at,now()),updated_at=now() where id=old.id;update public.dataset_versions set status='source-deleted',source_deleted_at=coalesce(source_deleted_at,now()),updated_at=now() where dataset_id=old.id;return null;end$$;
revoke all on function public.aureqin_retain_dataset_provenance() from public;grant execute on function public.aureqin_retain_dataset_provenance() to authenticated;
drop trigger if exists datasets_retain_provenance on public.datasets;create trigger datasets_retain_provenance before delete on public.datasets for each row execute function public.aureqin_retain_dataset_provenance();

insert into public.analysis_dataset_versions(organization_id,project_id,analysis_id,dataset_version_id,dataset_role,created_by) select a.organization_id,a.project_id,a.id,v.id,'primary',a.created_by from public.analyses a cross join lateral unnest(a.dataset_version_ids) ids(version_id) join public.dataset_versions v on v.id=ids.version_id where a.provenance_status='complete' on conflict(analysis_id,dataset_version_id,dataset_role) do nothing;
