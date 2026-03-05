import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3338;
const API_BASES = {
  bitsflow: (process.env.BITSFLOW_BASE || 'https://scp-hk.bitsflow.cloud/api').replace(/\/$/, ''),
  nosla: (process.env.NOSLA_BASE || 'https://scp.nosla.cloud/api').replace(/\/$/, '')
};

const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const settingsFile = path.join(dataDir, 'settings.json');
const ENC_KEY = process.env.TOKEN_ENC_KEY || '';
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 24 * 30);
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || '';
const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY || '';
if (ENC_KEY && Buffer.from(ENC_KEY).length < 32) {
  console.warn('TOKEN_ENC_KEY is set but too short; use at least 32 bytes');
}
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify({ users: [] }, null, 2), { mode: 0o600 });
if (!fs.existsSync(settingsFile)) fs.writeFileSync(settingsFile, JSON.stringify({ captchaEnabled: false, turnstileSiteKey: '', turnstileSecret: '' }, null, 2), { mode: 0o600 });

function readUsers() {
  try { return JSON.parse(fs.readFileSync(usersFile, 'utf8')); } catch { return { users: [] }; }
}
function writeUsers(db) {
  fs.writeFileSync(usersFile, JSON.stringify(db, null, 2));
}
function readSettings() {
  try {
    const s = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    return {
      captchaEnabled: !!s.captchaEnabled,
      turnstileSiteKey: s.turnstileSiteKey || '',
      turnstileSecret: s.turnstileSecret || ''
    };
  } catch {
    return { captchaEnabled: false, turnstileSiteKey: '', turnstileSecret: '' };
  }
}
function writeSettings(s) {
  fs.writeFileSync(settingsFile, JSON.stringify(s, null, 2));
}
function getTokenEntries(user) {
  if (Array.isArray(user.tokenEntries)) {
    return user.tokenEntries.map((t) => ({
      ...t,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || t.createdAt || new Date().toISOString()
    }));
  }
  const legacy = user.tokens || {};
  const now = new Date().toISOString();
  const out = [];
  if (legacy.bitsflow) out.push({ id: crypto.randomUUID(), provider: 'bitsflow', label: 'bitsflow-1', token: legacy.bitsflow, createdAt: now, updatedAt: now });
  if (legacy.nosla) out.push({ id: crypto.randomUUID(), provider: 'nosla', label: 'nosla-1', token: legacy.nosla, createdAt: now, updatedAt: now });
  return out;
}

function pbkdf(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verify(password, stored) {
  const [salt, hash] = (stored || '').split(':');
  if (!salt || !hash) return false;
  const chk = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(chk, 'hex'));
}

const sessions = new Map();

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if ((req.headers['x-forwarded-proto'] || req.protocol) === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

function encryptToken(plain) {
  if (!plain) return '';
  if (!ENC_KEY) return plain;
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(ENC_KEY).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}
function decryptToken(stored) {
  if (!stored) return '';
  if (!stored.startsWith('enc:')) return stored;
  if (!ENC_KEY) return '';
  const [, ivHex, tagHex, dataHex] = stored.split(':');
  const key = crypto.createHash('sha256').update(ENC_KEY).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return dec.toString('utf8');
}
function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1));
  });
  return out;
}
function authUser(req) {
  const sid = parseCookies(req).bf_sid;
  if (!sid) return null;
  const sess = sessions.get(sid);
  if (!sess) return null;
  if (Date.now() > sess.expiresAt) { sessions.delete(sid); return null; }
  const db = readUsers();
  return db.users.find(u => u.username === sess.username) || null;
}
function requireAuth(req, res, next) {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  req.user = user;
  next();
}
function requireAdmin(req, res, next) {
  if (req.user?.username !== 'admin') return res.status(403).json({ error: 'admin_only' });
  next();
}
function requireSameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  if (!origin) return next();
  try {
    const o = new URL(origin);
    if (o.host !== host) return res.status(403).json({ error: 'csrf_origin_blocked' });
  } catch {
    return res.status(403).json({ error: 'csrf_origin_invalid' });
  }
  next();
}
function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const sid = parseCookies(req).bf_sid;
  const sess = sid ? sessions.get(sid) : null;
  const token = req.headers['x-csrf-token'];
  if (!sess?.csrfToken || !token || token !== sess.csrfToken) return res.status(403).json({ error: 'csrf_failed' });
  next();
}
async function verifyTurnstile(token, remoteip, secret) {
  if (!token) return false;
  if (!secret) return false;
  const body = new URLSearchParams({ secret, response: token, remoteip: remoteip || '' });
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = await r.json();
  return !!data.success;
}

app.use(requireSameOrigin);

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'bitsflow-vps-manager', bases: API_BASES });
});

