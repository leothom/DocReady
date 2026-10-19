# DocReady production deployment

Deploy DocReady on the same Alibaba Cloud Hong Kong server as SlideReady (8.210.219.205).

## Architecture

SlideReady already runs Caddy on host ports 80/443. DocReady cannot start its own Caddy on the same ports. Solution: run DocReady app-only (no `web` service) and add a `docready.xyz` site block to SlideReady's existing Caddy.

## One-time server setup

SSH to the server as root:

```sh
ssh vps   # or ssh root@8.210.219.205 with the correct key
```

Clone DocReady next to SlideReady (use a deploy key or a clean git archive; never embed a token in the clone URL):

```sh
cd /opt
git clone https://github.com/leothom/DocReady.git docready
cd docready
```

Copy the env templates:

```sh
install -m 600 deploy/server.env.example deploy/server.env
install -m 600 deploy/site.env.example deploy/.env
```

Edit `deploy/.env`:
- `SITE_HOST=docready.xyz`
- `DOCREADY_IMAGE=docready:FULL_COMMIT_SHA`

Edit `deploy/server.env` (mode 600):
- `DEEPSEEK_API_KEY` (DocReady's own key)
- `SESSION_SECRET`: generate with `openssl rand -hex 32`
- `PILOT_INVITE_SECRET`: generate with `openssl rand -hex 32`
- `PILOT_ENABLED=false` until release check passes

## Build and run (app only, no Caddy)

```sh
cd /opt/docready
docker build -t docready:FULL_COMMIT_SHA .
```

Override ports and remove the `web` service via a compose override at `deploy/compose.override.yaml`:

```yaml
services:
  app:
    ports:
      - "127.0.0.1:3200:3100"
  web:
    active: false
```

Start:

```sh
docker compose -f deploy/compose.yaml -f deploy/compose.override.yaml --env-file deploy/.env up -d
```

App now reachable on the host at 127.0.0.1:3200 only.

## Add docready.xyz to SlideReady's Caddy

Edit SlideReady's `deploy/Caddyfile` and append:

```caddy
docready.xyz {
    request_body {
        max_size 2MB
    }
    header Strict-Transport-Security "max-age=31536000"
    reverse_proxy host.docker.internal:3200 {
        header_up X-DocReady-Client {remote_host}
    }
}
```

Grant Caddy host-network access. In SlideReady's `deploy/compose.yaml`, add to the `web` service:

```yaml
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

Reload SlideReady's Caddy:

```sh
cd /opt/slideready/deploy
docker compose up -d web
```

## Verify

```sh
curl -I https://docready.xyz
```

Expected: HTTP 200 with `Strict-Transport-Security` header.

## Set admin password

```sh
docker exec -it docready-app-1 node scripts/admin-setup.mjs
```

## Rollback

Keep the previous image tag. Redeploy with:

```sh
DOCREADY_IMAGE=docready:PREVIOUS_SHA docker compose -f deploy/compose.yaml -f deploy/compose.override.yaml --env-file deploy/.env up -d
```
