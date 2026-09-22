begin;
create table if not exists public.spending_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.spending_state enable row level security;
revoke all on public.spending_state from public, anon, authenticated;
grant select,insert,update on public.spending_state to authenticated;
drop policy if exists spending_select_own on public.spending_state;
create policy spending_select_own on public.spending_state for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists spending_insert_own on public.spending_state;
create policy spending_insert_own on public.spending_state for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists spending_update_own on public.spending_state;
create policy spending_update_own on public.spending_state for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists spending_owner_guard on public.spending_state;
create policy spending_owner_guard on public.spending_state as restrictive for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create or replace function public.spending_stamp() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' then new.updated_at=greatest(clock_timestamp(),old.updated_at+interval '1 microsecond');
 else new.updated_at=clock_timestamp(); end if;
 return new;
end $$;
revoke all on function public.spending_stamp() from public;
drop trigger if exists spending_stamp on public.spending_state;
create trigger spending_stamp before insert or update on public.spending_state for each row execute function public.spending_stamp();
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='spending_state') then
 alter publication supabase_realtime add table public.spending_state;
 end if;
end $$;
commit;
