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

## 2. API 使用指南

所有的 `/admin/*` 路由均受 Basic 鉴权保护。你需要在 `wrangler.toml` 设置 `ADMIN_USERNAME` 与 `ADMIN_PASSWORD` 这对默认管理员密码。

### 管理控制台 (Web UI)
这个项目已经附带了一个**可视化的后台管理面板**。部署后直接访问你的 Workers 域名（或者配置好的自定义域名），即可通过管理员账密登录。
- **用户管理**：创建账户与限制访问权限，支持立刻暂停或恢复。
- **应用管理**：注册新的 Web Apps 接入此中心。
- **权限管理矩阵**：指定哪些用户有权登录哪些 App 的可视化界面映射。
- **Analytics 数据看板**：整合了 Cloudflare GraphQL 的内置图表，查看整体登入行为统计与客户端环境占比。

### 接口调用范例：子应用对接 SSO 流水线

#### 1. OAuth 风格前端无感知对接 (推荐)

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

#### 2. 服务端 / API 层加密校验
子应用本身的后端处理高敏数据时，请在每一个需要权限的路由加上类似以下的中间件，来确认当前的 Token 以及查询请求者对特定 App ID 的访问权是否处于“Active”未被暂停的状态：

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
更多配置详见源码 `src/` 结构与 `wrangler.toml` 环境设置。
