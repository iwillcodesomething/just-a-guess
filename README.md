# Just a Guess — Android + Backend

Yalnızca Android APK olarak dağıtılan günlük tahmin oyunu. Mobil ekranlar APK'nin içinde paketlenir; uygulama bir web sitesine yönlendiren kısayol değildir. Önceki web sürümü Git geçmişindeki `2df1f6ee3e8e34d645059b4f78a2d225b1a41c0b` commit'inde korunur.

## Çalışan kapsam

- Android 8+ (minSdk 26), hedef Android 15 (API 35).
- APK içinde React ekranları, Android WebViewAssetLoader ve sınırlı native HTTP köprüsü.
- ChatGPT hesabından bağımsız misafir hesabı, kullanıcı adı/parola kaydı, giriş ve çıkış.
- Misafir hesabını kaydederken tahmin geçmişini koruma.
- Her gün 3 ortak soru; ayrı, açıkça etiketli 2 antrenman sorusu.
- Sunucuda zaman sınırı, seçim/güven doğrulaması ve deterministik Brier puanı.
- Kalıcı SQLite veritabanı, sürümlü migration'lar, XP, katılım serisi, rozetler ve sıralama.
- Karşılıklı onaylı arkadaşlık; uygulama içi sonuç bildirimleri.
- Şehir/tarih/eşik kurallı hava soruları, uygun maç olduğunda futbol sorusu, yönetici gündem soruları.
- Uygulama kapalı olsa da 5 dakikada bir çalışan sonuç kontrolü; kaynak çağrıları 15 dakika önbellekli.
- Android Keystore ile şifrelenmiş oturum anahtarı, HTTPS bağlantısı, native dosya dışa aktarımı.
- Docker Compose, isteğe bağlı Caddy HTTPS, kalıcı disk ve tutarlı yedekleme komutu.

## Açık sınırlar

Bu sürüm imzalı bir **beta APK**'dir; Play Store release imzası değildir. Arka plan FCM/push yoktur. Android cihaz/emülatör üzerinde görsel uçtan uca test bu ortamda yapılmadı; APK derleme/imza ve HTTP entegrasyonları doğrulandı. Canlı sunucu adresi verilmediği için APK'nin backend adresi kurulum ekranından ayarlanır. Uydurma canlı veri veya sahte rakip yoktur.

Open-Meteo sonuçları önceden tanımlı koordinat/gün için ilk alınan geçmiş-gün model kaydıdır; istasyon gözlemi olarak sunulmaz. Ücretsiz erişim kişisel ve ticari olmayan kullanım içindir; ticari yayında veri lisansı ayrıca değerlendirilmelidir. Spor verisi TheSportsDB erişimi ve kapsamına bağlıdır. Doğrulanamayan sonuç 72 saat sonra ortak iptal edilir.

## Yerel backend

Node.js 24 gerekir. Backend'in harici npm bağımlılığı yoktur.

```bash
node backend/src/server.mjs
```

API varsayılan olarak `0.0.0.0:8080` üzerinde çalışır. Veriler `backend/data/game.sqlite` altında kalır. `DATABASE_PATH`, `HOST` ve `PORT` ortam değişkenleriyle değiştirilebilir. Veritabanı, oturum anahtarları ve parolalar repoya eklenmez.

APK beta sürümünün **Sunucu bağlantısı** ekranına, aynı Wi-Fi ağındaki bilgisayarın `http://192.168.x.x:8080` adresi yazılabilir. Android emülatöründe `http://10.0.2.2:8080` kullanılabilir. HTTP yalnızca debug APK'de yerel test adreslerine açıktır; yayın sürümü HTTPS ister. Telefonda `localhost` bilgisayarın adresi değildir.

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

Caddy HTTPS sertifikasını yönetir. APK'ye `https://api.ornek.com` yazılır. Kullanıcıya açık bir web arayüzü sunulmaz; yalnızca JSON API vardır. Bu kurulum henüz bir uzak sunucuya uygulanmadı.

## Yönetici hesabı

İlk kayıt olan kullanıcıya otomatik yönetici yetkisi verilmez. APK'de bir hesap kaydettikten sonra sunucu operatörü atar:

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

Oturum token'ları 30 gün geçerlidir ve sunucuda yalnızca SHA-256 özetleri tutulur. Parolalar rastgele salt ile scrypt kullanılarak saklanır. Yeni cihazda kullanıcı adı/parolayla giriş gerekir; kaydedilmemiş misafir hesabı cihaz kaybolursa kurtarılamaz. E-posta/parola sıfırlama bu sürümde yoktur.

## Test ve APK derleme

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm exec tsc --noEmit
node scripts/build-android.mjs
```

Android SDK 35 ve Java 17 gerekir. `ANDROID_HOME` SDK dizinini göstermelidir. Çıktı: `outputs/Just-a-Guess-0.2.0-beta.apk`. `JAG_API_URL=https://api.ornek.com` ile varsayılan sunucu adresi derlemeye eklenebilir; bu adres bir sır değildir. CI de aynı testleri ve APK derlemesini çalıştırır.

APK içindeki oturum token'ı React/JavaScript'e verilmez. Dış kaynak bağlantıları sistem tarayıcısında açılır; native köprü yalnızca paket içindeki içerikte kullanılır. APK yerel arayüz içerse de oyun kayıtları için backend bağlantısı gereklidir.

## Yedekleme

```bash
docker compose exec api node backend/src/backup.mjs
```

Komut SQLite `VACUUM INTO` ile tutarlı bir kopya oluşturur. Volume kaybına karşı yedekler ayrıca başka bir diske/konuma alınmalıdır. SQLite canlıyken yalnızca ana dosyayı kopyalamak WAL kayıtlarını kaçırabilir.
