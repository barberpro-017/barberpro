-- Supabase > SQL Editor: 03 dan KEYIN ishga tushiring
alter table public.payments
  add column if not exists plan text,
  add column if not exists months int,
  add column if not exists paid_at timestamptz not null default now();

-- botga /start bosgan chatlar (xabar yuborish uchun)
create table if not exists public.bot_chats (
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  chat_id bigint not null,
  created_at timestamptz not null default now(),
  primary key (barbershop_id, chat_id)
);
alter table public.bot_chats enable row level security;

-- admin analitikasi uchun o'qish ruxsati (faqat tizimga kirgan admin)
create policy "admin read services" on public.services for select to authenticated using (true);
create policy "admin read queue" on public.queue for select to authenticated using (true);
create policy "admin read transactions" on public.transactions for select to authenticated using (true);
