-- Supabase > SQL Editor ga qo'yib Run bosing
create extension if not exists pgcrypto;

create table if not exists public.barbershops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  owner_name text,
  is_open boolean not null default false,
  rating numeric(2,1),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid references public.barbershops(id) on delete set null,
  amount numeric not null,
  status text not null default 'kutilmoqda',
  created_at timestamptz not null default now()
);

alter table public.barbershops enable row level security;
alter table public.payments enable row level security;

-- faqat tizimga kirgan admin ko'ra va o'zgartira oladi
create policy "admin barbershops" on public.barbershops for all to authenticated using (true) with check (true);
create policy "admin payments" on public.payments for all to authenticated using (true) with check (true);
