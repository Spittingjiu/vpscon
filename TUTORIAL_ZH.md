# glvps 安装与使用教程（标准版）

> 仓库：`https://github.com/Spittingjiu/vpscon`
> 适用系统：Debian / Ubuntu（有公网 IP 的 Linux 服务器）

---

## 0. 你会得到什么

> 说明：BitsFlow / Nosla 的 API 基地址已在程序里默认填好，无需你手动配置。

完成后，你会有一个可访问的 glvps 面板服务：

- 本机访问：`http://127.0.0.1:8787`
- 外网访问（示例）：`http://你的服务器IP:8787`

---

## 1. 登录服务器

在你自己的电脑终端执行（把 IP 换成你的）：

```bash
ssh root@你的服务器IP
```

---

## 2. 安装 Node.js 与 Git（如果未安装）

```bash
apt update
apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

检查版本：

```bash
node -v
npm -v
git --version
```

---

## 3. 拉取项目代码

```bash
cd /opt
git clone https://github.com/Spittingjiu/vpscon.git
cd /opt/vpscon
```

---

## 4. 安装依赖并测试启动

```bash
npm install
npm start
```

看到服务启动后，先按 `Ctrl + C` 停止（只是测试）。

---

## 5. 配置 systemd 开机自启

创建服务文件：

```bash
cat > /etc/systemd/system/vpscon.service << 'SYSTEMD'
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
SYSTEMD
```

加载并启动：

```bash
systemctl daemon-reload
systemctl enable --now vpscon.service
systemctl status vpscon.service --no-pager
```

---

## 6. 放行端口（8787）

如果你启用了防火墙：

```bash
ufw allow 8787/tcp
ufw reload
```

---

## 7. 访问面板

浏览器打开：

- `http://你的服务器IP:8787`

---

## 8. 常用运维命令

```bash
# 查看状态
systemctl status vpscon.service --no-pager

# 重启
systemctl restart vpscon.service

# 停止
systemctl stop vpscon.service

# 查看日志
journalctl -u vpscon.service -n 100 --no-pager
```

---

## 9. 更新项目

```bash
cd /opt/vpscon
git pull
npm install
systemctl restart vpscon.service
```

---

## 10. 卸载

```bash
systemctl disable --now vpscon.service
rm -f /etc/systemd/system/vpscon.service
systemctl daemon-reload
rm -rf /opt/vpscon
```

