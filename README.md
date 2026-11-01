# Just a Guess — Android + Backend

Yalnızca Android APK olarak dağıtılan günlük tahmin oyunu. Mobil ekranlar APK'nin içinde paketlenir; uygulama bir web sitesine yönlendiren kısayol değildir. Önceki web sürümü Git geçmişindeki `2df1f6ee3e8e34d645059b4f78a2d225b1a41c0b` commit'inde korunur.

## Çalışan kapsam

- Android 8+ (minSdk 26), hedef Android 15 (API 35); girişten itibaren durum ve navigasyon çubuklarını gizleyen immersive mode. Kenardan kaydırmayla sistem kontrolleri geçici olarak açılabilir.
- APK içinde React ekranları, Android WebViewAssetLoader ve sınırlı native HTTP köprüsü.
- ChatGPT hesabından bağımsız misafir hesabı, kullanıcı adı/parola kaydı, giriş ve çıkış.
- Misafir hesabını kaydederken tahmin geçmişini koruma.
- Her gün 3 ortak sıralama sorusu + kullanıcının seçtiği 3 kişisel tahmin, reklamlarla en fazla +3; ayrıca ayrı, açıkça etiketli 2 antrenman sorusu.
- Sunucuda zaman sınırı, seçim/güven doğrulaması ve deterministik Brier puanı.
- Canlı Supabase Postgres veritabanı, XP, katılım serisi, rozetler ve sıralama.
- Karşılıklı onaylı arkadaşlık; uygulama içi sonuç bildirimleri.
- Şehir/tarih/eşik kurallı hava soruları, uygun maç olduğunda futbol sorusu, yönetici gündem soruları.
- Uygulama kapalı olsa da 15 dakikada bir çalışan Supabase Cron sonuç kontrolü; kaynak çağrıları 15 dakika önbellekli.
- Android Keystore ile şifrelenmiş oturum anahtarı, HTTPS bağlantısı, native dosya dışa aktarımı.
- Docker Compose, isteğe bağlı Caddy HTTPS, kalıcı disk ve tutarlı yedekleme komutu.

## 0.6.0 — Günlük ek haklar ve sonuç sunumu

- Her gün 3 ücretsiz kişisel tahmin. İsteğe bağlı ek hak reklamlarıyla en fazla +3; günlük toplam kişisel sınır 6. Ortak 3 sıralama sorusu ayrıdır.
- Her ek hak turunun reklam hedefi sunucuda eşit olasılıkla 1, 2 veya 3 seçilir. Hedef ve ilerleme reklam açılmadan önce gösterilir; yenilemek hedefi değiştirmez. Son tamamlanmış reklam bir ek hak verir, sonraki tur için yeni hedef seçilir. Üç ek hak en fazla 9 tamamlanmış reklam gerektirir. Erken kapatma ilerleme sağlamaz. Düzenleme ve tema reklamları bu ayrı ek hak ilerlemesine sayılmaz.
- `daily_ad_progress` satırı kullanıcı + Türkiye takvim günü bazındadır. Günlük bonus 3, kişisel slot 6, tamamlanmış ek hak reklamı 9 üst sınırı DB kısıtları ve aynı transaction içindeki tek kullanımlık reklam tüketimiyle korunur. Aynı callback/istek tekrar edilince ikinci hak verilmez. Kullanılmayan haklar ve kısmi ilerleme ertesi güne devretmez; sıfırlama Europe/Istanbul 00.00.
- Ortak ve kişisel her tahminde toplam yalnızca 1 değişiklik. İlk kayıt düzenleme sayılmaz; aynı verinin ağ tekrarı da yeni düzenleme değildir. Sunucu ve DB `edits<=1` koşulu uygular. Değişiklikten sonra arayüz salt görüntüleme sunar, ikinci düzenleme için yeni reklam açmaz. Önceki sürümde kullanılmış düzenlemeler migration sırasında korunur.
- Doğru sonuçlarda ayrı, tek seferlik 10 taban XP bonusu: x0 %40, x1 %35, x2 %15, x5 %8, x10 %2. Yanlış sonuçta ek XP yoktur. `result_bonuses` kullanıcı/soru/kapsam benzersizliği tekrar açmada yeni çekilişi engeller. Bonus XP seviyeyi etkiler; Brier puanı, doğruluk ve liderlik sırasını etkilemez. Nakit/hediye değeri veya transfer özelliği yoktur.
- Büyük bonuslar için belirgin sayaç, konfeti ve ayarlara bağlı kısa ses/titreşim eklenmiştir. Hareket azaltma tercihi konfeti/animasyonu kapatır. Doğrulanmış sonuçlar yapay olarak bekletilmez; bonus açılışındaki 650 ms geçiş yalnızca sunumdur.
- Yanlış sayısal tahminlerde yalnızca kaynağın gerçek ölçümü ve eşikten mutlak fark gösterilir. Yanlış tahmin doğruymuş veya sahte bir “near-miss”miş gibi sunulmaz.
- Seri her gün en az bir ortak veya kişisel tahminle sürer; tam bir gün atlanırsa sıfırlanır. Otomatik haftalık mola kaldırılmıştır. Önceki puanlar/XP/geçmiş silinmez.
- Haftalık sıra gerçekten değiştiğinde uygulama içinde bildirim oluşur; hayali rakip/geçilme mesajı yoktur. Bildirim, açık uygulamadaki veri yenilemesine bağlıdır; FCM/push eklendiği iddia edilmez. Son 10 sıra bildirimi cihazda, kullanıcı kodu ve hafta bazında tutulur.

