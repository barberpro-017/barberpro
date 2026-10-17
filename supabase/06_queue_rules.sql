-- Supabase > SQL Editor: 05 dan KEYIN ishga tushiring
alter table public.queue
  add column if not exists delayed int not null default 0,
  add column if not exists rank_at timestamptz;
