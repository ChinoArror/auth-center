# Auth Center SSO & Analytics System

Auth Center is a unified identity, session, and analytics platform built on Cloudflare Workers. It provides:

- Centralized login for multiple applications
- Admin-managed users, apps, permissions, and quotas
- Session-based user self-service flows
- GitHub binding and passkey management
- Access analytics for the last 7 days
- Light and dark themed admin and user interfaces

The project is designed for teams that want one hosted authentication center and a simple way to connect many internal or external web apps to it.

## Core Capabilities

### Authentication

- Username/password login
- Centralized SSO redirects for child apps
- GitHub OAuth binding and sign-in
- Passkey registration and passkey sign-in
- Admin login with Basic Auth or admin JWT

### Session Management

- Cookie-based browser session for end users
- Persistent `user_sessions` records in D1
- Session center for users to review and revoke sessions
- Automatic redirect to user login before protected self-service pages
- Admin passkey management based on current admin login state

### Admin Management

- Users CRUD
- Applications CRUD
- User-to-app permission mapping
- Per-user per-app quota settings
- Admin self GitHub binding
- Admin self passkey management

### Analytics

- Access-event aggregation from Cloudflare Analytics Engine
- Statistics page counts only the last 7 days
- Only access events are included in visit metrics:
  - `page_view`
  - `login_success`
  - `sso_auto_login`
- Internal quota writes such as `quota_consume` are excluded from visit totals
- Numbers are displayed with compact units such as `K`, `M`, and `G`, rounded to two decimals
- Country-level request proportion display is included in the statistics page

## Architecture

### Runtime

- Cloudflare Workers for API logic and SPA hosting
- Cloudflare D1 for relational data
- Cloudflare Analytics Engine for event analytics
- React + Vite frontend served from Worker assets

### Key Files

- `src/index.ts`: Worker routes, auth flows, analytics proxy, passkey endpoints
- `src/App.tsx`: Admin dashboard, statistics UI, routing entry
- `src/UserLogin.tsx`: User login page
- `src/UserHome.tsx`: User account hub
- `src/SessionCenter.tsx`: User login session management page
- `src/ChangePassword.tsx`: Session-backed password change page
- `src/SsoBinding.tsx`: Session-backed GitHub binding page
- `src/UserPasskeyManage.tsx`: User passkey management page
- `src/AdminPasskeyManage.tsx`: Admin passkey management page
- `src/theme.tsx`: Light/dark theme state and toggle
- `src/index.css`: Design tokens and theme-aware component styling
- `schema.sql`: Full schema for fresh deployments
- `migrate-user-sessions.sql`: Migration for `user_sessions`

## Data Model Overview

### Main Tables

- `users`: user accounts, password hash/salt, display info, session expiry days, GitHub binding
- `apps`: registered child applications and callback metadata
- `user_apps`: user-to-app permission and quota assignments
- `passkeys`: WebAuthn credentials for users and admin
- `user_sessions`: user session records for login session review and revocation

### Analytics Dataset

The Worker writes analytics events to the `auth-center` Analytics Engine dataset. The statistics page queries aggregated rows through Cloudflare's Analytics Engine SQL API.

## Fresh Deployment

### 1. Install dependencies

```bash
npm install
```

### 2. Configure `wrangler.toml`

Set or review:

- Worker name and custom domain route
- D1 binding
- Analytics Engine binding
- Admin credentials
- JWT secret
- GitHub OAuth credentials
- Cloudflare account and API token

### 3. Initialize the database

For a fresh environment:

```bash
npx wrangler d1 execute auth-center-db --local --file=./schema.sql
npx wrangler d1 execute auth-center-db --remote --file=./schema.sql
```

If your environment already exists and only needs session support:

```bash
npx wrangler d1 execute auth-center-db --remote --file=./migrate-user-sessions.sql
```

### 4. Build and deploy

```bash
npm run build
npx wrangler deploy
```

## Local Development

```bash
npm install
npm run build
npx wrangler dev
```

If you want frontend-only iteration:

```bash
npm run dev
```

## Environment Variables

Example `wrangler.toml` variables:

```toml
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "your-admin-password"
JWT_SECRET = "your-jwt-secret"
CF_ACCOUNT_ID = "your-cloudflare-account-id"
CF_API_TOKEN = "your-cloudflare-api-token"
GITHUB_CLIENT_ID = "your-github-oauth-client-id"
GITHUB_CLIENT_SECRET = "your-github-oauth-client-secret"
ADMIN_GITHUB_ID = "your-admin-github-numeric-id"
```

## UI Surfaces

### Admin Login

- Uses admin credentials only
- Supports light and dark mode
- Includes a `Users Here` entry button for end users

### Admin Dashboard

Tabs:

- Users
- Applications
- Permissions
- Statistics

Header actions:

- Theme toggle
- Admin passkeys
- Admin GitHub binding

### User Login

Path:

- `/users/`

Rules:

- Username + password only
- Admin accounts are rejected here
- Successful login creates a cookie-backed user session
- Users are redirected to the original requested page or `/{uuid}`

### User Account Hub

Path:

- `/{uuid}`

Actions:

- Bind GitHub
- Bind passkey
- Change password
- View login sessions

### User Session Center

Path:

- `/session`

Shows:

- Login time
- IP address
- Browser
- Device type
- App identifier
- Expiry time

Supports:

- Closing any session
- Logging out immediately if the current session is revoked

## Session and Self-Service Flow

### Protected public links

These admin-generated links remain stable:

- `/{uuid}/change-password`
- `/{uuid}/sso-binding`
- `/{uuid}/passkey`