## 0.5.0 — Ödüllü reklamlar ve eksik veri akışları

- Google Mobile Ads SDK `25.5.0` ve UMP `4.0.0` native Android'e eklendi. Dağıtılan beta Google'ın resmi **test reklam kimliklerini** kullanır; gerçek gelir üretmez.
- İlk tahmin ücretsizdir. Günlük veya kişisel tahminin seçimini/güvenini değiştirmek için 1 tamamlanmış ödüllü reklam gerekir. Reklam erken kapatılır veya yüklenemezse mevcut tahmin korunur. Bir ödül yalnızca ilgili kullanıcı ve tahminde, kapanıştan önce bir kez kullanılabilir; ödül isteği 15 dakika geçerlidir. Reklam puan formülünü değiştirmez.
- Profilde ve 3 ortak tahmin tamamlandıktan sonra isteğe bağlı reklam karşılığında 24 saatlik Aurora teması açılır. Reklam reddedilirse normal ilk tahmin yapma, geçmiş ve sonuç görüntüleme devam eder.
- Native `onUserEarnedReward` callback'i ve kapanış durumu birlikte kullanılır. Test ortamında sunucunun `complete-test` yolu test callback'ini kabul eder; **production modunda bu yol 403 döner**. Gerçek reklam ödülleri için Google ECDSA imzalı SSV gerekir. Test ortamı reklam sahteciliğine karşı bir production güvenlik sınırı olarak sunulmaz.
- Döviz: 1/3/7/14/30/90 gün; kripto: 1/4/24 saat ve 3/7/14/30 gün; hava, kültür ve otomatik olaylar: 30 güne kadar hedef gün. Hedef gün seçenekleri bir aralığın toplamı değildir; karttaki kesin tarih ve ölçüm kuralı geçerlidir. Spor vadesini maçın ilan edilmiş tarihi belirler.
- Süper Lig (`4339`) ve TFF 1. Lig (`4676`) Türkiye futbol seçiminde önceliklidir. Tek bir sonraki maçın başlamış olmasına bakıp listeyi boşaltmak yerine mevcut ve sonraki 3 haftanın round fikstürleri birleştirilir, tekrarlı ve başlamış maçlar elenir. Kaynak hatasında kısmi kapsam açıkça belirtilir.
- Günlük olaylarda editöre bağımlı boş ekran kaldırıldı: USGS dünya M4,5+ kayıt sayısı, USGS Türkiye çevresi M3,0+ kayıt sayısı ve NOAA günlük maksimum Kp soruları otomatik oluşturulur. Bunlar deprem erken uyarısı veya geleceği bilme iddiası değildir. Türkiye çevresi sorusu ülke sınırı yerine açıkça tanımlanan koordinat kutusunu kullanır.
- Yeni `ad_tickets` tablosu özel şemadadır. Tek kullanımlık tüketim ve tahmin güncellemesi aynı transaction içinde yapılır. Reklam gerekliliği yalnızca arayüzde değil sunucuda da uygulanır. Hesap silme reklam kayıtlarını da siler.

