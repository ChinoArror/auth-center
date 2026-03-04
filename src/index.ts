import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { cors } from 'hono/cors';
import { hashPassword, generateSalt, verifyPassword, generateJWT, verifyJWT } from './auth';
import { getCookie, setCookie } from 'hono/cookie';

type Bindings = {
  DB: D1Database;
  ANALYTICS: AnalyticsEngineDataset;
  ASSETS: Fetcher;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

// --- Public Routes ---

// Login
app.post('/login', async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password) {
    return c.json({ error: 'Username and password required' }, 400);
  }

  let userToAuth: any = null;

  if (username === c.env.ADMIN_USERNAME && password === c.env.ADMIN_PASSWORD) {
    userToAuth = {
      uuid: 'admin',
      user_id: 0,
      name: 'Admin',
      username: username,
      status: 'active',
      cookie_expiry_days: 7
    };
  } else if (username === c.env.ADMIN_USERNAME) {
    return c.json({ error: 'Invalid credentials' }, 401);
  } else {
    const user: any = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    if (user.status === 'paused') {
      return c.json({ error: 'Account is paused' }, 403);
    }

    const isValid = await verifyPassword(password, user.password_salt, user.password_hash);
    if (!isValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    userToAuth = user;
  }

  const payload = {
    uuid: userToAuth.uuid,
    user_id: userToAuth.user_id,
    name: userToAuth.name,
    username: userToAuth.username,
    status: userToAuth.status
  };

  const token = await generateJWT(payload, c.env.JWT_SECRET, userToAuth.cookie_expiry_days);

  setCookie(c, 'sso_session', token, {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: userToAuth.cookie_expiry_days * 86400
  });

  return c.json({
    token: token,
    jwt: token,
    uuid: userToAuth.uuid,
    user_id: userToAuth.user_id,
    name: userToAuth.name,
    username: userToAuth.username,
    timestamp: Math.floor(Date.now() / 1000)
  });
});

// Logout
app.post('/api/logout', async (c) => {
  setCookie(c, 'sso_session', '', { path: '/', maxAge: 0, secure: true, httpOnly: true, sameSite: 'Lax' });
  return c.json({ success: true });
});

app.get('/logout', async (c) => {
  setCookie(c, 'sso_session', '', { path: '/', maxAge: 0, secure: true, httpOnly: true, sameSite: 'Lax' });
  const redirect = c.req.query('redirect');
  if (redirect) return c.redirect(redirect);
  return c.json({ success: true, message: 'Logged out successfully' });
});

// Check Active SSO Session
app.get('/api/session', async (c) => {
  const token = getCookie(c, 'sso_session');
  if (!token) return c.json({ active: false }, 401);
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (payload.uuid === 'admin') return c.json({ active: true, user: payload, token });
    const user: any = await c.env.DB.prepare('SELECT status FROM users WHERE uuid = ?').bind(payload.uuid).first();
    if (!user || user.status !== 'active') return c.json({ active: false }, 401);
    return c.json({ active: true, user: payload, token });
  } catch (e) {
    return c.json({ active: false }, 401);
  }
});

// Verify Token & App Permission
app.get('/api/verify', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid token' }, 401);
  }

  const token = authHeader.split(' ')[1];
  const appId = c.req.query('app_id');

  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);

    if (payload.uuid === 'admin') {
      return c.json({ valid: true, user: payload });
    }

    // Check if user is active in DB (crucial for pause/continue)
    const user: any = await c.env.DB.prepare('SELECT status FROM users WHERE uuid = ?').bind(payload.uuid).first();
    if (!user || user.status !== 'active') {
      return c.json({ error: 'User is paused or not found' }, 403);
    }

    // Check app permission if app_id is provided
    if (appId) {
      const permission = await c.env.DB.prepare('SELECT * FROM user_apps WHERE uuid = ? AND app_id = ?')
        .bind(payload.uuid, appId).first();
      if (!permission) {
        return c.json({ error: 'No permission for this app' }, 403);
      }
    }

    return c.json({ valid: true, user: payload });
  } catch (e) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});

// Track Analytics
app.post('/api/track', async (c) => {
  const { app_id, uuid, event_type, duration_seconds } = await c.req.json();

  if (!app_id || !uuid || !event_type) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const country = c.req.raw.cf?.country || 'Unknown';
  const userAgent = c.req.header('User-Agent') || '';

  let deviceType = 'Desktop';
  if (/Mobile|Android|iP(hone|od|ad)/i.test(userAgent)) {
    deviceType = 'Mobile';
  }

  let browser = 'Other';
  if (/Chrome/i.test(userAgent)) browser = 'Chrome';
  else if (/Safari/i.test(userAgent)) browser = 'Safari';
  else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/Edge/i.test(userAgent)) browser = 'Edge';

  // Write to Analytics Engine
  c.env.ANALYTICS.writeDataPoint({
    blobs: [app_id, uuid, event_type, country as string, deviceType, browser],
    doubles: [duration_seconds || 0],
    indexes: [app_id]
  });

  return c.json({ success: true });
});

// Self-service password change
app.post('/api/users/:uuid/change-password', async (c) => {
  const uuid = c.req.param('uuid');
  const { oldPassword, newPassword } = await c.req.json();

  const user: any = await c.env.DB.prepare('SELECT password_hash, password_salt FROM users WHERE uuid = ?').bind(uuid).first();
  if (!user) return c.json({ error: 'User not found' }, 404);

  const isValid = await verifyPassword(oldPassword, user.password_salt, user.password_hash);
  if (!isValid) return c.json({ error: 'Incorrect original password' }, 401);

  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);

  await c.env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, password_plain = ? WHERE uuid = ?').bind(newHash, newSalt, newPassword, uuid).run();

  return c.json({ success: true });
});


