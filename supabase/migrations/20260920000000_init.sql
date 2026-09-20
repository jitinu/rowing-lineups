-- Rowing lineup builder: schema, constraints, and row-level security.

create type public.rigging_side as enum ('port', 'starboard', 'both');
create type public.session_slot as enum ('AM', 'PM');
create type public.seat_name as enum ('bow', '2', '3', '4', '5', '6', '7', 'stroke', 'cox');
create type public.availability_status as enum ('out', 'limited');

-- Coaches map 1:1 to auth users. Only rows in this table grant write access.
create table public.coaches (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.rowers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  side public.rigging_side not null default 'both',
  weight_kg numeric(5, 1),
  class_year smallint,
  is_coxswain boolean not null default false,
  active boolean not null default true,
  squad text,
  can_steer boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  slot public.session_slot not null,
  title text,
  created_by uuid references public.coaches (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (session_date, slot)
);

create table public.lineups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  is_primary boolean not null default false,
  notes text,
  created_by uuid references public.coaches (id) on delete set null,
  created_at timestamptz not null default now()
);
create index lineups_session_idx on public.lineups (session_id, position);
-- At most one primary lineup per session.
create unique index lineups_one_primary_idx on public.lineups (session_id) where is_primary;

create table public.seat_assignments (
  id uuid primary key default gen_random_uuid(),
  lineup_id uuid not null references public.lineups (id) on delete cascade,
  boat_number smallint not null check (boat_number between 1 and 4),
  seat public.seat_name not null,
  rower_id uuid not null references public.rowers (id) on delete cascade,
  unique (lineup_id, boat_number, seat)
);
create index seat_assignments_lineup_idx on public.seat_assignments (lineup_id);

create table public.boat_config (
  id uuid primary key default gen_random_uuid(),
  lineup_id uuid not null references public.lineups (id) on delete cascade,
  boat_number smallint not null check (boat_number between 1 and 4),
  name text,
  rigging jsonb,
  workout_notes text,
  unique (lineup_id, boat_number)
);

create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  coach_id uuid not null references public.coaches (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, coach_id)
);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  rower_id uuid not null references public.rowers (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  status public.availability_status not null,
  reason text,
  unique (rower_id, session_id)
);

create table public.lineup_changes (
  id uuid primary key default gen_random_uuid(),
  lineup_id uuid not null references public.lineups (id) on delete cascade,
  coach_id uuid references public.coaches (id) on delete set null,
  change jsonb not null,
  created_at timestamptz not null default now()
);

-- Helpers ------------------------------------------------------------------

create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.coaches where id = auth.uid());
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger session_notes_touch
  before update on public.session_notes
  for each row execute function public.touch_updated_at();

