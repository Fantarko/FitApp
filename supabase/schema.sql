-- =========================================================
-- FitGreen — Supabase schema
-- Run this whole file once in the Supabase SQL editor.
-- =========================================================

-- ---------------------------------------------------------
-- profiles: 1 row per auth.users, holds app-level role + display info
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  pdpa_consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- users can only update their own row, and can never change their own role
create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = 'user');

-- auto-create a profile row whenever a new auth user signs up via Google
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------
-- vs_matches: head-to-head challenges between two users
-- created before pushup_sessions because sessions can reference a match
-- ---------------------------------------------------------
create table if not exists public.vs_matches (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles (id) on delete cascade,
  opponent_id uuid references public.profiles (id) on delete cascade,
  winner_id uuid references public.profiles (id),
  invite_code text unique,                 -- shareable code/link for "ท้าเพื่อนด้วยลิงก์"
  duration_seconds int not null default 60,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed', 'cancelled', 'disputed')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.vs_matches enable row level security;

create policy "participants can view their match"
  on public.vs_matches for select
  to authenticated
  using (auth.uid() = challenger_id or auth.uid() = opponent_id);

-- allow browsing open invite-code matches so a friend can find & join via link
create policy "anyone can view a pending match by invite code"
  on public.vs_matches for select
  to authenticated
  using (status = 'pending' and invite_code is not null);

create policy "participants can update their match"
  on public.vs_matches for update
  to authenticated
  using (auth.uid() = challenger_id or auth.uid() = opponent_id);

create policy "authenticated users can create a challenge"
  on public.vs_matches for insert
  to authenticated
  with check (auth.uid() = challenger_id);


-- ---------------------------------------------------------
-- pushup_sessions: one row per completed session (daily mode or VS mode)
-- ---------------------------------------------------------
create table if not exists public.pushup_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid references public.vs_matches (id) on delete set null,  -- null = daily mode, set = counts toward a VS match
  rep_count int not null default 0,
  duration_seconds int not null default 0,
  landmark_log jsonb,        -- sampled pose landmarks, used for anti-cheat sanity checks
  created_at timestamptz not null default now()
);

alter table public.pushup_sessions enable row level security;

create policy "users manage own sessions"
  on public.pushup_sessions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- opponents in the same match need to see each other's rep counts to render a live score
create policy "match participants can view each other's match sessions"
  on public.pushup_sessions for select
  to authenticated
  using (
    match_id is not null
    and exists (
      select 1 from public.vs_matches m
      where m.id = pushup_sessions.match_id
        and (m.challenger_id = auth.uid() or m.opponent_id = auth.uid())
    )
  );

create index if not exists idx_pushup_sessions_user_created
  on public.pushup_sessions (user_id, created_at desc);

create index if not exists idx_pushup_sessions_match
  on public.pushup_sessions (match_id);

create index if not exists idx_vs_matches_challenger
  on public.vs_matches (challenger_id, created_at desc);

create index if not exists idx_vs_matches_opponent
  on public.vs_matches (opponent_id, created_at desc);


-- ---------------------------------------------------------
-- badges + user_badges: achievements (streak milestones, VS wins, etc.)
-- ---------------------------------------------------------
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- e.g. 'streak_7', 'vs_first_win'
  name_th text not null,
  description_th text,
  icon text
);

alter table public.badges enable row level security;

create policy "badges are viewable by everyone signed in"
  on public.badges for select
  to authenticated
  using (true);

-- only admins manage the badge catalog (checked in app code via profiles.role,
-- enforced here by blocking client-side writes entirely — inserts/updates go
-- through the service role from an admin-only server action)
create table if not exists public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.user_badges enable row level security;

create policy "users view their own and others' earned badges"
  on public.user_badges for select
  to authenticated
  using (true);   -- public profile pages can show "badges earned"


-- ---------------------------------------------------------
-- cheat_reports: flags raised on a session or match, reviewed by admins
-- ---------------------------------------------------------
create table if not exists public.cheat_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.pushup_sessions (id) on delete cascade,
  match_id uuid references public.vs_matches (id) on delete cascade,
  reported_by uuid not null references public.profiles (id),
  reason text not null,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'upheld', 'dismissed')),
  created_at timestamptz not null default now(),
  check (session_id is not null or match_id is not null)
);

alter table public.cheat_reports enable row level security;

create policy "users can file a report"
  on public.cheat_reports for insert
  to authenticated
  with check (auth.uid() = reported_by);

create policy "users can view reports they filed"
  on public.cheat_reports for select
  to authenticated
  using (auth.uid() = reported_by);

-- admins see everything — checked against profiles.role, not a client-supplied flag
create policy "admins can view and update all reports"
  on public.cheat_reports for all
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );


-- ---------------------------------------------------------
-- dashboard helper functions (used by the Next.js server components)
-- ---------------------------------------------------------
create or replace function public.get_today_reps(p_user_id uuid)
returns int
language sql
stable
as $$
  select coalesce(sum(rep_count), 0)::int
  from public.pushup_sessions
  where user_id = p_user_id
    and created_at::date = current_date;
$$;

create or replace function public.get_month_reps(p_user_id uuid)
returns int
language sql
stable
as $$
  select coalesce(sum(rep_count), 0)::int
  from public.pushup_sessions
  where user_id = p_user_id
    and date_trunc('month', created_at) = date_trunc('month', now());
$$;

create or replace function public.get_current_streak(p_user_id uuid)
returns int
language plpgsql
stable
as $$
declare
  streak int := 0;
  cursor_date date := current_date;
  has_today boolean;
begin
  select exists (
    select 1 from public.pushup_sessions
    where user_id = p_user_id and created_at::date = current_date
  ) into has_today;

  if not has_today then
    cursor_date := current_date - 1;
  end if;

  loop
    exit when not exists (
      select 1 from public.pushup_sessions
      where user_id = p_user_id and created_at::date = cursor_date
    );
    streak := streak + 1;
    cursor_date := cursor_date - 1;
  end loop;

  return streak;
end;
$$;

-- monthly leaderboard for the VS/ranking screen — publicly readable via RLS above
create or replace view public.v_monthly_leaderboard as
select
  p.id as user_id,
  p.display_name,
  p.avatar_url,
  coalesce(sum(s.rep_count), 0) as month_reps
from public.profiles p
left join public.pushup_sessions s
  on s.user_id = p.id
  and date_trunc('month', s.created_at) = date_trunc('month', now())
group by p.id, p.display_name, p.avatar_url
order by month_reps desc;