When opened:

- If the user already has a valid session, the page opens directly
- If not, the system redirects to `/users/?redirect=...`
- After login, the user returns to the original target page

### Password Change

The old password step has been removed from the self-service page. The page now trusts the active user session and only asks for the new password.

### GitHub Binding

The old password verification step has been removed from the self-service page. The page now issues a short-lived bind token from the current user session and redirects directly to GitHub authorization.

### Passkey Management

The old password verification gate has been removed from the self-service page. The page now issues a short-lived bind token from the active user session and uses it for passkey registration and management.

### Admin Passkey Management

Path:

- `/admin/passkey`

Behavior:

- Uses current admin login state
- Does not redirect to user login
- Issues an admin bind token from the existing admin authentication state
- Manages only admin passkeys

## Analytics Semantics

### Time Window

The statistics page always shows data for the last 7 days. It does not aggregate all historical analytics rows into the UI totals.

### Included Event Types

Only these event types count toward visits and dashboard totals:

- `page_view`
- `login_success`
- `sso_auto_login`

### Excluded Event Types

Examples of events that are intentionally excluded from visit totals:

- `quota_consume`

### Display Rules

- Compact units are used for large values: `K`, `M`, `G`, `T`
- Numeric values are rounded to two decimals
- Country breakdown is shown as request proportion by country
- Raw analytics payload remains available for debugging

## API Overview

### Public / Auth

- `POST /login`
- `POST /api/users/login`
- `POST /api/logout`
- `GET /logout`
- `GET /api/session`
- `GET /api/user/session`

### User Self-Service

- `POST /api/user/bind-token`
- `POST /api/user/change-password`
- `GET /api/user/sessions`
- `DELETE /api/user/sessions/:sessionId`

### Passkeys

- `POST /api/passkey/generate-registration-options`
- `POST /api/passkey/verify-registration`
- `GET /api/passkey/:uuid/list`
- `PUT /api/passkey/:uuid/:id`
- `DELETE /api/passkey/:uuid/:id`
- `GET /api/passkey/admin/list`
- `PUT /api/passkey/admin/:id`
- `DELETE /api/passkey/admin/:id`
- `GET /api/passkey/generate-authentication-options`
- `POST /api/passkey/verify-authentication`

### GitHub

- `GET /api/github/login`
- `GET /api/github/callback`

### Admin

- `POST /admin/bind-token`
- `GET /admin/users`
- `POST /admin/users`
- `PUT /admin/users/:uuid`
- `PUT /admin/users/:uuid/password`
- `POST /admin/users/:uuid/pause`
- `POST /admin/users/:uuid/continue`
- `DELETE /admin/users/:uuid`
- `GET /admin/apps`
- `POST /admin/apps`
- `PUT /admin/apps/:app_id`
- `DELETE /admin/apps/:app_id`
- `GET /admin/permissions`
- `POST /admin/permissions`
- `DELETE /admin/permissions`
- `POST /admin/permissions/quota`
- `GET /admin/summary`
- `GET /admin/stats/quota`
- `GET /admin/stats/usage`

### Child App Integration

- `GET /api/verify?app_id=...`
- `GET /api/quota/check?uuid=...&app_id=...`
- `POST /api/quota/consume`
- `POST /api/track`

## Child App Integration Pattern

### Login redirect

```javascript
function loginWithSSO() {
  const ssoUrl = 'https://accounts.aryuki.com';
  const appId = 'your-app-id';
  const returnUrl = `${window.location.origin}/sso-callback`;
  window.location.href = `${ssoUrl}/?client_id=${appId}&redirect=${encodeURIComponent(returnUrl)}`;
}
```

### Callback storage

```javascript
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
if (token) {
  localStorage.setItem('app_session', token);
  window.location.href = '/dashboard';
}
```

### Verify token in backend

```javascript
async function requireSSO(req, res, next) {
  const token = req.headers.authorization;
  const ssoUrl = 'https://accounts.aryuki.com';

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const verification = await fetch(`${ssoUrl}/api/verify?app_id=your-app-id`, {
    headers: { Authorization: token },
  });

  if (!verification.ok) {
    return res.status(403).json({ error: 'SSO verification failed' });
  }

  const { user } = await verification.json();
  req.user = user;
  next();
}
```

## Logout Integration

### Redirect-based logout

```text
GET https://accounts.aryuki.com/logout?redirect=<your-return-url>
```

### API-based logout

```javascript
await fetch('https://accounts.aryuki.com/api/logout', {
  method: 'POST',
  credentials: 'include',
});
```

Use `credentials: 'include'` so the browser sends the `sso_session` cookie back to Auth Center for removal.

## Operational Notes

- Admin login is separate from user login
- User self-service pages rely on the cookie-backed user session
- Admin passkeys rely on current admin authentication state
- Statistics use Analytics Engine SQL API instead of GraphQL because custom blob fields are queried there
- If analytics look too high, verify that only access events are counted and that the time window is 7 days

## Recommended Post-Deploy Checks

- Admin login works
- `Users Here` opens `/users/`
- User login creates a session and lands on `/{uuid}`
- `/{uuid}/change-password` redirects to `/users/` when logged out
- `/session` lists current sessions and can revoke one
- `/admin/passkey` opens without redirecting to the user login flow
- Statistics show 7-day-only data
- Country proportion panel renders correctly

## License / Notes

This repository is currently structured as an application project rather than a published package. If you plan to reuse it across teams, consider extracting:

- shared auth helpers
- shared route contracts
- a migration workflow
- a frontend component library
