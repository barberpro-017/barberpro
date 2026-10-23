# m-barberPro Admin
Statik sayt (index.html) + Supabase. Vercel'da build kerak emas.

## Supabase sozlash
1. SQL Editor: `supabase/schema.sql` ni ishga tushiring.
2. Authentication > Users > Add user: email `imradjabov@barber.uz`, parol o'zingiznikini kiriting, "Auto Confirm User" belgilang.
3. Authentication > Sign In / Providers: "Allow new users to sign up" ni O'CHIRING (begonalar ro'yxatdan o'tolmasin).
4. Email provider'da "Confirm email" ni o'chiring (admin settings orqali login almashtirish ishlashi uchun).

## Deploy
GitHub repo'ga fayllarni yuklang, Vercel avtomatik deploy qiladi.

## Yangilanish (sartaroshxona qo'shish)
1. SQL Editor: `supabase/02_barbershops_update.sql` ni ishga tushiring.
2. Vercel > Settings > Environment Variables: `SUPABASE_URL` (loyiha URL'i) va `SUPABASE_SERVICE_ROLE_KEY` (Supabase > Settings > API > service_role). Bu kalit FAQAT Vercel'da turadi, hech kimga yubormang.
3. Redeploy qiling.

## Sartarosh mini app
- `/barber/` — sartarosh paneli (login: admin saytda yaratilgan bot logini/paroli).
- SQL Editor: `supabase/03_barber_app.sql` ni ishga tushiring.

## Admin yangilanishi
- SQL Editor: `supabase/04_admin_update.sql` ni ishga tushiring.

## Mijoz boti
- SQL Editor: `supabase/05_client_bot.sql` ni ishga tushiring.
- Admin saytda Client bot bo'limiga BotFather tokenini kiriting.
- Mijoz ilovasi: `/client/`

## Yangilanish (ish holati, kechikish qoidasi)
- SQL Editor: `supabase/06_queue_rules.sql` ni ishga tushiring.

## Xavfsizlik yangilanishi
- SQL Editor: `supabase/07_security.sql` ni ishga tushiring.
- Har bir sartarosh `/start` ni o'z botida bir marta bosishi kerak (yangi ilova havolasi shunda o'rnatiladi).

## Sale agents
- SQL Editor: `supabase/08_sale_agents.sql` ni ishga tushiring.
- Admin saytda Sale agents bo'limidan agent qo'shiladi (login, parol, agent code).
- `favicon.svg` — sayt tabidagi belgi.