app.post('/auth/register', async (req, res) => {
  const username = (req.body?.username || '').trim().toLowerCase();
  const password = req.body?.password || '';
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const settings = readSettings();
  if (settings.captchaEnabled) {
    const secret = settings.turnstileSecret || TURNSTILE_SECRET;
    const ok = await verifyTurnstile(req.body?.captchaToken || '', req.ip, secret);
    if (!ok) return res.status(400).json({ error: 'captcha_failed' });
  }
  const db = readUsers();
  if (db.users.some(u => u.username === username)) return res.status(409).json({ error: 'user exists' });
  db.users.push({ username, passwordHash: pbkdf(password), tokenEntries: [] });
  writeUsers(db);
  return res.json({ ok: true });
});

app.post('/auth/login', async (req, res) => {
  const username = (req.body?.username || '').trim().toLowerCase();
  const password = req.body?.password || '';
  const settings = readSettings();
  if (settings.captchaEnabled) {
    const secret = settings.turnstileSecret || TURNSTILE_SECRET;
    const ok = await verifyTurnstile(req.body?.captchaToken || '', req.ip, secret);
    if (!ok) return res.status(400).json({ error: 'captcha_failed' });
  }
  const db = readUsers();
  const user = db.users.find(u => u.username === username);
  if (!user || !verify(password, user.passwordHash)) return res.status(401).json({ error: 'invalid credentials' });
  const sid = crypto.randomBytes(24).toString('hex');
  sessions.set(sid, { username, expiresAt: Date.now() + SESSION_TTL_MS, csrfToken: crypto.randomBytes(24).toString('hex') });
  const secure = (process.env.COOKIE_SECURE === 'true' || req.headers['x-forwarded-proto'] === 'https') ? '; Secure' : '';
  res.setHeader('Set-Cookie', `bf_sid=${sid}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=${Math.floor(SESSION_TTL_MS/1000)}`);
  return res.json({ ok: true, username });
});

app.post('/auth/logout', (req, res) => {
  const sid = parseCookies(req).bf_sid;
  if (sid) sessions.delete(sid);
  res.setHeader('Set-Cookie', 'bf_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return res.json({ ok: true });
});

app.post('/auth/change-password', requireAuth, requireCsrf, (req, res) => {
  const oldPassword = req.body?.oldPassword || '';
  const newPassword = req.body?.newPassword || '';
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'oldPassword/newPassword required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'new password too short (min 6)' });

  const db = readUsers();
  const idx = db.users.findIndex(u => u.username === req.user.username);
  if (idx < 0) return res.status(404).json({ error: 'user missing' });
  if (!verify(oldPassword, db.users[idx].passwordHash)) return res.status(401).json({ error: 'old password incorrect' });

  db.users[idx].passwordHash = pbkdf(newPassword);
  writeUsers(db);
  return res.json({ ok: true });
});

app.get('/auth/me', (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ loggedIn: false });
  const sid = parseCookies(req).bf_sid;
  const sess = sid ? sessions.get(sid) : null;
  return res.json({ loggedIn: true, username: user.username, csrfToken: sess?.csrfToken || '' });
});

app.get('/auth/config', (req, res) => {
  const user = authUser(req);
  const settings = readSettings();
  return res.json({
    captchaEnabled: !!settings.captchaEnabled,
    turnstileSiteKey: settings.turnstileSiteKey || TURNSTILE_SITE_KEY || '',
    isAdmin: user?.username === 'admin'
  });
});

app.get('/admin/settings', requireAuth, requireAdmin, (_req, res) => {
  const settings = readSettings();
  return res.json(settings);
});

app.put('/admin/settings', requireAuth, requireAdmin, requireCsrf, (req, res) => {
  const settings = readSettings();
  settings.captchaEnabled = !!req.body?.captchaEnabled;
  if (typeof req.body?.turnstileSiteKey === 'string') settings.turnstileSiteKey = req.body.turnstileSiteKey.trim();
  if (typeof req.body?.turnstileSecret === 'string') settings.turnstileSecret = req.body.turnstileSecret.trim();
  writeSettings(settings);
  return res.json({ ok: true, settings });
});

app.get('/auth/token/:provider', requireAuth, (_req, res) => {
  return res.json({ token: '' });
});

app.put('/auth/token/:provider', requireAuth, requireCsrf, (req, res) => {
  const provider = (req.params.provider || 'bitsflow').toLowerCase();
  const token = (req.body?.token || '').trim();
  const db = readUsers();
  const idx = db.users.findIndex(u => u.username === req.user.username);
  if (idx < 0) return res.status(404).json({ error: 'user missing' });
  db.users[idx].tokenEntries = getTokenEntries(db.users[idx]);
  db.users[idx].tokenEntries = db.users[idx].tokenEntries.filter(t => t.provider !== provider);
  if (token) {
    const now = new Date().toISOString();
    db.users[idx].tokenEntries.push({ id: crypto.randomUUID(), provider, label: `${provider}-1`, token: encryptToken(token), createdAt: now, updatedAt: now });
  }
  delete db.users[idx].tokens;
  writeUsers(db);
  return res.json({ ok: true });
});

