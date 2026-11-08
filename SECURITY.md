# Xavfsizlik ro'yxati (BarberPro)

Hech bir tizimni 100% himoyalangan deb bo'lmaydi. Quyida nima qilingani va siz qilishingiz kerak bo'lgan ishlar.

## Kod ichida qilingan himoya
- Android: HTTPS'dan boshqa aloqa taqiqlangan, tashqi (begona) manzillarga so'rov bloklanadi, ekran yozish va skrinshot taqiqlangan,
  zaxira nusxa (backup) o'chirilgan, noma'lum havolalar bloklanadi, sertifikat xatosida ilova to'xtaydi, tapjacking himoyasi,
  release APK kodni yashiradi (R8) va debug rejimi o'chirilgan.
- Telefonda parol va token saqlanmaydi (faqat tasodifiy qurilma raqami va mijoz ismi).
- Sayt: CSP, HSTS, nosniff, clickjacking himoyasi, API javoblari keshlanmaydi.
- Server: parollar scrypt bilan shifrlanadi, 5 ta xato urinishdan so'ng bloklash, parol kamida 8 belgi (harf+raqam),
  tokenlar imzolanadi, har bir so'rovda ruxsat tekshiriladi, so'rov limitlari (navbat spami), narx serverdan olinadi.
- Baza: admin jadvallariga faqat "admin" rolidagi foydalanuvchi kira oladi; bot tokenlari va parollar faqat serverda.

## Siz qilishingiz kerak
1. Supabase > Authentication: "Allow new users to sign up" O'CHIQ bo'lsin. Parol talabi: kamida 10 belgi.
2. Admin parolini yangilang (u suhbatda yozilgan edi) va uzun, noyob parol qo'ying.
3. `supabase/11_admin_role_security.sql` ni ishga tushiring (avval `select email from auth.users;` ni tekshiring).
4. GitHub: repo PRIVATE bo'lsin, akkauntda 2-bosqichli tasdiq (2FA) yoqing. Vercel va Supabase akkauntlarida ham 2FA yoqing.
5. `SUPABASE_SERVICE_ROLE_KEY` faqat Vercel'da tursin: chatga, kodga, GitHub'ga hech qachon yozmang. Oshkor bo'lsa, Supabase'da darhol yangilang.
6. BotFather tokeni oshkor bo'lsa: BotFather'da `/revoke`, so'ng admin saytda sartaroshxonani tahrirlab yangi token kiriting.
7. APK'ni release (imzolangan) qiling: `android/README.md` dagi qadamlarni bajaring. Imzo kalitini xavfsiz joyda saqlang (yo'qolsa ilovani yangilab bo'lmaydi).
8. Vercel > Firewall: hujum paytida "Attack Challenge Mode" ni yoqing.
9. Ommaviy ishga tushirishdan oldin mustaqil xavfsizlik mutaxassisi tekshiruvi (pentest) tavsiya etiladi.

## Ma'lum cheklovlar
- Mijoz APK'sida SMS tasdiq yo'q (qurilma raqami bilan ishlaydi), shuning uchun faqat limit bilan himoyalangan.
- Sartarosh APK'sida login parolni bilgan istalgan odam kira oladi (Telegram bot bog'lanishi faqat Telegram versiyasida).
- Sertifikat pinning va root aniqlash qo'shilmagan: ular ilovani sindirib qo'yishi yoki osongina aylanib o'tilishi mumkin.
- CDN skriptlar uchun SRI (yaxlitlik tekshiruvi) qo'shilmagan; versiyalar aniq belgilangan.
