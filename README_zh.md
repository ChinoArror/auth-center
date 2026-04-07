# Auth Center 统一 SSO 与统计系统

Auth Center 是一个基于 Cloudflare Workers 构建的统一身份认证、会话管理与访问统计平台，适合为多个子应用提供集中式登录中心。

它当前已经具备以下能力：

- 统一账号密码登录
- 多应用 SSO 跳转与令牌校验
- GitHub 绑定与 GitHub 登录
- Passkey 注册与 Passkey 登录
- 管理员后台
- 用户自助中心
- 登录会话查看与一键关闭
- 最近 7 天访问统计
- 浅色模式与暗黑模式

## 一、项目定位

这个项目的目标不是只做一个登录页，而是提供一个完整的认证中心：

- 对管理员来说，可以管理用户、应用、权限、配额和统计
- 对普通用户来说，可以登录后自助完成绑定 GitHub、绑定通行密钥、修改密码、查看登录会话
- 对子应用来说，可以把登录、权限校验、配额限制、访问事件统计全部接入到同一个中心

## 二、当前主要功能

### 1. 认证能力

- 用户名 + 密码登录
- GitHub OAuth 登录与绑定
- Passkey 注册与登录
- 基于 JWT 的子应用校验
- 管理员独立登录

### 2. 会话能力

- 用户浏览器使用 Cookie 会话
- 所有用户登录会话写入 D1 的 `user_sessions` 表
- 用户可以查看自己的登录会话
- 用户可以关闭任意会话
- 关闭当前会话后会立即退出登录

### 3. 管理后台能力

- 用户管理
- 应用管理
- 用户-应用权限分配
- 配额与限额管理
- 管理员 GitHub 绑定
- 管理员 Passkey 管理

### 4. 统计能力

- 基于 Cloudflare Analytics Engine 的访问统计
- `Statistics` 页面只统计最近 7 天
- 只统计访问类事件，不统计配额消耗类内部事件
- 大数字自动显示为 `K`、`M`、`G` 等单位
- 所有统计数字统一四舍五入保留两位小数
- 国家请求占比展示
- 保留 Raw Analytics Payload 调试面板

## 三、技术架构

### 后端

- Cloudflare Workers
- Hono 路由
- D1 数据库
- Analytics Engine 数据集

### 前端

- React
- Vite
- Lucide React 图标
- Recharts 图表
- 基于设计 Token 的浅色 / 暗黑主题系统

### 关键文件

- `src/index.ts`
  - Worker 主入口
  - 登录、GitHub、Passkey、统计、管理接口
- `src/App.tsx`
  - 管理后台主界面
  - 统计页
  - 路由入口
- `src/UserLogin.tsx`
  - 用户登录页
- `src/UserHome.tsx`
  - 用户账户中心首页
- `src/SessionCenter.tsx`
  - 登录会话中心
- `src/ChangePassword.tsx`
  - 用户修改密码页
- `src/SsoBinding.tsx`
  - 用户 GitHub 绑定页
- `src/UserPasskeyManage.tsx`
  - 用户通行密钥管理页
- `src/AdminPasskeyManage.tsx`
  - 管理员通行密钥管理页
- `src/theme.tsx`
  - 主题切换逻辑
- `src/index.css`
  - 设计 Token 与主题样式
- `schema.sql`
  - 全量表结构
- `migrate-user-sessions.sql`
  - 用户会话表迁移脚本

## 四、数据结构说明

### 主要表

- `users`
  - 用户账号信息
  - 密码 hash / salt
  - GitHub 绑定
  - Cookie 过期天数
- `apps`
  - 子应用信息
  - 回调地址
  - 应用 secret
- `user_apps`
  - 用户与应用的权限映射
  - 请求配额与 token 配额
- `passkeys`
  - 用户或管理员的 WebAuthn 凭据
- `user_sessions`
  - 用户登录会话
  - 登录时间、IP、浏览器、设备、来源 app、过期时间、撤销时间