app.post('/auth/tokens', requireAuth, requireCsrf, (req, res) => {
  const provider = (req.body?.provider || '').toLowerCase();
  const token = (req.body?.token || '').trim();
  const label = (req.body?.label || '').trim();
  if (!['bitsflow', 'nosla'].includes(provider) || !token) return res.status(400).json({ error: 'provider/token required' });
  const db = readUsers();
  const idx = db.users.findIndex(u => u.username === req.user.username);
  if (idx < 0) return res.status(404).json({ error: 'user missing' });
  db.users[idx].tokenEntries = getTokenEntries(db.users[idx]);
  const n = db.users[idx].tokenEntries.filter(t => t.provider === provider).length + 1;
  const now = new Date().toISOString();
  db.users[idx].tokenEntries.push({ id: crypto.randomUUID(), provider, label: label || `${provider}-${n}`, token: encryptToken(token), createdAt: now, updatedAt: now });
  delete db.users[idx].tokens;
  writeUsers(db);
  return res.json({ ok: true });
});

app.delete('/auth/tokens/:id', requireAuth, requireCsrf, (req, res) => {
  const id = req.params.id;
  const db = readUsers();
  const idx = db.users.findIndex(u => u.username === req.user.username);
  if (idx < 0) return res.status(404).json({ error: 'user missing' });
  db.users[idx].tokenEntries = getTokenEntries(db.users[idx]).filter(t => t.id !== id);
  delete db.users[idx].tokens;
  writeUsers(db);
  return res.json({ ok: true });
});

app.patch('/auth/tokens/:id', requireAuth, requireCsrf, (req, res) => {
  const id = req.params.id;
  const label = (req.body?.label || '').trim();
  if (!label) return res.status(400).json({ error: 'label required' });
  const db = readUsers();
  const idx = db.users.findIndex(u => u.username === req.user.username);
  if (idx < 0) return res.status(404).json({ error: 'user missing' });
  db.users[idx].tokenEntries = getTokenEntries(db.users[idx]);
  const tIdx = db.users[idx].tokenEntries.findIndex(t => t.id === id);
  if (tIdx < 0) return res.status(404).json({ error: 'token missing' });
  db.users[idx].tokenEntries[tIdx].label = label;
  db.users[idx].tokenEntries[tIdx].updatedAt = new Date().toISOString();
  delete db.users[idx].tokens;
  writeUsers(db);
  return res.json({ ok: true });
});

app.get('/auth/tokens', requireAuth, (req, res) => {
  const entries = getTokenEntries(req.user).map(t => ({ id: t.id, provider: t.provider, label: t.label || '-', hasToken: !!t.token, createdAt: t.createdAt || '', updatedAt: t.updatedAt || '' }));
  return res.json({ data: entries });
});

app.use('/api/proxy', requireAuth, requireCsrf, async (req, res) => {
  try {
    const targetPath = (req.query.path || '').toString();
    if (!targetPath.startsWith('/')) return res.status(400).json({ error: 'query.path must start with /' });

    const provider = (req.headers['x-provider'] || 'bitsflow').toString().toLowerCase();
    const base = API_BASES[provider] || API_BASES.bitsflow;
    const url = `${base}${targetPath}`;

    let authorization = '';
    {
      const user = authUser(req);
      const tokenId = (req.headers['x-token-id'] || '').toString();
      const entries = user ? getTokenEntries(user) : [];
      const picked = tokenId ? entries.find(t => t.id === tokenId) : entries.find(t => t.provider === provider);
      if (picked?.token) {
        authorization = decryptToken(picked.token);
        if (!/^Bearer\s+/i.test(authorization)) authorization = `Bearer ${authorization}`;
      }
    }

    const headers = {
      'content-type': req.headers['content-type'] || 'application/json',
      'authorization': authorization,
      'x-api-key': req.headers['x-api-key'] || '',
      'accept': 'application/json,text/plain,*/*'
    };
    Object.keys(headers).forEach((k) => !headers[k] && delete headers[k]);

    const method = req.method.toUpperCase();
    const init = { method, headers };
    if (!['GET', 'HEAD'].includes(method)) init.body = JSON.stringify(req.body || {});

    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type') || 'application/json; charset=utf-8';
    res.setHeader('content-type', ct);
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: e.message || 'proxy_failed' });
  }
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => console.log(`bitsflow-vps-manager on :${PORT}`));
