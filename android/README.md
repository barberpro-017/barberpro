# Android ilovalar (BarberPro)

- `barber/` : BarberPro Sartarosh
- `client/` : BarberPro Mijoz

APK'ni GitHub o'zi yig'adi: repo > Actions > "Build Android APKs" > Run workflow.
Tugagach ish ichidagi Artifacts bo'limidan `barber-apk` va `client-apk` ni yuklab oling.
Sayt manzili `app/src/main/res/values/strings.xml` ichidagi `app_url` da (domen o'zgarsa shu yerda almashtiring).

## Xavfsiz (release) APK olish
1. GitHub: repo > Actions > **Imzo kalitini yaratish (bir marta)** > Run workflow.
2. Tugagach **signing-key-SAQLAB-OLIB-OCHIRING** artifactini yuklab oling (ichida `keystore.b64` va `secrets.txt`).
3. Repo > Settings > Secrets and variables > Actions > New repository secret orqali 4 ta secret qo'shing:
   `KEYSTORE_BASE64` (keystore.b64 ichidagi butun matn), `KEYSTORE_PASSWORD`, `KEY_PASSWORD`, `KEY_ALIAS` (secrets.txt dagi qiymatlar).
4. `keystore.b64` va `secrets.txt` ni PAROL MENEJERIDA saqlab qo'ying, so'ng artifact va workflow ishini o'chiring. Repo private bo'lsin.
5. **Build Android APKs** ni qayta ishga tushiring: endi imzolangan, kodi yashirilgan release APK chiqadi.
Skrinshot taqiqini vaqtincha o'chirish (xatoni suratga olish uchun): `app/src/main/res/values/bools.xml` da `secure_screen` ni `false` qiling.