### Gerçek reklama geçiş

Bu sürüm kullanıcı tarafından seçilen **test modu** ile hazırlanmıştır. Canlı gelir için:

1. AdMob'da Android uygulaması ve rewarded ad unit oluştur; gizlilik mesajlarını UMP için yapılandır. Hedef kitlenin yaş/gizlilik gerekliliklerini belirle ve gerekli politika beyanlarını tamamla.
2. Derlemeyi `JAG_ADS_MODE=production`, `JAG_ADMOB_APP_ID` ve `JAG_ADMOB_REWARDED_UNIT` ile yap. Varsayılan test kimlikleriyle production derlemesi reddedilir. Bu kimlikler public yapılandırmadır; DB veya service-role sırrı içermez.
3. Backend `jag.app_settings` içindeki `ads_rewarded_unit` değerini aynı rewarded unit ID'ye, `ads_mode` değerini `production` yap. Bilinmeyen mod değeri reklamı kapatır.
4. AdMob rewarded unit SSV callback adresi: `https://lzqdnjrherdjfpuzhkgl.supabase.co/functions/v1/just-a-guess/v1/ads/ssv`. Native SDK server-side custom_data alanına sunucunun ürettiği ticket UUID'sini koyar.
5. Google'ın SSV test aracında imzalı callback'i, gerçek Android test cihazında UMP/ödül/erken kapatma/sunucu gecikmesi akışlarını doğrula. İmzalar yalnızca Google'ın sabit HTTPS anahtar servisinden alınan public key'lerle doğrulanır; transaction_id tekrar kullanılamaz.

Production modunda kullanıcı gizlilik tercihi UMP üzerinden alınır, `canRequestAds` izin vermeden reklam yüklenmez; profil ekranında gizlilik seçeneklerine erişim vardır. Reklam talebi kişiselleştirilmemiştir ve reklam içerik derecesi G ile sınırlanır. Test modunda AdMob'un demo app/unit kimlikleri kullanılır; production modunun onay akışı test modu tarafından taklit edilmez.

Reklam birimi doluluğu ve sideload dağıtımındaki reklam uygunluğu Google'a bağlıdır; SDK entegrasyonu gelir veya her istekte reklam garantisi değildir. Kaynaklar: https://developers.google.com/admob/android/rewarded , https://developers.google.com/admob/android/ssv , https://developers.google.com/admob/android/privacy .

## 0.4.0 — Keşfet

| Alan | Seçim akışı | Gerçek kaynak / yenileme |
| --- | --- | --- |
| Hava | 250 ülke → 3.864 il/eyalet/bölge → şehir araması → 8 ölçüm → 1–30 gün → eşik | GeoNames dizini, Open-Meteo Geocoding ve hava modeli. Güncel gösterge 120 sn; modelin kendi üretim sıklığı geçerlidir. |
| Spor | Futbol, basketbol, voleybol, buz hokeyi, beyzbol, Amerikan futbolu, hentbol, ragbi → ülke → lig → yaklaşan maç → sonuç/toplam skor (futbolda iki takım golü de var) | TheSportsDB. Maç listesi 90 sn; ücretsiz kaynak ülke başına en fazla 10 lig, gelecek dört haftanın fikstürleri birleştirilir. Kesintisiz canlı skor servisi değildir. |
| Kripto | Aktif USD paritesi → 1 saat–30 gün sonrası → yükseliş veya mutlak yüzde hareket | Coinbase Exchange. Test anında 405 uygun parite; liste dinamiktir. Gösterge 30 sn, sunucu fiyat önbelleği 20 sn. Sonuç sabit hedef dakikanın mum kapanışıyla hesaplanır. |
| Döviz | 30 baz/karşıt para birimi → 1–90 gün sonraki hafta içi ECB referans kuru | Frankfurter v2 / ECB. 15 dk kontrol önbelleği; asıl kaynak günlük yayımlanır. Hedef günün kaydı yoksa eski tarih sonuç diye kullanılmaz. |
| Kültür | 8 Wikipedia dili → en çok okunanlar veya müzik/sinema/spor/teknoloji/bilim/tarih → konu → görüntülenme eşiği | Wikimedia Analytics. Günlük UTC sayfa görüntülenmesi; yayın gecikmesi açıkça gösterilir. Sosyal medya veya Google Trends verisi olarak sunulmaz. |
| Günlük olaylar | Editörün yayımladığı kaynaklı olay → evet/hayır | Mevcut içerik stüdyosu. Otomatik USGS/NOAA olayları ve yayımlandıkça editör kayıtları birlikte gösterilir. |

