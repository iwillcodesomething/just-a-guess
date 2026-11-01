import {query} from './runtime.ts';
const enc = new TextEncoder();
const hex = (bytes: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
export const digest = async (text: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
const randomHex = (size: number) => hex(crypto.getRandomValues(new Uint8Array(size)));
export function problem(message: string, status = 400): never { throw Object.assign(new Error(message), {status}); }
export async function rateLimit(key: string, max = 12, windowMs = 900000) {
  const now = Date.now();
  const [row] = await query(`INSERT INTO auth_limits(key,count,reset_at) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN jag.auth_limits.reset_at<=? THEN 1 ELSE jag.auth_limits.count+1 END,
    reset_at=CASE WHEN jag.auth_limits.reset_at<=? THEN excluded.reset_at ELSE jag.auth_limits.reset_at END RETURNING count`, [key, now + windowMs, now, now]);
  if (row.count > max) problem('Çok fazla deneme. Birkaç dakika sonra yeniden dene.', 429);
}
async function derive(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt:enc.encode(salt), iterations:600000}, key, 256));
}
async function hashPassword(password: string) {
  const salt = randomHex(16);
  return 'pbkdf2-sha256$600000$' + salt + '$' + await derive(password, salt);
}
async function verifyPassword(password: string, stored?: string) {
  const parts = (stored || 'pbkdf2-sha256$600000$00000000000000000000000000000000$' + '00'.repeat(32)).split('$');
  const value = await derive(password, parts[2]);
  let different = value.length ^ parts[3].length;
  for (let i=0;i<value.length;i++) different |= value.charCodeAt(i) ^ (parts[3].charCodeAt(i) || 0);
  return different === 0 && !!stored;
}
export async function resolveSession(token: string) {
  if (!/^jag_[A-Za-z0-9_-]{64}$/.test(token)) return null;
  return (await query('SELECT s.user_id,a.username,s.expires_at FROM sessions s JOIN accounts a ON a.user_id=s.user_id WHERE s.token_hash=? AND s.expires_at>?', [await digest(token),new Date().toISOString()]))[0] || null;
}
async function session(userId: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  const token = 'jag_' + btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const now = new Date(), expiresAt = new Date(now.getTime()+30*86400000).toISOString();
  await query('INSERT INTO sessions VALUES(?,?,?,?)', [await digest(token),userId,now.toISOString(),expiresAt]);
  return {token,expiresAt,userId};
}
export async function guest(ip: string) {
  await rateLimit('guest:'+ip,20,3600000);
  const userId = crypto.randomUUID();
  await query('INSERT INTO accounts VALUES(?,NULL,NULL,?)', [userId,new Date().toISOString()]);
  return {...await session(userId),guest:true};
}
export async function register(body: any, current: any, ip: string) {
  await rateLimit('register:'+ip,10,3600000);
  const username = String(body.username||'').trim().toLowerCase(), password = String(body.password||'');
  if(!/^[a-z0-9_]{3,24}$/.test(username)) problem('Kullanıcı adı: 3–24 küçük harf, rakam veya alt çizgi.');
  if(password.length<10||password.length>128) problem('Parolan 10–128 karakter olmalı.');
  if(current?.username) problem('Bu hesap zaten kayıtlı.');
  const passwordHash = await hashPassword(password), userId = current?.user_id || crypto.randomUUID();
  try {
    if(current) {
      const result = await query('UPDATE accounts SET username=?,password_hash=? WHERE user_id=? AND username IS NULL RETURNING user_id', [username,passwordHash,userId]);
      if (!result.length) problem('Bu hesap zaten kayıtlı.',409);
    } else await query('INSERT INTO accounts VALUES(?,?,?,?)', [userId,username,passwordHash,new Date().toISOString()]);
  } catch(e) { if(e.code==='23505') problem('Bu kullanıcı adı kullanılıyor.',409); throw e; }
  return {...await session(userId),guest:false,username};
}
export async function login(body: any, ip: string) {
  await rateLimit('login:'+ip,15);
  const username = String(body.username||'').trim().toLowerCase(), password = String(body.password||'');
  if(password.length>128) problem('Kullanıcı adı veya parola yanlış.',401);
  const account = (await query('SELECT * FROM accounts WHERE username=?',[username]))[0];
  if(!await verifyPassword(password,account?.password_hash)) problem('Kullanıcı adı veya parola yanlış.',401);
  return {...await session(account.user_id),guest:false,username};
}
export async function logout(token: string) { await query('DELETE FROM sessions WHERE token_hash=?',[await digest(token)]); }
export async function deleteAuth(id: string) { await query('DELETE FROM accounts WHERE user_id=?',[id]); }
export async function prune() {
  await query('DELETE FROM sessions WHERE expires_at<?',[new Date().toISOString()]);
  await query('DELETE FROM auth_limits WHERE reset_at<?',[Date.now()]);
  await query('DELETE FROM source_cache WHERE expires<?',[Date.now()-86400000]);
}
