# SSO & Analytics System (Cloudflare Workers)

This is a unified Single Sign-On (SSO) and Analytics system built on Cloudflare Workers. It provides centralized authentication and usage tracking for multiple web applications.

- **Flexible Integration**: Simple redirection or standard SSO flows with ease.
- **Agent Usage Limits**: (New!) Configure token and request quotas for LLM-based agents.
- **Visual Analytics Dashboard**: (New!) Premium dashboard with real-time access-event charts (Visits, Browsers, GEO) using Cloudflare Analytics Engine SQL API.
- **Coastline World Map**: (New!) The statistics page highlights active regions on a coastline-style world map and exposes a raw payload inspector for debugging.
- **Security First**: 100% on Cloudflare Stack (D1 for database, Workers for logic).
- **GitHub SSO Integration**: Bind GitHub identities for one-click secure access.

## Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed.
- A Cloudflare account.

## 1. Initialization

### Create the D1 Database

First, create a new D1 database:

```bash
npx wrangler d1 create sso-db
```

Update your `wrangler.toml` with the generated `database_id`.

### Apply the Schema

Run the following command to initialize the database tables:

```bash
# For local development
npx wrangler d1 execute sso-db --local --file=./schema.sql

# For production
npx wrangler d1 execute sso-db --remote --file=./schema.sql
```

### Deploy the Worker

Deploy the worker to Cloudflare:

```bash
npm install
npm run build
npx wrangler deploy
```

## 2. GitHub SSO Integration (Optional but Recommended)

You can enable GitHub Single Sign-On for both your admin account and end-users. Add the following to your `wrangler.toml` `[vars]` section or set them as Cloudflare environment secrets:

```toml
GITHUB_CLIENT_ID = "your_github_oauth_app_client_id"
GITHUB_CLIENT_SECRET = "your_github_oauth_app_client_secret"
ADMIN_GITHUB_ID = "your_github_account_numeric_id"
```
- A user can bind their GitHub identity via the "Copy GitHub Bind Link" button in their admin-managed `UserProfile`. 
- Admin can bind it by clicking the GitHub icon in the top right of the Admin Dashboard.
- Sub-apps using the standard SSO redirection mode will automatically surface a "Continue with Github" option if `app_redirect` is present.

## 3. Admin API Usage

The Admin API is protected by Basic Auth. Use the `ADMIN_USERNAME` and `ADMIN_PASSWORD` defined in your `wrangler.toml` (or set them as secrets via `wrangler secret put`).

> **Admin Login on Sub-Apps:** The admin account (`ADMIN_USERNAME` / `ADMIN_PASSWORD`) can also log into any sub-app via the SSO login page. The admin JWT bypasses all per-app permission checks and grants access to every registered application by default.

### Apps Management

**Create an App:**
```bash
curl -X POST https://<your-worker-url>/admin/apps \
  -u admin:supersecretpassword \
  -H "Content-Type: application/json" \
  -d '{"app_id": "english-assistant", "app_name": "English Assistant", "callback_url": "https://app.example.com/callback", "secret_key": "app-secret", "use_agent_limit": true}'
```

**List Apps:**
```bash
curl https://<your-worker-url>/admin/apps -u admin:supersecretpassword
```

### User Management

**Create a User:**
```bash
curl -X POST https://<your-worker-url>/admin/users \
  -u admin:supersecretpassword \
  -H "Content-Type: application/json" \
  -d '{"username": "johndoe", "name": "John Doe", "password": "securepassword123", "cookie_expiry_days": 7}'
```

**Pause/Continue a User:**
```bash
# Pause
curl -X POST https://<your-worker-url>/admin/users/<uuid>/pause -u admin:supersecretpassword

# Continue
curl -X POST https://<your-worker-url>/admin/users/<uuid>/continue -u admin:supersecretpassword
```

### Permissions Management

**Assign an App to a User:**
```bash
curl -X POST https://<your-worker-url>/admin/permissions \
  -u admin:supersecretpassword \
  -H "Content-Type: application/json" \
  -d '{"uuid": "<user_uuid>", "app_id": "english-assistant"}'
```

## 4. Sub-App Integration Guide

### User Login

Sub-apps should redirect users to a centralized login page (or handle it via API).

