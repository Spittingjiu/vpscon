# BitsFlow VPS Manager (glvps)

后端代理模式 VPS 管理页（避免前端直连 API 被 Cloudflare challenge 拦截）。

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

## 生产部署（systemd）
参考：`RELEASE.md`

## 可选环境变量（不配也能用）
- `PORT`：服务端口（默认 `8787`）
- `BITSFLOW_BASE`：覆盖 BitsFlow API 基地址（默认内置值）
- `NOSLA_BASE`：覆盖 Nosla API 基地址（默认内置值）
- `TOKEN_ENC_KEY`：Token 加密密钥（建议生产环境配置）

## 健康检查
- `GET /healthz`（会返回当前使用中的 bases）
