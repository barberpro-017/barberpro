-- Supabase > SQL Editor: 08 dan KEYIN ishga tushiring
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  image_url text,
  created_at timestamptz not null default now()
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  items jsonb not null,
  total numeric not null,
  status text not null default 'yangi',
  delivery_at timestamptz,
  seen_by_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;
alter table public.orders enable row level security;
create policy "admin products" on public.products for all to authenticated using (true) with check (true);
create policy "admin orders" on public.orders for all to authenticated using (true) with check (true);

-- mahsulot rasmlari uchun ochiq bucket (yuklash faqat admin)
insert into storage.buckets (id, name, public) values ('products', 'products', true) on conflict (id) do nothing;
create policy "admin upload products" on storage.objects for insert to authenticated with check (bucket_id = 'products');
create policy "admin update products" on storage.objects for update to authenticated using (bucket_id = 'products');
create policy "admin delete products" on storage.objects for delete to authenticated using (bucket_id = 'products');
