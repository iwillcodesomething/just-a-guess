# Just a Guess — Android + Backend

Yalnızca Android APK olarak dağıtılan günlük tahmin oyunu. Mobil ekranlar APK'nin içinde paketlenir; uygulama bir web sitesine yönlendiren kısayol değildir. Önceki web sürümü Git geçmişindeki `2df1f6ee3e8e34d645059b4f78a2d225b1a41c0b` commit'inde korunur.

## Çalışan kapsam

- Android 8+ (minSdk 26), hedef Android 15 (API 35).
- APK içinde React ekranları, Android WebViewAssetLoader ve sınırlı native HTTP köprüsü.
- ChatGPT hesabından bağımsız misafir hesabı, kullanıcı adı/parola kaydı, giriş ve çıkış.
- Misafir hesabını kaydederken tahmin geçmişini koruma.
- Her gün 3 ortak soru; ayrı, açıkça etiketli 2 antrenman sorusu.
- Sunucuda zaman sınırı, seçim/güven doğrulaması ve deterministik Brier puanı.
- Canlı Supabase Postgres veritabanı, XP, katılım serisi, rozetler ve sıralama.
- Karşılıklı onaylı arkadaşlık; uygulama içi sonuç bildirimleri.
- Şehir/tarih/eşik kurallı hava soruları, uygun maç olduğunda futbol sorusu, yönetici gündem soruları.
- Uygulama kapalı olsa da 15 dakikada bir çalışan Supabase Cron sonuç kontrolü; kaynak çağrıları 15 dakika önbellekli.
- Android Keystore ile şifrelenmiş oturum anahtarı, HTTPS bağlantısı, native dosya dışa aktarımı.
- Docker Compose, isteğe bağlı Caddy HTTPS, kalıcı disk ve tutarlı yedekleme komutu.

## Açık sınırlar

Bu sürüm imzalı bir **beta APK**'dir; Play Store release imzası değildir. Arka plan FCM/push yoktur. Android cihaz/emülatör üzerinde görsel uçtan uca test bu ortamda yapılmadı; APK derleme/imza ve HTTP entegrasyonları doğrulandı. Canlı Supabase API adresi APK'ye gömülüdür; kullanıcı sunucu kurmaz veya adres girmez. Uydurma canlı veri veya sahte rakip yoktur.

Open-Meteo sonuçları önceden tanımlı koordinat/gün için ilk alınan geçmiş-gün model kaydıdır; istasyon gözlemi olarak sunulmaz. Ücretsiz erişim kişisel ve ticari olmayan kullanım içindir; ticari yayında veri lisansı ayrıca değerlendirilmelidir. Spor verisi TheSportsDB erişimi ve kapsamına bağlıdır. Doğrulanamayan sonuç 72 saat sonra ortak iptal edilir.

## Canlı Supabase backend

- Proje: `lzqdnjrherdjfpuzhkgl` (eu-west-1).
- API: `https://lzqdnjrherdjfpuzhkgl.supabase.co/functions/v1/just-a-guess`.
- Sağlık: API adresine `/health` eklenir; gerçek Postgres sorgusu çalıştırır.
- Kod: `supabase/functions/just-a-guess/`. İş kuralları `backend/src/engine.ts` ve `game.ts` ile aynıdır; yalnızca runtime import'u Postgres adaptörüne yönelir. Ortak iş kuralları değişirse iki sürüm birlikte güncellenmelidir.
- `supabase/schema.sql` kurulan özel `jag` şemasının DDL kaydıdır; `public` tabloları korunur. Şema/tablo izinleri `anon` ve `authenticated` için kapalıdır, RLS açıktır. Politika bulunmaması kasıtlıdır: erişim yalnızca backend üzerinden, oturumun kullanıcı kimliğiyle yapılır.
- Edge Function kendi opaque bearer oturumlarını doğruladığı için gateway `verify_jwt=false` kullanır. Supabase Auth JWT'si kullanılmaz. Sağlık/kayıt/giriş dışında veri yolları geçerli oturum ister; yönetici yetkisi ayrıca kontrol edilir.
- `SUPABASE_DB_URL` yalnızca Edge Function'ın varsayılan sunucu ortamından okunur. APK'de ve repoda DB parolası veya service-role anahtarı yoktur.
- `supabase/schedule.sql`: 15 dakikalık pg_cron → pg_net → özel bakım uç noktası. Bakım anahtarı Vault'ta üretilir; API yalnızca özetini karşılaştırır. `maintenance_at` başarılı son çalışmayı kaydeder. DB ve fonksiyon aynı bölgede çağrılır.
- `supabase/hardening.sql`: mevcut auth trigger'ının RPC erişimini kapatır ve search_path'ini sabitler; pg_net uzantısını extensions şemasında kurar.
- Canlı bakım ve 15 HTTP kontrolü doğrulandı. `node scripts/test-cloud.mjs` tekrar test eder; iki geçici hesabı sonunda siler. Gerçek tahmin penceresi kapalıysa tahmin kaydı kontrolü açıkça atlanır.
- Ücretsiz planın kota ve duraklatma kuralları geçerlidir; bu sürüm ticari ölçek veya kesintisiz hizmet garantisi vermez.

