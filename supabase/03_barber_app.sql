-- Supabase > SQL Editor: 02 dan KEYIN ishga tushiring
alter table public.barbershops add column if not exists sub_until date default (current_date + 7);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null, price numeric not null default 0, duration_min int not null default 30,
  created_at timestamptz not null default now());

create table if not exists public.queue (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_name text not null, phone text, service_name text, price numeric not null default 0,
  at timestamptz not null default now(), status text not null default 'kutilmoqda',
  created_at timestamptz not null default now());

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  type text not null check (type in ('kirim','chiqim')), amount numeric not null, note text,
  created_at timestamptz not null default now());

-- policy yo'q: faqat server (service_role) o'qiy va yoza oladi
alter table public.services enable row level security;
alter table public.queue enable row level security;
alter table public.transactions enable row level security;