-- Clone a lineup (assignments and boat config) into the same session and return the new id.
create or replace function public.clone_lineup(source_lineup_id uuid, new_name text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  src public.lineups%rowtype;
  next_position integer;
  new_id uuid;
begin
  select * into src from public.lineups where id = source_lineup_id;
  if not found then
    raise exception 'lineup not found';
  end if;
  select coalesce(max(position), -1) + 1 into next_position
    from public.lineups where session_id = src.session_id;
  insert into public.lineups (session_id, name, position, is_primary, created_by)
    values (src.session_id, new_name, next_position, false, auth.uid())
    returning id into new_id;
  insert into public.seat_assignments (lineup_id, boat_number, seat, rower_id)
    select new_id, boat_number, seat, rower_id from public.seat_assignments where lineup_id = source_lineup_id;
  insert into public.boat_config (lineup_id, boat_number, name, rigging, workout_notes)
    select new_id, boat_number, name, rigging, workout_notes from public.boat_config where lineup_id = source_lineup_id;
  return new_id;
end;
$$;

-- Mark a lineup primary and clear the flag on its siblings in one statement.
create or replace function public.set_primary_lineup(target_lineup_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  sid uuid;
begin
  select session_id into sid from public.lineups where id = target_lineup_id;
  if sid is null then
    raise exception 'lineup not found';
  end if;
  update public.lineups set is_primary = false where session_id = sid and is_primary and id <> target_lineup_id;
  update public.lineups set is_primary = true where id = target_lineup_id;
end;
$$;

-- Seat a rower. If the rower already sits elsewhere in the lineup they are moved;
-- if the target seat is occupied the occupant takes the rower's old seat (a swap)
-- or is unseated when the rower came from the roster.
create or replace function public.assign_seat(
  p_lineup_id uuid, p_rower_id uuid, p_boat smallint, p_seat public.seat_name
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  old_boat smallint;
  old_seat public.seat_name;
  occupant uuid;
begin
  select boat_number, seat into old_boat, old_seat
    from public.seat_assignments where lineup_id = p_lineup_id and rower_id = p_rower_id limit 1;
  if old_boat = p_boat and old_seat = p_seat then
    return;
  end if;
  select rower_id into occupant
    from public.seat_assignments where lineup_id = p_lineup_id and boat_number = p_boat and seat = p_seat;

  delete from public.seat_assignments where lineup_id = p_lineup_id and rower_id = p_rower_id;
  delete from public.seat_assignments where lineup_id = p_lineup_id and boat_number = p_boat and seat = p_seat;

  insert into public.seat_assignments (lineup_id, boat_number, seat, rower_id)
    values (p_lineup_id, p_boat, p_seat, p_rower_id);
  if occupant is not null and old_boat is not null then
    insert into public.seat_assignments (lineup_id, boat_number, seat, rower_id)
      values (p_lineup_id, old_boat, old_seat, occupant);
  end if;

  insert into public.lineup_changes (lineup_id, coach_id, change)
    values (p_lineup_id, auth.uid(), jsonb_build_object(
      'type', 'assign', 'rower_id', p_rower_id, 'boat', p_boat, 'seat', p_seat,
      'from_boat', old_boat, 'from_seat', old_seat, 'displaced', occupant));
end;
$$;

create or replace function public.unassign_seat(p_lineup_id uuid, p_rower_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.seat_assignments where lineup_id = p_lineup_id and rower_id = p_rower_id;
  insert into public.lineup_changes (lineup_id, coach_id, change)
    values (p_lineup_id, auth.uid(), jsonb_build_object('type', 'unassign', 'rower_id', p_rower_id));
end;
$$;

-- Row-level security ---------------------------------------------------------

alter table public.coaches enable row level security;
alter table public.rowers enable row level security;
alter table public.sessions enable row level security;
alter table public.lineups enable row level security;
alter table public.seat_assignments enable row level security;
alter table public.boat_config enable row level security;
alter table public.session_notes enable row level security;
alter table public.availability enable row level security;
alter table public.lineup_changes enable row level security;

-- Everyone (including anonymous share-link visitors) can read.
create policy "read coaches" on public.coaches for select using (true);
create policy "read rowers" on public.rowers for select using (true);
create policy "read sessions" on public.sessions for select using (true);
create policy "read lineups" on public.lineups for select using (true);
create policy "read seat_assignments" on public.seat_assignments for select using (true);
create policy "read boat_config" on public.boat_config for select using (true);
create policy "read session_notes" on public.session_notes for select using (true);
create policy "read availability" on public.availability for select using (true);
create policy "read lineup_changes" on public.lineup_changes for select using (true);

-- Coaches can write shared data.
create policy "coach write rowers" on public.rowers for all to authenticated
  using (public.is_coach()) with check (public.is_coach());
create policy "coach write sessions" on public.sessions for all to authenticated
  using (public.is_coach()) with check (public.is_coach());
create policy "coach write lineups" on public.lineups for all to authenticated
  using (public.is_coach()) with check (public.is_coach());
create policy "coach write seat_assignments" on public.seat_assignments for all to authenticated
  using (public.is_coach()) with check (public.is_coach());
create policy "coach write boat_config" on public.boat_config for all to authenticated
  using (public.is_coach()) with check (public.is_coach());
create policy "coach write availability" on public.availability for all to authenticated
  using (public.is_coach()) with check (public.is_coach());
create policy "coach write lineup_changes" on public.lineup_changes for insert to authenticated
  with check (public.is_coach());

-- A coach edits only their own note. Coach rows themselves are managed by an admin (service role).
create policy "coach insert own note" on public.session_notes for insert to authenticated
  with check (public.is_coach() and coach_id = auth.uid());
create policy "coach update own note" on public.session_notes for update to authenticated
  using (public.is_coach() and coach_id = auth.uid())
  with check (public.is_coach() and coach_id = auth.uid());
create policy "coach delete own note" on public.session_notes for delete to authenticated
  using (public.is_coach() and coach_id = auth.uid());
create policy "coach update own profile" on public.coaches for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.is_coach() to anon, authenticated;
grant execute on function public.clone_lineup(uuid, text) to authenticated;
grant execute on function public.set_primary_lineup(uuid) to authenticated;
grant execute on function public.assign_seat(uuid, uuid, smallint, public.seat_name) to authenticated;
grant execute on function public.unassign_seat(uuid, uuid) to authenticated;
