# glvps 发布说明

仓库：`Spittingjiu/vpscon`

## 快速启动

```bash
npm install
npm start
```

默认监听：`http://127.0.0.1:8787`

## 生产部署（systemd 示例）

1. 安装依赖并放到服务器目录
2. 创建服务文件（示例）：

```ini
[Unit]
Description=glvps (bitsflow vps manager)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/vpscon
ExecStart=/usr/bin/node /opt/vpscon/server.mjs
Restart=always
RestartSec=3
User=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

3. 启动：

```bash
systemctl daemon-reload
systemctl enable --now vpscon.service
systemctl status vpscon.service
```

## 备注

- 项目默认数据目录：`data/`
- 若前端直连第三方 API 出现 Cloudflare challenge，请改用后端代理模式。
