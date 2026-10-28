-- Supabase > SQL Editor: 09 dan KEYIN ishga tushiring
alter table public.products
  add column if not exists category text,
  add column if not exists description text;
alter table public.orders
  add column if not exists note text;
