# SSO & 数据分析中心 (Cloudflare Workers)

这是一个基于 Cloudflare Workers、D1 以及 Workers Analytics Engine 构建的单点登录 (SSO) 与鉴权数据分析统一中心。它能为你的多个 Web 应用提供中心化的认证与数据埋点记录。

## 必备条件

- 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Cloudflare 账号

## 1. 初始化说明

### 创建 D1 数据库
首先，创建一个新的 D1 数据库：
```bash
npx wrangler d1 create auth-center-db
```
并将生成的 `database_id` 更新到项目根目录的 `wrangler.toml` 文件中。

### 写入数据库表结构
运行下面命令进行表结构初始化（请确保你位于项目根目录）：
```bash
# 本地调试
npx wrangler d1 execute auth-center-db --local --file=./schema.sql

# 线上生产环境
npx wrangler d1 execute auth-center-db --remote --file=./schema.sql
```

### 发版与部署
打包并发布前端界面及后端 Worker 到 Cloudflare：
```bash
npm install
npm run build
npx wrangler deploy
```

## 2. GitHub SSO 鉴权集成（强烈推荐）

系统已深度内置 GitHub OAuth 鉴权，分别支持管理后台快速登录以及子应用授权跳转（登录界面提供“使用 GitHub 继续”按钮）。请在 `wrangler.toml` 的 `[vars]` 区域添加或配置环境变量：

```toml
GITHUB_CLIENT_ID = "您的_github_oauth_app客户端id"
GITHUB_CLIENT_SECRET = "您的_github_oauth_app客户端秘钥"
ADMIN_GITHUB_ID = "您的_github数字ID"
```
- 普通用户：可以由管理员下发生成的 `Copy GitHub Bind Link` 专属绑定链接绑定自己的身份。
- 站长（Admin）：可直接点击内部右上角的 GitHub 图标通过 `ADMIN_GITHUB_ID` 白名单比对完成绑定。
- 若作为跳转鉴权模式（带 `app_redirect` 参数），原有的登录窗口下方会自动加载使用 GitHub 登录的快捷按钮。

## 3. API 与后台使用指南

所有的 `/admin/*` 路由均受 Basic 鉴权保护。你需要在 `wrangler.toml` 设置 `ADMIN_USERNAME` 与 `ADMIN_PASSWORD` 这对默认管理员密码。

> **管理员可登录子应用：** `ADMIN_USERNAME` / `ADMIN_PASSWORD` 配置的管理员账号，可以直接在子应用的 SSO 登录页面输入登录。管理员 JWT 默认跳过所有应用权限检测，可访问所有已注册子应用，有效期默认 7 天。

### 管理控制台 (Web UI)
这个项目已经附带了一个**可视化的后台管理面板**。部署后直接访问你的 Workers 域名（或者配置好的自定义域名），即可通过管理员账密登录。
- **用户管理**：创建账户与限制访问权限，支持立刻暂停或恢复。
- **应用管理**：注册新的 Web Apps 接入此中心。
- **权限管理矩阵**：指定哪些用户有权登录哪些 App 的可视化界面映射。
- **Analytics 数据看板**：整合了 Cloudflare GraphQL 的内置图表，查看整体登入行为统计与客户端环境占比。

### 接口调用范例：子应用对接 SSO 流水线

#### 1. 用户登录接口

**接口地址：** `POST /login`  
**请求体：** `{"username": "johndoe", "password": "securepassword123"}`

**成功响应：**
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

JWT Payload 包含字段：`{ uuid, user_id, name, username, status, exp }`。`name` 和 `username` 两个字段均已包含，子应用可以直接用于显示用户名或账号名。

#### 2. OAuth 风格前端无感知对接 (推荐)

鉴权中心现在全面支持跨站重定向静默登录机制（基于 HttpOnly Cookie + 短期会话票据），无需在子应用手写复杂的 API。只需直接重定向用户到 Auth-Center 就行了：

```javascript
function loginWithSSO() {
  const SSO_URL = 'https://accounts.aryuki.com';
  const APP_ID = 'your-app-id'; // 在管理面板注册的应用名
  const RETURN_URL = window.location.origin + '/sso-callback'; // 你的登录回调页
  
  // 1. 发起跳转
  window.location.href = `${SSO_URL}/?client_id=${APP_ID}&redirect=${encodeURIComponent(RETURN_URL)}`;
}
```

```javascript
// 在你的子应用端 (/sso-callback 页面)
window.onload = function() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  
  if (token) {
    // 2. 拿到票据，种到 localStorage 即可畅通无阻访问子应用后端
    localStorage.setItem('app_session', token);
    window.location.href = '/dashboard';
  }
}
```

*附录注意：该模式只要用户在 `accounts.aryuki.com` 处于 Cookie 有效期，前往 B、C 应用时点击 Login 将会触发**0秒无感免密穿越**！*

#### 3. 服务端 / API 层加密校验
子应用本身的后端处理高敏数据时，请在每一个需要权限的路由加上以下中间件，用于核验 Token 及应用权限：

```javascript
async function requireSSO(req, res, next) {
  const token = req.headers.authorization;
  const SSO_URL = 'https://accounts.aryuki.com';
  
  if (!token) return res.status(401).json({ error: '权限丢失' });

  try {
    // 跟鉴权中心核验 Token
    const verification = await fetch(`${SSO_URL}/api/verify?app_id=your-app-id`, {
      method: 'GET',
      headers: { 'Authorization': token }
    });

    if (!verification.ok) {
      return res.status(403).json({ error: 'SSO 验证失败或该账户被管理员冻结' });
    }

    const { user } = await verification.json();
    req.user = user; // 校验成功，放行后级请求
    next();
  } catch (error) {
    res.status(500).json({ error: 'SSO 服务器内部通讯报错' });
  }
}
```

