-- CallAI user settings (optional; for authenticated users)
-- Run this in Supabase SQL editor.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  ai_name text not null default 'SOFIA',
  preferred_language text not null default 'Auto',
  companion_mode text not null default 'Friend',
  response_style text not null default 'Balanced',
  auto_play_ai_voice boolean not null default false,
  auto_send_voice_messages boolean not null default false,
  preferred_voice_language text not null default 'Auto',
  voice_speech_rate text not null default 'Normal',
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "user_settings_upsert_own" on public.user_settings;
create policy "user_settings_upsert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