Kişisel tahminler ayrı `jag.explorations` tablosunda saklanır. `(user_id,day,slot)` benzersizliği ve 1–6 slot kontrolü eşzamanlı isteklerde dahi günlük sınırı korur. Önizleme 10 dakika geçerlidir ve sunucuda ilgili kullanıcıya bağlıdır; istemcinin gönderdiği koordinat, kural veya başlangıç fiyatına güvenilmez. Düzenleme sorunun kapanışında biter. Kişisel puanlar genel sıralama veya ortak soru XP'sine eklenmez; katılım günleri seriye, ayrı sonuç bonusları XP'ye eklenir; Keşfet ve Tahminlerim ekranlarında ayrı listelenir. Silme/dışa aktarma kişisel tahminleri de kapsar.

Hava soruları seçilen şehrin IANA saat dilimini kullanır. Kripto hedefi sabit bir 1 dakikalık mum, döviz hedefi sabit bir referans tarihi, Wikipedia hedefi sabit bir UTC günüdür. Sonradan değişen anlık değerle geçmiş tahmin sonuçlandırılmaz. Kaynak erişilemezse beklenir; ilan edilen kontrol zamanından 72 saat sonra iptal edilir.

Otomatik yenileme yalnızca ilgili ekran görünürken çalışır. Verinin kaynak zamanı ile uygulamanın kontrol zamanı ayrıdır. Bağlantı kesilirse eski gösterge açıkça işaretlenir; yeni tahmin önizlemesi için güncel doğrulama gerekir. Coğrafya dizini paket içindeki 2026-11-01 GeoNames anlık görüntüsüdür; konum ayrıntıları seçim sırasında API'den alınır. Atıf: `backend/data-assets/NOTICE.md`.

`POST /v1/explore` oturum ister. `kind`: categories, countries, regions, cities, leagues, matches, coins, articles, events, quote, preview. Tahmin kaydı `POST /v1/game` / `action: explore-predict` ile yapılır. API anahtarı veya keyfi URL kabul edilmez; sağlayıcı hostları ve ölçümler sunucuda sabittir.

## Gelir ve ödül sınırları

Bu beta resmi Google test reklamları gösterir; production yayıncı kimlikleri henüz eklenmediği için gelir üretmez. Ödül yalnızca bir tahmin düzenlemesi veya 24 saatlik, hesaba bağlı profil temasıdır. Para, kripto, hediye kartı, çekiliş ve paraya çevrilen puan yoktur. Ödül ve gereken izleme, kullanıcı reklamı açmadan önce açıklanır. Politika: https://support.google.com/admob/answer/7313578 .

Türkiye'de yalnızca “para yatırılmıyor” gerekçesiyle kesin piyango/şans oyunu kapsamı dışında olduğu söylenemez. Para, hediye, çekiliş veya ekonomik değere çevrilen puan eklenmeden önce yetkin hukukçu / gerektiğinde MPI değerlendirmesi alınmalıdır: https://www.mpi.gov.tr/lottery .

## Açık sınırlar

Bu sürüm imzalı bir **beta APK**'dir; Play Store release imzası değildir. Arka plan FCM/push yoktur. Android cihaz/emülatör üzerinde görsel uçtan uca test bu ortamda yapılmadı; APK derleme/imza ve HTTP entegrasyonları doğrulandı. Canlı Supabase API adresi APK'ye gömülüdür; kullanıcı sunucu kurmaz veya adres girmez. Uydurma canlı veri veya sahte rakip yoktur.

