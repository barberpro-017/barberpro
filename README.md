# m-barberPro Admin
Statik sayt (index.html) + Supabase. Vercel'da build kerak emas.

## Supabase sozlash
1. SQL Editor: `supabase/schema.sql` ni ishga tushiring.
2. Authentication > Users > Add user: email `imradjabov@barber.uz`, parol o'zingiznikini kiriting, "Auto Confirm User" belgilang.
3. Authentication > Sign In / Providers: "Allow new users to sign up" ni O'CHIRING (begonalar ro'yxatdan o'tolmasin).
4. Email provider'da "Confirm email" ni o'chiring (admin settings orqali login almashtirish ishlashi uchun).

## Deploy
GitHub repo'ga fayllarni yuklang, Vercel avtomatik deploy qiladi.
