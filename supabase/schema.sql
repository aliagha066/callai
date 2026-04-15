-- CallAI chat persistence (authenticated users only)
-- Run this in Supabase SQL editor.

-- 1) Chats
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New Chat',
  created_at timestamptz not null default now()
);

-- 2) Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists chats_user_id_created_at_idx
  on public.chats (user_id, created_at desc);

create index if not exists messages_chat_id_created_at_idx
  on public.messages (chat_id, created_at asc);

-- Enable Row Level Security
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- RLS policies: users can only access their own chats/messages
drop policy if exists "chats_select_own" on public.chats;
create policy "chats_select_own" on public.chats
  for select using (auth.uid() = user_id);

drop policy if exists "chats_insert_own" on public.chats;
create policy "chats_insert_own" on public.chats
  for insert with check (auth.uid() = user_id);

drop policy if exists "chats_update_own" on public.chats;
create policy "chats_update_own" on public.chats
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chats_delete_own" on public.chats;
create policy "chats_delete_own" on public.chats
  for delete using (auth.uid() = user_id);

drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own" on public.messages
  for select using (
    exists (
      select 1 from public.chats c
      where c.id = messages.chat_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages
  for insert with check (
    exists (
      select 1 from public.chats c
      where c.id = messages.chat_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages
  for delete using (
    exists (
      select 1 from public.chats c
      where c.id = messages.chat_id and c.user_id = auth.uid()
    )
  );

