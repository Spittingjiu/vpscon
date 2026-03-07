# VPSCon

A self-hosted multi-provider VPS control panel focused on daily server operations.

VPSCon provides a clean web interface for managing VPS instances across different providers from one place. It is designed for personal use, small teams, and operators who want a lightweight dashboard for common infrastructure actions without opening multiple provider panels.

## Features

- Multi-provider VPS management
- Provider-isolated token storage
- Server list aggregation across providers
- Power operations
  - Boot
  - Shutdown
  - Restart
  - Force power off
- Rescue mode toggle
- Password reset
- VNC information lookup
- ISO management
- SSH key management
- Task list / operation history lookup
- Server rename
- Basic login system with optional Turnstile protection
- Improved operation feedback UX for sensitive actions

## Supported Providers

Current codebase includes support for:

- BitsFlow
- Nosla

The architecture is simple enough to extend for other providers with similar APIs.

## Screenshots / UI

The UI is a single-page control panel with:

- server list view
- grouped operation actions
- provider switching
- auth panel
- modal-based quick actions
- operation status feedback

If you plan to use this as a public-facing admin panel, you should put it behind HTTPS and restrict access carefully.

## Quick Start

### 1. Clone

```bash
git clone https://github.com/Spittingjiu/vpscon.git
cd vpscon
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start

```bash
npm start
```

Default port:

- `3338`

Then open:

- `http://127.0.0.1:3338`

## Environment Variables

You can configure the app with environment variables:

```bash
PORT=3338
BITSFLOW_BASE=https://scp-hk.bitsflow.cloud/api
NOSLA_BASE=https://scp.nosla.cloud/api
TOKEN_ENC_KEY=replace-with-a-long-random-secret
SESSION_TTL_MS=2592000000
TURNSTILE_SECRET=
TURNSTILE_SITE_KEY=
COOKIE_SECURE=true
PROXY_TIMEOUT_MS=12000
PROXY_CACHE_TTL_MS=4000
```

### Important

- `TOKEN_ENC_KEY` should be set in production
- use a strong random value
- run behind HTTPS when `COOKIE_SECURE=true`
- if you expose this panel publicly, you should enable authentication and consider Turnstile protection

## Production Deployment

A simple production setup can use:

- Node.js
- PM2
- Nginx

### Example with PM2

```bash
pm2 start server.mjs --name vpscon
pm2 save
```

### Example Nginx reverse proxy

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

Then add HTTPS with Let's Encrypt or your preferred certificate solution.

## Security Notes

This project can execute sensitive VPS operations.

Before using it in production, you should:

- enable HTTPS
- set `TOKEN_ENC_KEY`
- restrict who can access the panel
- review reverse proxy settings
- avoid exposing it without authentication
- rotate provider tokens if a leak is suspected

## Project Structure

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

## Intended Use

This project is best suited for:

- personal operations dashboards
- small internal admin tools
- multi-provider VPS management
- rapid self-hosted control panels

It is not yet positioned as a hardened enterprise control plane.

## Roadmap Ideas

Possible future improvements:

- stronger role-based access control
- richer task status polling
- action audit log
- better provider abstraction
- mobile-first UX improvements
- more detailed operation result feedback
- token import/export management

## License

Add the license that matches your intended distribution model.
If you want public reuse, MIT is usually the simplest option.

---

If you use this project in production, review the code and security model carefully before exposing it to the internet.
