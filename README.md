# VPSCon

一个自托管的多厂商 VPS 管理面板，适合日常服务器运维操作。

VPSCon 提供一个统一的 Web 控制台，用来集中管理不同厂商的 VPS 实例。它更适合个人、自用面板、小团队运维，或者希望把常见服务器操作整合到一个轻量后台中的用户。

## 功能特性

- 多厂商 VPS 管理
- 按厂商隔离 Token 存储
- 聚合展示多厂商服务器列表
- 电源操作
  - 开机
  - 关机
  - 重启
  - 强制断电
- 救援模式切换
- 重置系统密码
- 查看 VNC 信息
- ISO 管理
- SSH Key 管理
- 任务列表 / 操作记录查看
- 服务器改名
- 基础登录系统
- 可选 Cloudflare Turnstile 验证
- 针对敏感操作的状态反馈优化

## 当前支持的厂商

当前代码中已接入：

- BitsFlow
- Nosla

如果后端 API 结构接近，也可以继续扩展其他 VPS 厂商。

## 界面说明

这是一个单页式控制面板，主要包含：

- 服务器列表
- 分组操作入口
- 厂商切换
- 登录/注册区域
- 弹窗式快捷操作
- 操作状态反馈提示

如果你打算把它部署成公网管理面板，请务必开启 HTTPS，并做好访问控制。

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Spittingjiu/vpscon.git
cd vpscon
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动项目

```bash
npm start
```

默认端口：

- `3338`

启动后访问：

- `http://127.0.0.1:3338`

## 环境变量

你可以通过环境变量配置项目：

```bash
PORT=3338
BITSFLOW_BASE=https://scp-hk.bitsflow.cloud/api
NOSLA_BASE=https://scp.nosla.cloud/api
TOKEN_ENC_KEY=请替换成足够长的随机密钥
SESSION_TTL_MS=2592000000
TURNSTILE_SECRET=
TURNSTILE_SITE_KEY=
COOKIE_SECURE=true
PROXY_TIMEOUT_MS=12000
PROXY_CACHE_TTL_MS=4000
```

### 重要说明

- 生产环境建议必须设置 `TOKEN_ENC_KEY`
- 这个值应该足够长、足够随机
- 当 `COOKIE_SECURE=true` 时，请确保你跑在 HTTPS 后面
- 如果这个面板对公网开放，建议启用登录保护，并视情况启用 Turnstile 验证

## 生产部署建议

一个简单的生产部署组合可以是：

- Node.js
- PM2
- Nginx

### 使用 PM2 启动

```bash
pm2 start server.mjs --name vpscon
pm2 save
```

### Nginx 反向代理示例

```nginx
server {
    listen 80;
    server_name your-domain.example;

    location / {
        proxy_pass http://127.0.0.1:3338;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

然后再用 Let's Encrypt 或其他方式补上 HTTPS。

## 安全说明

这个项目可以执行敏感的 VPS 操作。

在生产环境使用前，建议至少做到：

- 启用 HTTPS
- 设置 `TOKEN_ENC_KEY`
- 限制后台访问范围
- 检查反向代理配置
- 不要在未登录保护的情况下暴露到公网
- 如果怀疑泄露，应立即轮换 VPS 厂商 Token

## 项目结构

```text
.
├── public/
│   └── index.html
├── data/
│   ├── settings.json
│   └── users.json
├── server.mjs
├── package.json
└── README.md
```

## 适用场景

这个项目更适合：

- 个人自用运维面板
- 小型内部管理工具
- 多厂商 VPS 集中管理
- 快速搭建自托管控制台

它目前还不是一个“企业级高安全控制平面”，如果你要在更严格的环境使用，建议继续补权限、审计和安全策略。

## 后续可扩展方向

你可以继续往这些方向增强：

- 更细的角色权限控制
- 更完整的任务轮询与结果状态展示
- 操作审计日志
- 更清晰的厂商抽象层
- 更好的移动端体验
- 更完整的操作反馈链路
- Token 管理增强

## License

请根据你的开源方式补充 License。

如果你希望别人更容易使用和复用，MIT 通常是最简单的选择。

---

如果你准备将这个项目部署到公网，请先审查代码和安全策略，再正式开放访问。
