-- Repeatable setup. Does not delete existing rows.
begin;
create table if not exists public.my_week_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.my_week_state enable row level security;
revoke all on table public.my_week_state from public, anon;
revoke all on table public.my_week_state from authenticated;
grant select, insert, update on table public.my_week_state to authenticated;
drop policy if exists my_week_select_own on public.my_week_state;
create policy my_week_select_own on public.my_week_state for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists my_week_insert_own on public.my_week_state;
create policy my_week_insert_own on public.my_week_state for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists my_week_update_own on public.my_week_state;
create policy my_week_update_own on public.my_week_state for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists my_week_owner_guard on public.my_week_state;
create policy my_week_owner_guard on public.my_week_state as restrictive for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create or replace function public.my_week_stamp() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' then new.updated_at=greatest(clock_timestamp(),old.updated_at+interval '1 microsecond');
 else new.updated_at=clock_timestamp(); end if;
 return new;
end $$;
revoke all on function public.my_week_stamp() from public;
drop trigger if exists my_week_stamp on public.my_week_state;
create trigger my_week_stamp before insert or update on public.my_week_state for each row execute function public.my_week_stamp();
do $$ begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
  raise exception 'Enable the supabase_realtime publication first';
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='my_week_state') then
  alter publication supabase_realtime add table public.my_week_state;
 end if;
end $$;
commit;
