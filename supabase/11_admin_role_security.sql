-- Supabase > SQL Editor: 10 dan KEYIN ishga tushiring.
-- Maqsad: bazaga FAQAT "admin" rolidagi foydalanuvchi kira olsin
-- (hatto kimdir ro'yxatdan o'tib olsa ham ma'lumotlarni ko'ra olmasin).

-- 0) AVVAL TEKSHIRING (alohida ishga tushiring): faqat sizning admin emailingiz chiqishi kerak
-- select email from auth.users;

-- 1) Admin foydalanuvchiga rol belgilash
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb;

create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

-- 2) Jadvallar siyosatlari
drop policy if exists "admin barbershops" on public.barbershops;
create policy "admin barbershops" on public.barbershops for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin payments" on public.payments;
create policy "admin payments" on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin products" on public.products;
create policy "admin products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin orders" on public.orders;
create policy "admin orders" on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin read services" on public.services;
create policy "admin read services" on public.services for select to authenticated using (public.is_admin());
drop policy if exists "admin read queue" on public.queue;
create policy "admin read queue" on public.queue for select to authenticated using (public.is_admin());
drop policy if exists "admin read transactions" on public.transactions;
create policy "admin read transactions" on public.transactions for select to authenticated using (public.is_admin());

-- 3) Rasmlar ombori (yuklash/o'zgartirish/o'chirish faqat admin)
drop policy if exists "admin upload products" on storage.objects;
create policy "admin upload products" on storage.objects for insert to authenticated with check (bucket_id = 'products' and public.is_admin());
drop policy if exists "admin update products" on storage.objects;
create policy "admin update products" on storage.objects for update to authenticated using (bucket_id = 'products' and public.is_admin());
drop policy if exists "admin delete products" on storage.objects;
create policy "admin delete products" on storage.objects for delete to authenticated using (bucket_id = 'products' and public.is_admin());

-- Shundan so'ng admin saytdan chiqib, QAYTA KIRING (rol yangi sessiyada kuchga kiradi).
-- Agar kirgandan keyin ma'lumotlar ko'rinmasa, quyidagi ORQAGA QAYTARISH kodini ishga tushiring:
--   create or replace function public.is_admin() returns boolean language sql stable as $$ select true $$;