// --- Admin Routes ---

// Apply basic auth to all /admin/* routes
app.use('/admin/*', async (c, next) => {
  const auth = basicAuth({
    username: c.env.ADMIN_USERNAME,
    password: c.env.ADMIN_PASSWORD,
  });
  return auth(c, next);
});

// Users CRUD
app.get('/admin/users', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT user_id, uuid, username, name, status, cookie_expiry_days, password_plain, created_at FROM users').all();
  return c.json(results);
});

app.post('/admin/users', async (c) => {
  const { username, name, password, cookie_expiry_days = 7 } = await c.req.json();
  const uuid = crypto.randomUUID();
  const salt = generateSalt();
  const hash = await hashPassword(password, salt);

  try {
    await c.env.DB.prepare(
      'INSERT INTO users (uuid, username, name, password_hash, password_salt, password_plain, cookie_expiry_days) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(uuid, username, name, hash, salt, password, cookie_expiry_days).run();
    return c.json({ success: true, uuid });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

app.put('/admin/users/:uuid', async (c) => {
  const uuid = c.req.param('uuid');
  const { name, username, cookie_expiry_days } = await c.req.json();
  try {
    await c.env.DB.prepare(
      'UPDATE users SET name = ?, username = ?, cookie_expiry_days = ? WHERE uuid = ?'
    ).bind(name, username, cookie_expiry_days, uuid).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

app.put('/admin/users/:uuid/password', async (c) => {
  const uuid = c.req.param('uuid');
  const { password } = await c.req.json();
  const salt = generateSalt();
  const hash = await hashPassword(password, salt);
  await c.env.DB.prepare(
    'UPDATE users SET password_hash = ?, password_salt = ?, password_plain = ? WHERE uuid = ?'
  ).bind(hash, salt, password, uuid).run();
  return c.json({ success: true });
});

app.delete('/admin/users/:uuid', async (c) => {
  const uuid = c.req.param('uuid');
  await c.env.DB.prepare('DELETE FROM users WHERE uuid = ?').bind(uuid).run();
  return c.json({ success: true });
});

// Pause / Continue
app.post('/admin/users/:uuid/pause', async (c) => {
  const uuid = c.req.param('uuid');
  await c.env.DB.prepare("UPDATE users SET status = 'paused' WHERE uuid = ?").bind(uuid).run();
  return c.json({ success: true, status: 'paused' });
});

app.post('/admin/users/:uuid/continue', async (c) => {
  const uuid = c.req.param('uuid');
  await c.env.DB.prepare("UPDATE users SET status = 'active' WHERE uuid = ?").bind(uuid).run();
  return c.json({ success: true, status: 'active' });
});

// Apps CRUD
app.get('/admin/apps', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM apps').all();
  return c.json(results);
});

app.post('/admin/apps', async (c) => {
  const { app_id, app_name, callback_url, secret_key } = await c.req.json();
  try {
    await c.env.DB.prepare(
      'INSERT INTO apps (app_id, app_name, callback_url, secret_key) VALUES (?, ?, ?, ?)'
    ).bind(app_id, app_name, callback_url, secret_key).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

app.put('/admin/apps/:app_id', async (c) => {
  const appId = c.req.param('app_id');
  const { app_name, callback_url, secret_key } = await c.req.json();
  await c.env.DB.prepare(
    'UPDATE apps SET app_name = ?, callback_url = ?, secret_key = ? WHERE app_id = ?'
  ).bind(app_name, callback_url, secret_key, appId).run();
  return c.json({ success: true });
});

app.delete('/admin/apps/:app_id', async (c) => {
  const appId = c.req.param('app_id');
  await c.env.DB.prepare('DELETE FROM apps WHERE app_id = ?').bind(appId).run();
  return c.json({ success: true });
});

// Permissions
app.get('/admin/permissions', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM user_apps').all();
  return c.json(results);
});

app.post('/admin/permissions', async (c) => {
  const { uuid, app_id } = await c.req.json();
  try {
    await c.env.DB.prepare('INSERT INTO user_apps (uuid, app_id) VALUES (?, ?)').bind(uuid, app_id).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

app.delete('/admin/permissions', async (c) => {
  const { uuid, app_id } = await c.req.json();
  await c.env.DB.prepare('DELETE FROM user_apps WHERE uuid = ? AND app_id = ?').bind(uuid, app_id).run();
  return c.json({ success: true });
});

// Analytics Stats (GraphQL Proxy)
app.post('/admin/stats/graphql', async (c) => {
  const { query, variables } = await c.req.json();
  const url = `https://api.cloudflare.com/client/v4/graphql`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${c.env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Auth-Email': '' // Not strictly needed for CF_API_TOKEN but sometimes helpful if required, usually api token is enough.
    },
    body: JSON.stringify({ query, variables: { accountTag: c.env.CF_ACCOUNT_ID, ...variables } })
  });

  if (!response.ok) {
    const text = await response.text();
    return c.json({ error: 'GraphQL API Error', details: text }, response.status as any);
  }

  const data = await response.json();
  return c.json(data);
});

// Fallback for SPA Routing (React Router)
app.get('*', async (c) => {
  return await c.env.ASSETS.fetch(new Request(new URL('/', c.req.url).toString(), c.req.raw));
});

export default app;