### 统计数据集

Analytics Engine 数据集名为 `auth-center`，统计页通过 SQL API 聚合查询数据。

## 五、部署步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 `wrangler.toml`

至少需要确认以下配置：

- Worker 名称
- 自定义域名 route
- D1 绑定
- Analytics Engine 绑定
- 管理员账号密码
- JWT_SECRET
- GitHub OAuth 配置
- Cloudflare 账号 ID
- Cloudflare API Token

### 3. 初始化数据库

新环境建议直接执行完整 schema：

```bash
npx wrangler d1 execute auth-center-db --local --file=./schema.sql
npx wrangler d1 execute auth-center-db --remote --file=./schema.sql
```

如果是旧环境补充“会话中心”能力，则需要执行：

```bash
npx wrangler d1 execute auth-center-db --remote --file=./migrate-user-sessions.sql
```

### 4. 构建与发布

```bash
npm run build
npx wrangler deploy
```

## 六、本地开发

```bash
npm install
npm run build
npx wrangler dev
```

如果只想跑前端开发服务器：

```bash
npm run dev
```

## 七、环境变量说明

示例：

```toml
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "your-admin-password"
JWT_SECRET = "your-jwt-secret"
CF_ACCOUNT_ID = "your-cloudflare-account-id"
CF_API_TOKEN = "your-cloudflare-api-token"
GITHUB_CLIENT_ID = "your-github-client-id"
GITHUB_CLIENT_SECRET = "your-github-client-secret"
ADMIN_GITHUB_ID = "your-admin-github-id"
```

## 八、页面与路由说明

### 1. 管理员登录页

入口：

- `/`

特点：

- 只允许管理员登录
- 支持浅色 / 暗黑模式
- 页面下方有 `Users Here` 按钮，供普通用户进入用户登录页

### 2. 管理后台

主要 Tab：

- Users
- Applications
- Permissions
- Statistics

顶部操作：

- 主题切换
- Admin Passkeys
- Admin GitHub Bind

### 3. 用户登录页

路径：

- `/users/`

规则：

- 只允许普通用户使用用户名 + 密码登录
- admin 账号不能从这里登录
- 登录成功后创建 Cookie 会话
- 自动跳转回原始目标页，或者跳转到 `/{uuid}`

### 4. 用户账户中心

路径：

- `/{uuid}`

页面入口按钮：

- Bind GitHub
- Bind Passkey
- Change Password
- Login Sessions

### 5. 登录会话中心

路径：

- `/session`

展示字段：

- 登录时间
- IP 地址
- 浏览器类型
- 设备类型
- 登录来源 app
- 过期时间

支持功能：

- 一键关闭指定会话
- 如果关闭的是当前会话，则立即退出登录

### 6. 管理员 Passkey 管理页

路径：

- `/admin/passkey`

行为说明：

- 直接使用当前 admin 登录状态
- 不跳转到用户登录页
- 只管理管理员自己的 passkey

## 九、用户自助链路说明

管理员侧复制给用户的链接格式保持不变：

- `/{uuid}/change-password`
- `/{uuid}/sso-binding`
- `/{uuid}/passkey`

现在这些链接的行为是：

- 如果用户已有有效会话，直接打开目标功能页
- 如果用户未登录，先跳到 `/users/?redirect=...`
- 用户登录完成后，再自动跳回原始目标页

### 1. 修改密码

旧逻辑：

- 需要输入旧密码

新逻辑：

- 只验证当前用户会话
- 页面只要求输入新密码和确认新密码

### 2. GitHub 绑定

旧逻辑：

- 先输入密码验证，再跳 GitHub

新逻辑：

- 直接基于当前用户会话生成短期 bind token
- 再跳转到 GitHub OAuth

### 3. Passkey 管理

旧逻辑：

- 先输入密码验证

新逻辑：

