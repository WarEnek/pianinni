# Pianinni Deployment Guide (VPS + Portainer + Nginx Proxy Manager)

## Prerequisites

- VPS with Docker and Portainer
- Nginx Proxy Manager (NPM) already deployed

## 1. Create Shared Network (if not exists)

NPM and Pianinni must be on the same Docker network. Create it once:

```bash
docker network create proxy
```

Connect NPM to this network (Portainer: NPM container → Duplicate/Edit → add network `proxy`).

## 2. Deploy via Portainer

### Option A: Stack (recommended)

1. Portainer → Stacks → Add stack
2. Name: `pianinni`
3. Web editor: paste contents of `docker-compose.yml`
4. Deploy the stack

### Option B: Build & Run manually

```bash
docker build \
  -t pianinni:latest .

docker run -d --name pianinni --network proxy --restart unless-stopped pianinni:latest
```

## 4. Configure Nginx Proxy Manager

1. NPM → Hosts → Proxy Hosts → Add Proxy Host
2. **Domain**: your domain (e.g. `pianinni.example.com`)
3. **Forward Hostname**: `pianinni` (container name)
4. **Forward Port**: `80`
5. **Scheme**: `http`
6. Enable SSL (Let's Encrypt) if needed

## 5. Standalone (without NPM)

For local testing or direct port access:

```bash
docker compose -f docker-compose.standalone.yml up -d
```

App available at `http://localhost:3000`.

## Network Troubleshooting

If NPM uses a different network (e.g. `nginxproxymanager_default`), edit `docker-compose.yml`:

```yaml
networks:
  proxy:
    external: true
    name: nginxproxymanager_default  # or your NPM network name
```

Or connect Pianinni to NPM's network via Portainer UI after deployment.