#### 4. 用户自助修改密码

无需管理员介入，用户可以通过以下独立页面自行修改密码：

**页面地址：** `https://accounts.aryuki.com/<user_uuid>/change-password`

**后端接口：** `POST /api/users/<uuid>/change-password`
**请求体：** `{"oldPassword": "当前密码", "newPassword": "新密码"}`

页面会在更改前验证旧密码。管理员可在 User Profile 页面点击"Copy Self-Service Link"按钮复制链接后发给用户。

---

## 4. 子应用退出登录 → 同步退出 Auth Center

当用户在子应用点击退出（Sign Out）时，应**同时清除 Auth Center 的 SSO 会话 Cookie**。

这样做的好处：
- 下次再点击"登录"时，Auth Center **不会自动静默重定向**，而是显示登录表单
- 用户可以**切换到其他账号**，或用相同账号重新输入密码登录
- 实现**全系统真正注销**，而非仅仅清除子应用本地状态

### 两种退出方式

#### 方式一：重定向退出（推荐，适合浏览器场景）

```
GET https://accounts.aryuki.com/logout?redirect=<你的回调地址>
```

Auth Center 会清除 `sso_session` Cookie，然后立即跳转到你指定的 URL。

**在子应用的 JavaScript 中实现：**
```javascript
function handleSignOut() {
  // 第一步：清除子应用自己的本地会话
  localStorage.removeItem('app_session');

  // 第二步：跳转到 Auth Center 清除 SSO Cookie
  const SSO_URL = 'https://accounts.aryuki.com';
  const afterLogoutUrl = encodeURIComponent(window.location.origin + '/login');
  window.location.href = `${SSO_URL}/logout?redirect=${afterLogoutUrl}`;
}
```

跳转完成后，用户会回到子应用的登录页。下次点击"登录"，Auth Center 将展示全新的账密输入表单，用户可以切换账号或重新登录。

#### 方式二：API 退出（适合后端或 fetch 调用场景）

```
POST https://accounts.aryuki.com/api/logout
```

通过 `fetch` 调用时，**必须加 `credentials: 'include'`**，否则浏览器无法将 `sso_session` Cookie 发送过去（该 Cookie 是 HttpOnly，只能由服务端清除，浏览器无法直接操作）：

```javascript
async function handleSignOut() {
  // 第一步：清除子应用本地 session
  localStorage.removeItem('app_session');

  // 第二步：调用 Auth Center 退出接口
  await fetch('https://accounts.aryuki.com/api/logout', {
    method: 'POST',
    credentials: 'include',  // ← 关键！必须加，否则 Cookie 无法被发送和清除
  });

  // 第三步：跳转到子应用的登录页
  window.location.href = '/login';
}
```

> **关于 `credentials: 'include'` 的说明：**
> `sso_session` 是一个由 Auth Center 种在 `accounts.aryuki.com` 域下的 `HttpOnly` Cookie，子应用的 JavaScript 无法直接读取或删除它。
> 为了清除它，浏览器必须将其发送回 `accounts.aryuki.com`，这只有在 fetch 请求中加了 `credentials: 'include'` 时才会发生。
> 如果不加这个参数，退出请求会成功返回 200，但 SSO Cookie 实际上不会被清除，下次用户访问子应用还是会自动静默登录！

#### 方式三（推荐 Cloudflare Workers 子应用）：后端统一处理

如果你的子应用也是基于 Cloudflare Workers（比如用 Hono），可以在子应用的后端统一处理退出逻辑，代理转发 Cookie 并清除双端会话：

```typescript
// 子应用 Hono worker 中
app.post('/api/signout', async (c) => {
  // 第一步：清除子应用自己的 session Cookie
  setCookie(c, 'app_session', '', { path: '/', maxAge: 0 });

  // 第二步：代理转发退出请求到 Auth Center，并转发浏览器的 Cookie 头
  await fetch('https://accounts.aryuki.com/api/logout', {
    method: 'POST',
    headers: { 'Cookie': c.req.header('Cookie') || '' }
  });

  return c.json({ success: true });
});
```

---

## 5. 大模型 API 用量控制与限频 (Quota & Rate Limiting)

系统现在在原有身份鉴权的基础上，深度集成了 **用量控制引擎 (API Gateway)** 的能力：
非常适合使用大模型 (LLMs) 等按 Token/请求计费的 SubApp 子应用接入。

在管理后台（Permissions 页面），管理员可以通过 `Settings` (齿轮) 图标，针对具体应用和具体用户单独配置以下额度：
- **RPM (Requests Per Minute)**: 每分钟发送消息请求的 QPS 上限。
- **RPD (Requests Per Day)**: 每天会话发送总次数上限。
- **Tokens Per Day**: 每天允许使用的 Token 消耗总量上限（LLM 场景）。

### 对接用量引擎
请在你的子应用 (SubApp) 代码逻辑中，分别接入 Auth-Center 提供的**前置校验 (Pre-check)** 和 **后置消费上报 (Post-deduction)** 接口：

- **Pre-check:** `GET /api/quota/check?uuid=<uuid>&app_id=<app_id>` (发起 AI 请求前确认是否超时或超频)
- **Post-consume:** `POST /api/quota/consume` (收到 AI 响应后记录并累加消耗的 token 值)

> 💡 **详细开发对接教程**，请查阅根目录下的 [way1.md](./way1.md) 指南文件。

---

更多配置详见源码 `src/` 结构与 `wrangler.toml` 环境设置。