**Endpoint:** `POST /login`
**Payload:** `{"username": "johndoe", "password": "securepassword123"}`

**Success Response:**
```json
{
  "token": "<jwt_string>",
  "jwt": "<jwt_string>",
  "uuid": "<user_uuid>",
  "user_id": 1,
  "name": "John Doe",
  "username": "johndoe",
  "timestamp": 1709390000
}
```

The JWT payload also contains: `{ uuid, user_id, name, username, status, exp }`. The `name` and `username` fields are both included so sub-apps can display the user's display name.

### Token Verification

When a user accesses a sub-app, the sub-app should verify the token and check if the user has permission for that specific app.

**Endpoint:** `GET /api/verify?app_id=english-assistant`
**Headers:** `Authorization: Bearer <jwt_string>`

If the user is paused by an admin, this endpoint will return a `403 Forbidden` error, and the sub-app should log the user out immediately.

### Analytics Tracking

Sub-apps can send usage data to the centralized Analytics Engine.

**Endpoint:** `POST /api/track`
**Payload:**
```json
{
  "app_id": "english-assistant",
  "uuid": "<user_uuid>",
  "event_type": "page_view",
  "duration_seconds": 120
}
```

The system automatically records the user's country (via Cloudflare headers) and parses the `User-Agent` to determine the device type and browser.

The admin `Statistics` dashboard aggregates access events only: `page_view`, `login_success`, and `sso_auto_login`. Internal quota writes such as `quota_consume` are excluded from visit metrics so quota traffic does not inflate the dashboard. The `Raw Analytics Payload` panel on the page exposes the filtered rows, including `event_type`, to make the aggregation easier to verify.

### User Self-Service Password Change

Users can change their own password via a dedicated public page (no admin login required).

**Page URL:** `https://accounts.aryuki.com/<user_uuid>/change-password`

**API Endpoint:** `POST /api/users/<uuid>/change-password`
**Payload:** `{"oldPassword": "current", "newPassword": "updated"}`

The page verifies the old password before allowing the update. You can copy the link from the User Profile page in the admin panel.

---

## 5. Sign-Out Integration (Sub-App → Auth Center)

When a user signs out of a sub-app, you should **also** invalidate their Auth Center session cookie. This ensures:
- The next time they click "Login" on any sub-app, they will be prompted to log in again (no silent auto-redirect).
- They can switch to a different account.
- They are fully logged out across the SSO system.

### Two Available Sign-Out Endpoints

#### Method 1: Redirect-based Logout (Recommended for browser flows)

```
GET https://accounts.aryuki.com/logout?redirect=<your-callback-url>
```

The Auth Center will clear the `sso_session` cookie, then immediately redirect the user back to the URL you specify.

**Example – JavaScript redirect from your sub-app:**
```javascript
function handleSignOut() {
  // Clear your own app's local session first
  localStorage.removeItem('app_session');

  // Then redirect to Auth Center to clear the SSO cookie
  const SSO_URL = 'https://accounts.aryuki.com';
  const afterLogoutUrl = encodeURIComponent(window.location.origin + '/login');
  window.location.href = `${SSO_URL}/logout?redirect=${afterLogoutUrl}`;
}
```

After the redirect, the user lands back on your sub-app's login page. The next time they click "Sign In", the Auth Center will show the login form (no stored session), allowing them to enter any credentials.

#### Method 2: API Logout (For backend or fetch-based flows)

```
POST https://accounts.aryuki.com/api/logout
```

Call this from your backend or via `fetch` (the browser must include cookies for the call to work, so this requires being on the same origin or using `credentials: 'include'`):

```javascript
async function handleSignOut() {
  // Clear your own app's local session
  localStorage.removeItem('app_session');

  // Call Auth Center API to clear SSO cookie
  await fetch('https://accounts.aryuki.com/api/logout', {
    method: 'POST',
    credentials: 'include',   // <-- required so the browser sends the SSO cookie
  });

  // Redirect to your app's login page
  window.location.href = '/login';
}
```

> **Note on `credentials: 'include'`:** This is required because the `sso_session` cookie is an `HttpOnly` cookie set on the `accounts.aryuki.com` domain. To clear it, the browser must send the cookie back to that domain, which only happens when `credentials: 'include'` is set. Without it, the cookie will remain active.

### Recommended Sign-Out Implementation (Cloudflare Workers sub-apps)

