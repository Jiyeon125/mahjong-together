-- Mahjong Together - Minimum table privileges for current MVP app flow
-- Assumption: app uses anon/authenticated roles from frontend.
-- NOTE: RLS policy should still be configured separately.

begin;

-- 1) Remove dangerous / unnecessary table privileges
revoke all privileges
on table public.mahjong_tables, public.table_participants
from anon, authenticated;

-- 2) Grant only what current app flow needs
-- mahjong_tables:
-- - SELECT  : list/detail
-- - INSERT  : create table
-- - UPDATE  : close/cancel/expire/update host nickname/update status
-- - DELETE  : create rollback path when host participant insert fails
grant select, insert, update, delete
on table public.mahjong_tables
to anon, authenticated;

-- table_participants:
-- - SELECT  : list/detail/share
-- - INSERT  : join / host auto-join on create
-- - UPDATE  : nickname sync
-- - DELETE  : leave
grant select, insert, update, delete
on table public.table_participants
to anon, authenticated;

commit;

-- Verify current grants:
-- select grantee, table_name, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name in ('mahjong_tables', 'table_participants')
--   and grantee in ('anon', 'authenticated')
-- order by table_name, grantee, privilege_type;
