-- Optional migration: voice-related user settings
-- Run in Supabase SQL editor after reviewing.

alter table public.user_settings
  add column if not exists auto_play_ai_voice boolean not null default false;

alter table public.user_settings
  add column if not exists auto_send_voice_messages boolean not null default false;

alter table public.user_settings
  add column if not exists preferred_voice_language text not null default 'Auto';

alter table public.user_settings
  add column if not exists voice_speech_rate text not null default 'Normal';
