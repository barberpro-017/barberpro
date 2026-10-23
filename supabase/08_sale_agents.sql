-- Supabase > SQL Editor: 07 dan KEYIN ishga tushiring
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  login text unique not null,
  password_hash text not null,
  agent_code text unique not null,
  created_at timestamptz not null default now()
);
-- policy yo'q: agentlar jadvaliga faqat server (service_role) kira oladi
alter table public.agents enable row level security;

alter table public.barbershops
  add column if not exists agent_id uuid references public.agents(id) on delete set null,
  add column if not exists agent_code text;

-- agent parolini ko'p marta xato kiritganlarni vaqtincha bloklash
create table if not exists public.agent_login_fails (
  login text primary key,
  fails int not null default 0,
  locked_until timestamptz
);
alter table public.agent_login_fails enable row level security;
