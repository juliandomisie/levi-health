-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text default 'Julian',
  age integer,
  weight_kg numeric(5,2),
  height_cm numeric(5,1),
  goals text[] default '{}',
  wake_time text default '07:00',
  sleep_target text default '23:00',
  tracking_devices text[] default '{}',
  notifications_enabled boolean default false,
  push_subscription jsonb,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sleep entries
create table public.sleep_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  bedtime time,
  waketime time,
  duration_hours numeric(4,2),
  hrv integer,
  quality_score integer check (quality_score between 1 and 10),
  stages jsonb default '{}',
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Nutrition entries
create table public.nutrition_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack')),
  foods jsonb default '[]',
  macros jsonb default '{"protein":0,"carbs":0,"fat":0,"calories":0}',
  micronutrients jsonb default '{}',
  water_ml integer default 0,
  created_at timestamptz default now()
);

-- Fasting sessions
create table public.fasting_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  start_time timestamptz not null,
  end_time timestamptz,
  target_hours integer default 16,
  completed boolean default false,
  created_at timestamptz default now()
);

-- Workouts
create table public.workouts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  type text check (type in ('strength','cardio','mobility','hiit','sport','other')),
  name text,
  duration_min integer,
  metrics jsonb default '{}',
  exercises jsonb default '[]',
  notes text,
  created_at timestamptz default now()
);

-- Biomarkers
create table public.biomarkers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  marker_name text not null,
  value numeric not null,
  unit text not null,
  notes text,
  created_at timestamptz default now()
);

-- AI insights & Levi messages
create table public.levi_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text check (role in ('user','assistant')) not null,
  content text not null,
  context text,
  type text default 'chat',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Daily briefings from Levi
create table public.daily_briefings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  content text not null,
  metrics_snapshot jsonb default '{}',
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.sleep_entries enable row level security;
alter table public.nutrition_entries enable row level security;
alter table public.fasting_sessions enable row level security;
alter table public.workouts enable row level security;
alter table public.biomarkers enable row level security;
alter table public.levi_messages enable row level security;
alter table public.daily_briefings enable row level security;

-- Profiles: users can only see/edit their own
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- All other tables: same pattern
do $$
declare
  t text;
begin
  foreach t in array array['sleep_entries','nutrition_entries','fasting_sessions','workouts','biomarkers','levi_messages','daily_briefings']
  loop
    execute format('create policy "Users can manage own %s" on public.%s for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
  end loop;
end $$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Julian'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
