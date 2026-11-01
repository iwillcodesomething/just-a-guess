-- Run after deploying the Edge Function. Token stays inside Vault/Postgres.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='jag_cron_token') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'jag_cron_token','Just a Guess private maintenance credential');
  END IF;
END $$;
INSERT INTO jag.app_settings(key,value)
SELECT 'cron_hash',encode(extensions.digest(decrypted_secret,'sha256'),'hex')
FROM vault.decrypted_secrets WHERE name='jag_cron_token'
ON CONFLICT(key) DO UPDATE SET value=excluded.value;
SELECT cron.schedule('just-a-guess-maintenance','*/15 * * * *', $job$
  SELECT net.http_post(
    url:='https://lzqdnjrherdjfpuzhkgl.supabase.co/functions/v1/just-a-guess/maintenance',
    headers:=jsonb_build_object('Content-Type','application/json','x-region','eu-west-1','x-jag-cron',
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='jag_cron_token')),
    body:='{}'::jsonb,timeout_milliseconds:=60000
  );
$job$);
