-- Supabase > SQL Editor: schema.sql dan KEYIN ishga tushiring
alter table public.barbershops
  add column if not exists barber_name text,
  add column if not exists login text unique,
  add column if not exists password_hash text,
  add column if not exists bot_username text unique;

-- bot tokenlari alohida jadvalda; policy yo'q = faqat server (service_role) o'qiy oladi
create table if not exists public.barbershop_secrets (
  barbershop_id uuid primary key references public.barbershops(id) on delete cascade,
  bot_token text not null,
  webhook_secret text not null
);
alter table public.barbershop_secrets enable row level security;
