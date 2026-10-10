# Going live: Render + your own .com domain

Players need only a browser and your web address. Nothing here involves Claude, and players never touch GitHub.

What it costs (check current prices on each site before paying):
- Render Starter web service, always on: about $7 a month, plus about $0.25 a month for the 1 GB disk.
- A .com domain: about $10–12 a year.
- Cloudflare DNS and protection: free.

## 1. Buy the domain (10 minutes)

Use Cloudflare Registrar (sells .com at cost, and you need Cloudflare for step 3 anyway):
1. Create a free account at dash.cloudflare.com.
2. Go to **Domain Registration → Register Domains** and search your name. Ideas: `gurugramlife.com`, `playgurugramlife.com`, `gurugramlifegame.com`, `gurgaonlife.com`.
3. Buy the one that is free. It's added to your Cloudflare account automatically.

## 2. Deploy the game on Render (10 minutes)

1. Create an account at render.com (sign in with GitHub). When asked, let Render's GitHub app access the `rateeshtrivedi/python` repository. This is only how the code reaches Render; players never see GitHub.
2. In Render, choose **New → Blueprint**, pick `rateeshtrivedi/python`, and choose the branch that holds this code.
3. Render reads `render.yaml` and shows one web service, `gurugram-life`, on the Starter plan in Singapore with a 1 GB disk. Add a payment card and click **Apply / Deploy**.
4. When the deploy turns green, open `https://gurugram-life.onrender.com` (Render shows the exact address). `/healthz` should say `{"ok":true,...}`.

## 3. Point your domain at the game (10 minutes, then up to an hour to take effect)

1. In Render: open the `gurugram-life` service → **Settings → Custom Domains** → add `yourdomain.com` and `www.yourdomain.com`. Render shows the DNS records it wants.
2. In Cloudflare: open your domain → **DNS → Records** and add what Render asked for. Usually that's:
   - `CNAME` · name `@` · target `gurugram-life.onrender.com`
   - `CNAME` · name `www` · target `gurugram-life.onrender.com`

   Set both to **DNS only** (grey cloud) for now.
3. Back in Render, click **Verify**. Render issues the HTTPS certificate on its own (a few minutes to an hour).
4. Optional, once `https://yourdomain.com` works: switch both records to **Proxied** (orange cloud), and in Cloudflare set **SSL/TLS → Overview → Full (strict)**. Cloudflare then shields the server from attacks. WebSockets work through Cloudflare without extra settings.

## 4. After launch

- **Updates:** every push to the deployed branch redeploys by itself (`autoDeploy` in `render.yaml`).
- **Player progress:** saved in `/var/data/world.json` on the Render disk, with a daily copy in `/var/data/backups/` (last 14 days kept). Render also snapshots disks daily.
- **Server full:** above 200 players online (`MAX_PLAYERS`; a load test showed Render Starter handles about 200 players crowded together), new visitors play in solo mode with a message to retry later. If that starts happening, upgrade the Render plan and raise `MAX_PLAYERS` in the service's Environment settings.
- **Logs:** Render → service → Logs. The server prints the number of players online every 10 minutes.

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | 3000 | Set by Render automatically |
| `DATA_DIR` | `./data` | Where progress and backups are saved (`/var/data` on Render) |
| `MAX_PLAYERS` | 300 (200 in render.yaml) | Live players before newcomers go to solo mode |
| `MAX_PER_IP` | 20 | Connections allowed from one network (homes, offices and colleges share one) |
| `NEW_ACCOUNTS_PER_IP_HOUR` | 30 | New players one network can create per hour |
| `PUBLIC_URL` | (from the request) | Your site address, e.g. `https://yourdomain.com`, used in share previews |

Load test (`node test/load.mjs 100 200 300`): with every player crowded into one spot, each player downloads about 17 KB/s whatever the crowd size, and the server uses roughly 15% of a CPU core at 100 players, 37% at 200 and 67% at 300. These numbers come from the test machine; Render's half-core Starter plan is why `render.yaml` caps live players at 200.
