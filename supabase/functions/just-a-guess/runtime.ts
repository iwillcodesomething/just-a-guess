import postgres from 'npm:postgres@3.4.7';

// This credential is provided by Supabase only inside the server runtime.
const client = postgres(Deno.env.get('SUPABASE_DB_URL')!, {
  prepare: false, max: 1, idle_timeout: 10, connect_timeout: 10,
  types: { integer64: { to: 20, from: [20], serialize: String, parse: Number } },
});
const tables = 'users|questions|predictions|practice|friends|app_settings|source_cache|accounts|sessions|auth_limits|explorations|ad_tickets';
export function postgresQuery(query: string) {
  const ignore = /^INSERT OR IGNORE INTO /i.test(query);
  let n = 0;
  let text = query.replace(/^INSERT OR IGNORE INTO /i, 'INSERT INTO ')
    .replace(new RegExp('\\b(FROM|JOIN|UPDATE|INTO) (' + tables + ')\\b', 'gi'), '$1 jag.$2')
    .replace(/\?/g, () => '$' + (++n));
  if (ignore) text += ' ON CONFLICT DO NOTHING';
  return text;
}
export async function query(text: string, values: any[] = []) {
  return await client.unsafe(postgresQuery(text), values);
}
function prepared(text: string, values: any[] = []) {
  return {
    text, values,
    bind(...args: any[]) { return prepared(text, args); },
    async first() { return (await query(text, values))[0] ?? null; },
    async all() { return { results: await query(text, values) }; },
    async run() { return { meta: { changes: (await query(text, values)).count } }; },
  };
}
export const env = { DB: {
  prepare: (text: string) => prepared(text),
  async batch(items: ReturnType<typeof prepared>[]) {
    return await client.begin(async tx => {
      const results = [];
      for (const item of items) results.push(await tx.unsafe(postgresQuery(item.text), item.values));
      return results;
    });
  },
} };
