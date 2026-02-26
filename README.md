# BitsFlow VPS Manager

一个面向多站点云主机的 Web 控制台项目，目标是把日常 VPS 管理操作集中到一个简洁页面里完成。

这个项目采用**后端代理模式**对接 BitsFlow / Nosla API，避免浏览器前端直连时被 Cloudflare challenge 或跨域策略拦截，提升可用性与稳定性。

## 项目简介
- 支持多账号 Token 管理与隔离（按 provider + token 组织）
- 支持服务器列表聚合展示（BitsFlow / Nosla 同屏查看）
- 提供常用运维动作：开关机、重启、救援模式、密码重置
- 提供进阶能力：系统重装、模板加载、VNC、ISO、任务、SSH Key 管理
- 内置用户登录、会话、CSRF 与可选验证码配置，适合直接部署到生产环境

## 内置默认 API（已预填，无需手动配置）
- BitsFlow：`https://scp-hk.bitsflow.cloud/api`
- Nosla：`https://scp.nosla.cloud/api`

> 你只需要登录面板后导入 Token，不需要再填 API 基地址。

## 快速运行
```bash
git clone https://github.com/Spittingjiu/vpscon.git
cd vpscon
npm install
npm start
```

默认监听：`http://127.0.0.1:8787`

## 部署

### systemd（推荐）
参考：`RELEASE.md`

### Docker（一条命令）
```bash
docker run -d --name vpscon \
  -p 8787:8787 \
  -v /opt/vpscon-data:/app/data \
  -v /opt/vpscon-app:/app \
  -w /app \
  --restart unless-stopped \
  node:20-bookworm \
  bash -lc "if [ ! -f package.json ]; then git clone https://github.com/Spittingjiu/vpscon.git /app; fi && npm install --omit=dev && node server.mjs"
```

## 教程
- 标准教程：[TUTORIAL_ZH.md](./TUTORIAL_ZH.md)
- 傻瓜式教程：[TUTORIAL_ZH_DUMMY.md](./TUTORIAL_ZH_DUMMY.md)

## 权限与安全设置
- 普通用户：可登录、管理自己的 Token、操作服务器
- `admin` 用户：在页面右上角会显示“安全设置”入口，可开启/关闭 Cloudflare Turnstile 验证
- 开启后：登录/注册都会要求验证码（用于降低机器注册与暴力尝试风险）

## 可选环境变量（不配也能用）
- `PORT`：服务端口（默认 `8787`）
- `BITSFLOW_BASE`：覆盖 BitsFlow API 基地址（默认内置值）
- `NOSLA_BASE`：覆盖 Nosla API 基地址（默认内置值）
- `TOKEN_ENC_KEY`：Token 加密密钥（建议生产环境配置）

## 健康检查
- `GET /healthz`（会返回当前使用中的 bases）
