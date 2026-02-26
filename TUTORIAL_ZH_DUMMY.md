# glvps 傻瓜式教程（把你当“只有手”也能做完）

> 你不用懂原理，不用会 Linux。照抄命令，一步一步按就行。  
> 只要你有：一台服务器 IP + root 密码。

---

## A. 先准备

> 说明：API 基地址已经内置好了，你不用填任何接口地址。

你手里要有这 3 样：

1. 服务器 IP（例如 `1.2.3.4`）
2. root 密码
3. 一台能打开终端的电脑（Mac / Windows 都行）

---

## B. 连上服务器

### 如果你是 Mac / Linux：

打开“终端”，输入：

```bash
ssh root@你的服务器IP
```

例子：

```bash
ssh root@1.2.3.4
```

第一次会问你 `yes/no`，输入：

```bash
yes
```

然后输入 root 密码（输入时屏幕不显示字符，正常），回车。

### 如果你是 Windows：

- 打开 PowerShell，执行同样命令：

```bash
ssh root@你的服务器IP
```

---

## C. 一次性复制粘贴下面整段（最关键）

> 登录成功后，把下面整段**完整复制**，一次性粘贴到终端里，按回车。

```bash
apt update && apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
cd /opt
git clone https://github.com/Spittingjiu/vpscon.git
cd /opt/vpscon
npm install
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
systemctl daemon-reload
systemctl enable --now vpscon.service
ufw allow 8787/tcp || true
ufw reload || true
systemctl status vpscon.service --no-pager
```

---

## D. 看结果（只看这一条）

如果最后状态里看到类似：

- `Active: active (running)`

就说明成功了。

---

## E. 打开网页

在你电脑浏览器输入：

```text
http://你的服务器IP:8787
```

例子：

```text
http://1.2.3.4:8787
```

看到 glvps 页面 = 完成。

---

## F. 以后就记这 4 条

```bash
# 看服务状态
systemctl status vpscon.service --no-pager

# 重启服务
systemctl restart vpscon.service

# 看最近日志
journalctl -u vpscon.service -n 100 --no-pager

# 更新
cd /opt/vpscon && git pull && npm install && systemctl restart vpscon.service
```

---

## G. 失败时只做这件事

把这条命令输出完整复制给我：

```bash
journalctl -u vpscon.service -n 200 --no-pager
```

不要自己猜，不要自己乱改。把输出贴过来，我给你下一步。