Open-Meteo sonuçları önceden tanımlı koordinat/gün için ilk alınan geçmiş-gün model kaydıdır; istasyon gözlemi olarak sunulmaz. Ücretsiz erişim kişisel ve ticari olmayan kullanım içindir; ticari yayında veri lisansı ayrıca değerlendirilmelidir. Spor verisi TheSportsDB erişimi ve kapsamına bağlıdır. Doğrulanamayan sonuç 72 saat sonra ortak iptal edilir.

## Canlı Supabase backend

- Proje: `lzqdnjrherdjfpuzhkgl` (eu-west-1).
- API: `https://lzqdnjrherdjfpuzhkgl.supabase.co/functions/v1/just-a-guess`.
- Sağlık: API adresine `/health` eklenir; gerçek Postgres sorgusu çalıştırır.
- Kod: `supabase/functions/just-a-guess/`. İş kuralları `backend/src` ile ortaktır. `node scripts/sync-cloud.mjs` dört çekirdek modülü ve coğrafya dizinini eşitler; CI `--check` ile sapmayı engeller.
- `supabase/schema.sql` ilk kurulan özel `jag` şemasının, `supabase/exploration-schema.sql` kişisel tahmin tablosunun DDL kaydıdır; ek haklar ve sonuç XP’si için `daily-rewards-schema.sql` ve `result-bonuses-schema.sql` eklenmiştir; `public` tabloları korunur. Şema/tablo izinleri `anon` ve `authenticated` için kapalıdır, RLS açıktır. Politika bulunmaması kasıtlıdır: erişim yalnızca backend üzerinden, oturumun kullanıcı kimliğiyle yapılır.
- Edge Function kendi opaque bearer oturumlarını doğruladığı için gateway `verify_jwt=false` kullanır. Supabase Auth JWT'si kullanılmaz. Sağlık/kayıt/giriş dışında veri yolları geçerli oturum ister; yönetici yetkisi ayrıca kontrol edilir.
- `SUPABASE_DB_URL` yalnızca Edge Function'ın varsayılan sunucu ortamından okunur. APK'de ve repoda DB parolası veya service-role anahtarı yoktur.
- `supabase/schedule.sql`: 15 dakikalık pg_cron → pg_net → özel bakım uç noktası. Bakım anahtarı Vault'ta üretilir; API yalnızca özetini karşılaştırır. `maintenance_at` başarılı son çalışmayı kaydeder. DB ve fonksiyon aynı bölgede çağrılır.
- `supabase/hardening.sql`: mevcut auth trigger'ının RPC erişimini kapatır ve search_path'ini sabitler; pg_net uzantısını extensions şemasında kurar.
- Canlı bakım, ilk sürümün 15 HTTP kontrolü ve yeni Keşfet akışının 14 HTTP kontrolü doğrulandı. `node scripts/test-cloud.mjs` ve `node scripts/test-cloud-explore.mjs` tekrar test eder; oluşturduğu geçici hesapları sonunda siler. Gerçek tahmin penceresi kapalıysa tahmin kaydı kontrolü açıkça atlanır.
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
node scripts/sync-cloud.mjs --check
# Chromium/Google Chrome kuruluysa telefon/tablet akış testi:
node scripts/test-ui.mjs
pnpm exec tsc --noEmit
node scripts/build-android.mjs
```

Android SDK 35 ve Java 17 gerekir. `ANDROID_HOME` SDK dizinini göstermelidir. Çıktı: `outputs/Just-a-Guess-0.6.0-beta.apk`. `JAG_API_URL=https://api.ornek.com` ile varsayılan sunucu adresi derlemeye eklenebilir; bu adres bir sır değildir. CI de aynı testleri ve APK derlemesini çalıştırır.

APK içindeki oturum token'ı React/JavaScript'e verilmez. Dış kaynak bağlantıları sistem tarayıcısında açılır; native köprü yalnızca paket içindeki içerikte kullanılır. APK yerel arayüz içerse de oyun kayıtları için backend bağlantısı gereklidir.

## Yedekleme

```bash
docker compose exec api node backend/src/backup.mjs
```

Komut SQLite `VACUUM INTO` ile tutarlı bir kopya oluşturur. Volume kaybına karşı yedekler ayrıca başka bir diske/konuma alınmalıdır. SQLite canlıyken yalnızca ana dosyayı kopyalamak WAL kayıtlarını kaçırabilir.
