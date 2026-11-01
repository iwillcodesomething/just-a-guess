-- The existing auth trigger keeps working; it is not a public RPC endpoint.
ALTER FUNCTION public.handle_new_user() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;

-- pg_net was installed for this app; keep its extension metadata out of public.
-- Its private maintenance request log is transient, not application data.
DROP EXTENSION pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;
