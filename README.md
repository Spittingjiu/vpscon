# BitsFlow VPS Manager

后端代理模式的 VPS 管理页（避免前端直连 API 被 Cloudflare challenge 拦截）。

## 已完成
- VPS 列表加载（可自定义列表 API 路径）
- 单机动作：开机 / 关机 / 重启（可自定义动作路径模板）
- 支持 `X-API-Key` 或 `Authorization: Bearer ...`
- 本地保存配置（浏览器 localStorage）

## 运行
```bash
cd /root/.openclaw/workspace/bitsflow-vps-manager
npm install
PORT=3338 BITSFLOW_BASE=https://api.bitsflow.org npm start
```

## 一键部署（计划用于 GH 发布）
> 已记录：下一步会上 GitHub，并提供两条命令给其他人直接用。

- 本地直接部署（Node）
```bash
bash -c "git clone <GH_REPO_URL> glvps && cd glvps && npm i --production && cp .env.example .env && npm start"
```

- Docker 部署
```bash
docker run -d --name glvps -p 3338:3338 -v glvps-data:/app/data <GH_IMAGE>:latest
```

## 当前服务
- 本机地址：`http://127.0.0.1:3338`
- 健康检查：`/healthz`

## 可配置环境变量
- `PORT`：服务端口（默认 3338）
- `BITSFLOW_BASE`：BitsFlow API 基地址（默认 `https://api.bitsflow.org`）
