-- Supabase > SQL Editor: 06 dan KEYIN ishga tushiring
-- parolni ko'p marta xato kiritganlarni vaqtincha bloklash uchun
create table if not exists public.login_fails (
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  tg_id bigint not null,
  fails int not null default 0,
  locked_until timestamptz,
  primary key (barbershop_id, tg_id)
);
alter table public.login_fails enable row level security;