## Yerel backend

Node.js 24 gerekir. Backend'in harici npm bağımlılığı yoktur.

```bash
node backend/src/server.mjs
```

API varsayılan olarak `0.0.0.0:8080` üzerinde çalışır. Veriler `backend/data/game.sqlite` altında kalır. `DATABASE_PATH`, `HOST` ve `PORT` ortam değişkenleriyle değiştirilebilir. Veritabanı, oturum anahtarları ve parolalar repoya eklenmez.

Yerel backend alternatif geliştirme ortamıdır; dağıtılan APK varsayılan olarak canlı Supabase API'sini kullanır. `JAG_API_URL` ile farklı bir HTTPS API için yeniden derlenebilir. HTTP yalnızca debug APK'de native doğrulama ile yerel ağ adreslerine açıktır.

## Docker

```bash
docker compose up -d --build
curl http://127.0.0.1:8080/health
```

Kalıcı veri `game-data` volume'ündedir. `docker compose down` verileri silmez; `down -v` siler.

Canlı sunucuda alan adının A/AAAA kaydı sunucuya yönelmeli ve 80/443 portları açık olmalı:

```bash
API_DOMAIN=api.ornek.com docker compose --profile production up -d --build
```

Docker/Caddy kendi sunucusunu kullanmak isteyenler için alternatif kurulumdur. Varsayılan canlı dağıtım Supabase üzerindedir; yalnızca JSON API sunulur.

## Yönetici hesabı

İlk kayıt olan kullanıcıya otomatik yönetici yetkisi verilmez. Supabase SQL Editor'de kayıtlı bir kullanıcı için:

```sql
INSERT INTO jag.app_settings(key,value)
SELECT 'owner',user_id FROM jag.accounts WHERE username='kullanici_adi'
ON CONFLICT(key) DO UPDATE SET value=excluded.value;
```

Alternatif Docker backend için:

```bash
docker compose exec api node backend/src/admin.mjs set-owner kullanici_adi
```

Yönetici hesabında İçerik stüdyosu açılır. Sorular gelecekteki günler için planlanır; kapanış ve sonuç zamanı sunucuda denetlenir. Gündem sonuçlarında kanıt açıklaması gerekir.

## API

| Yol | İşlem | Yetki |
| --- | --- | --- |
| `GET /health` | Servis sağlığı | Açık |
| `POST /v1/auth/guest` | Misafir oturumu | Oran sınırlı |
| `POST /v1/auth/register` | Kayıt veya misafir hesabını koruyarak yükseltme | İsteğe bağlı mevcut token |
| `POST /v1/auth/login` | Kullanıcı adı ve parola | Oran sınırlı |
| `POST /v1/auth/logout` | Mevcut oturumu iptal etme | Bearer |
| `GET /v1/auth/me` | Oturum bilgisi | Bearer |
| `GET /v1/game` | Günlük set ve kullanıcı verileri | Bearer |
| `POST /v1/game` | Tahmin, profil, arkadaşlık ve yönetici işlemleri | Bearer; yönetici işlemlerinde ek yetki |
| `GET /v1/export` | Kullanıcı verileri | Bearer |

Oturum token'ları 30 gün geçerlidir ve sunucuda yalnızca SHA-256 özetleri tutulur. Canlı backend parolaları rastgele salt ve 600.000 tur PBKDF2-SHA256 ile saklar; alternatif Node/SQLite backend scrypt kullanır. Yeni cihazda kullanıcı adı/parolayla giriş gerekir; kaydedilmemiş misafir hesabı cihaz kaybolursa kurtarılamaz. E-posta/parola sıfırlama bu sürümde yoktur.

## Test ve APK derleme

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm exec tsc --noEmit
node scripts/build-android.mjs
```

Android SDK 35 ve Java 17 gerekir. `ANDROID_HOME` SDK dizinini göstermelidir. Çıktı: `outputs/Just-a-Guess-0.3.0-beta.apk`. `JAG_API_URL=https://api.ornek.com` ile varsayılan sunucu adresi derlemeye eklenebilir; bu adres bir sır değildir. CI de aynı testleri ve APK derlemesini çalıştırır.

APK içindeki oturum token'ı React/JavaScript'e verilmez. Dış kaynak bağlantıları sistem tarayıcısında açılır; native köprü yalnızca paket içindeki içerikte kullanılır. APK yerel arayüz içerse de oyun kayıtları için backend bağlantısı gereklidir.

## Yedekleme

```bash
docker compose exec api node backend/src/backup.mjs
```

Komut SQLite `VACUUM INTO` ile tutarlı bir kopya oluşturur. Volume kaybına karşı yedekler ayrıca başka bir diske/konuma alınmalıdır. SQLite canlıyken yalnızca ana dosyayı kopyalamak WAL kayıtlarını kaçırabilir.
