-- Supabase > SQL Editor: 11 dan KEYIN ishga tushiring
alter table public.barbershops add column if not exists on_break boolean not null default false;
alter table public.queue add column if not exists started_at timestamptz;