- 基于当前用户会话直接生成 bind token
- 进入 passkey 管理和新增流程

## 十、管理员 Passkey 逻辑

管理员顶部 `Passkeys` 按钮现在已经独立实现，不再走普通用户链路。

### 当前行为

- 点击后进入 `/admin/passkey`
- 页面只校验当前管理员登录状态
- 后端通过 `/admin/bind-token` 生成 admin 的 bind token
- 后续 passkey 注册、重命名、删除都针对 admin 自身进行

### 与普通用户链路的区别

- 普通用户依赖 Cookie 会话
- 管理员依赖当前 admin 登录 header
- 管理员不会被重定向到 `/users/`

## 十一、统计页口径说明

### 1. 时间范围

`Statistics` 页面只统计最近 7 天的数据，不会把所有历史数据累加到一起。

### 2. 统计事件范围

只纳入以下访问类事件：

- `page_view`
- `login_success`
- `sso_auto_login`

### 3. 不纳入访问量的事件

例如：

- `quota_consume`

这些内部写入不会算进访问总量，避免把 token 消耗误统计成访问次数。

### 4. 显示规则

- `Total Visits` 使用 `K / M / G / T` 紧凑单位
- 所有数字统一保留两位小数
- 国家维度只保留“各国请求占比”展示
- 原始聚合结果仍可在 `Raw Analytics Payload` 中查看

## 十二、主要接口清单

### 认证与会话

- `POST /login`
- `POST /api/users/login`
- `POST /api/logout`
- `GET /logout`
- `GET /api/session`
- `GET /api/user/session`

### 用户自助

- `POST /api/user/bind-token`
- `POST /api/user/change-password`
- `GET /api/user/sessions`
- `DELETE /api/user/sessions/:sessionId`

### GitHub

- `GET /api/github/login`
- `GET /api/github/callback`

### Passkey

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

### 管理后台

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

### 子应用对接

- `GET /api/verify?app_id=...`
- `GET /api/quota/check?uuid=...&app_id=...`
- `POST /api/quota/consume`
- `POST /api/track`

## 十三、子应用接入示例

### 1. 发起 SSO 登录

```javascript
function loginWithSSO() {
  const ssoUrl = 'https://accounts.aryuki.com';
  const appId = 'your-app-id';
  const returnUrl = `${window.location.origin}/sso-callback`;

  window.location.href = `${ssoUrl}/?client_id=${appId}&redirect=${encodeURIComponent(returnUrl)}`;
}
```

### 2. 处理回调

```javascript
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

if (token) {
  localStorage.setItem('app_session', token);
  window.location.href = '/dashboard';
}
```

### 3. 子应用后端校验用户

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

## 十四、统一退出登录

### 方案一：重定向退出

```text
GET https://accounts.aryuki.com/logout?redirect=<你的返回地址>
```

### 方案二：API 退出

```javascript
await fetch('https://accounts.aryuki.com/api/logout', {
  method: 'POST',
  credentials: 'include',
});
```

注意：

- 必须带 `credentials: 'include'`
- 否则浏览器不会把 `sso_session` Cookie 发回认证中心
- 结果就是看起来请求成功了，但实际上 SSO 会话没有被清掉

## 十五、上线后建议检查项

- 管理员登录是否正常
- `Users Here` 是否正确跳到 `/users/`
- 普通用户登录后是否进入 `/{uuid}`
- `/{uuid}/change-password` 未登录时是否先跳 `/users/`
- `/session` 是否能看到当前会话信息
- 是否能成功关闭一个历史会话
- `/admin/passkey` 是否直接打开 admin passkey 管理页
- `Statistics` 是否只显示最近 7 天数据
- 国家请求占比是否显示正常

## 十六、运维建议

如果后续准备长期维护，建议再补以下内容：

- 数据库迁移版本管理规范
- 子应用接入模板仓库
- 接口契约文档自动化
- 前端组件进一步拆分
- 大包按路由拆包优化
