-- Mahjong Together - Supabase input hardening template
-- Run manually in Supabase SQL Editor after reviewing with your schema/state.

begin;

-- 1) Basic length constraints (defense in depth)
alter table if exists public.mahjong_tables
  drop constraint if exists mahjong_tables_title_len_chk;
alter table if exists public.mahjong_tables
  add constraint mahjong_tables_title_len_chk
  check (char_length(trim(title)) between 1 and 40);

alter table if exists public.mahjong_tables
  drop constraint if exists mahjong_tables_host_nickname_len_chk;
alter table if exists public.mahjong_tables
  add constraint mahjong_tables_host_nickname_len_chk
  check (char_length(trim(host_nickname)) between 1 and 20);

alter table if exists public.mahjong_tables
  drop constraint if exists mahjong_tables_description_len_chk;
alter table if exists public.mahjong_tables
  add constraint mahjong_tables_description_len_chk
  check (description is null or char_length(description) <= 200);

alter table if exists public.table_participants
  drop constraint if exists table_participants_nickname_len_chk;
alter table if exists public.table_participants
  add constraint table_participants_nickname_len_chk
  check (char_length(trim(nickname)) between 1 and 20);

-- 2) Keep known enum-like values safe even if table columns are text
alter table if exists public.mahjong_tables
  drop constraint if exists mahjong_tables_status_allowed_chk;
alter table if exists public.mahjong_tables
  add constraint mahjong_tables_status_allowed_chk
  check (status in ('RECRUITING', 'READY', 'CLOSED', 'CANCELLED', 'EXPIRED'));

alter table if exists public.mahjong_tables
  drop constraint if exists mahjong_tables_member_type_allowed_chk;
alter table if exists public.mahjong_tables
  add constraint mahjong_tables_member_type_allowed_chk
  check (member_type in ('THREE', 'FOUR', 'ANY'));

alter table if exists public.mahjong_tables
  drop constraint if exists mahjong_tables_game_type_allowed_chk;
alter table if exists public.mahjong_tables
  add constraint mahjong_tables_game_type_allowed_chk
  check (game_type in ('EAST', 'SOUTH', 'ANY'));

-- 3) Time consistency
alter table if exists public.mahjong_tables
  drop constraint if exists mahjong_tables_time_order_chk;
alter table if exists public.mahjong_tables
  add constraint mahjong_tables_time_order_chk
  check (end_time > start_time);

-- 4) Prevent duplicate participation by same user on same table
create unique index if not exists table_participants_table_user_uidx
  on public.table_participants (table_id, user_id);

commit;
