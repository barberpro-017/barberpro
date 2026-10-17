-- Supabase > SQL Editor: 04 dan KEYIN ishga tushiring
alter table public.queue
  add column if not exists duration_min int default 30,
  add column if not exists note text,
  add column if not exists source text default 'barber',
  add column if not exists client_tg_id bigint;

-- bitta mijoz boti (token faqat serverda)
create table if not exists public.client_bot (
  id int primary key default 1 check (id = 1),
  bot_token text not null,
  webhook_secret text not null,
  bot_username text,
  created_at timestamptz not null default now()
);
alter table public.client_bot enable row level security;

-- mijoz botiga /start bosgan foydalanuvchilar
create table if not exists public.client_chats (
  chat_id bigint primary key,
  first_name text,
  created_at timestamptz not null default now()
);
alter table public.client_chats enable row level security;