If your sub-app is also a Cloudflare Worker (e.g., using Hono), you can handle sign-out in a single backend route:

```typescript
// In your sub-app's Hono worker
app.post('/api/signout', async (c) => {
  // 1. Clear sub-app session cookie
  setCookie(c, 'app_session', '', { path: '/', maxAge: 0 });

  // 2. Proxy the logout to Auth Center
  await fetch('https://accounts.aryuki.com/api/logout', {
    method: 'POST',
    headers: { 'Cookie': c.req.header('Cookie') || '' } // forward the sso_session cookie
  });

  return c.json({ success: true });
});
```

---

## 6. WebApp Integration Code Examples

Here is how you can practically adapt your other web applications (frontend and backend) to use this SSO center.

### Example 1: OAuth-Style Seamless SSO Flow (Recommended)

When a user visits your app, check for the session. If not present, seamlessly redirect them to log in via the unified center.

```javascript
// Function to initiate SSO
function loginWithSSO() {
  const SSO_URL = 'https://accounts.aryuki.com';
  const APP_ID = 'your-app-id'; // Your registered app in the dashboard
  const RETURN_URL = window.location.origin + '/sso-callback'; 
  
  // 1. Redirect to Auth Center (with SSO credentials + Github Login option)
  window.location.href = `${SSO_URL}/?client_id=${APP_ID}&redirect=${encodeURIComponent(RETURN_URL)}`;
}
```

```javascript
// On your child app logic (/sso-callback page)
window.onload = function() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  
  if (token) {
    // 2. Extract Token and store locally
    localStorage.setItem('app_session', token);
    window.location.href = '/dashboard';
  }
}
```

*Note: As long as the user's secure Cookie is valid on `accounts.aryuki.com`, clicking Login on any other authorized satellite Apps (like App B or C) will trigger a **0-second passwordless transparent redirect!***

### Example 2: Backend API Protection (Node.js/Hono/Express)

For your sub-app's backend, verify the user's session by making a request to the SSO Center's verify endpoint before processing sensitive data.

```javascript
// Express.js middleware example for a Sub-App
async function requireSSO(req, res, next) {
  const token = req.headers.authorization;
  const SSO_URL = 'https://accounts.aryuki.com';
  
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    // Verify against SSO center (requires the app_id query to test permissions)
    const verification = await fetch(`${SSO_URL}/api/verify?app_id=your-app-id`, {
      method: 'GET',
      headers: { 'Authorization': token }
    });

    if (!verification.ok) {
      return res.status(403).json({ error: 'SSO Verification Failed (Unauthorized or Paused user)' });
    }

    const { user } = await verification.json();
    req.user = user; // Push user profile downstream
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal SSO Error' });
  }
}

// Protected Route
app.get('/api/secure-data', requireSSO, (req, res) => {
  res.json({ message: `Welcome ${req.user.name}` });
});
```

---

## 7. AI API Quota & Rate Limiting System

The Auth Center now deeply integrates an **API Gateway / Quota Engine** architecture, allowing you to regulate Sub-App requests for premium APIs (e.g., LLM Tokens). 

**To enable this feature, check "Enable Agent Limits" when creating the registered application (or toggle it later in the App Details page).** With this enabled, administrators get granular access to a line chart displaying real-time Token consumption grouped by day and user.

In the Admin Dashboard (`Permissions` tab), click the `Settings` (gear) icon on an enabled app to configure the following limits per tracked user, per application:
- **RPM (Requests Per Minute)**: Maximum queries per minute.
- **RPD (Requests Per Day)**: Maximum queries per 24 hours.
- **Tokens Per Day**: Maximum amount of permitted daily Token consumption.

### Integrating the Quota Engine
Within your Sub-App codebase, intercept incoming API requests and call the Pre-check and Post-consume endpoints:

- **Pre-check:** `GET /api/quota/check?uuid=<uuid>&app_id=<app_id>` (Call this *before* making the LLM request to ensure limits aren't exceeded).
- **Post-consume:** `POST /api/quota/consume` (Call this *after* the request is complete to deduct the true token usage).

> 💡 **Developer Integration Guide:** For full code examples on performing Quota pre-checks and post-deductions inside a worker, please refer to the [way1.md](./way1.md) guide.
