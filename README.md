# NeonType — Multiplayer Typing Race

A minimal browser multiplayer typing race game with neon-arcade aesthetics.
Type the shared passage faster and more accurately than your friends to move
your car across the finish line first.

## Tech

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + Framer Motion (UI / animation)
- Socket.io (realtime)
- Prisma + PostgreSQL (results persistence)

## Project structure

```
typing-race/
├── app/                     # Next.js routes
│   ├── page.tsx             # landing
│   ├── lobby/[code]/        # lobby
│   ├── race/[code]/         # race screen
│   ├── results/[code]/      # results
│   └── api/                 # route handlers (room create + results)
├── components/              # reusable UI (Car, RaceTrack, TypingArea, ...)
├── hooks/                   # useSocket, useTypingEngine
├── lib/                     # prisma, socket client, passages, utils
├── server/                  # standalone Socket.io server + RoomManager
├── socket/                  # shared event types
├── prisma/                  # schema.prisma
└── types/                   # shared TS types
```

Two processes run side by side in dev:

- `next dev` (port 3000) — UI + Next.js API routes
- `tsx watch server/index.ts` (port 4000) — Socket.io realtime server

## Run locally

### 1. Install dependencies

```bash
cd typing-race
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# edit DATABASE_URL if your PostgreSQL is not on localhost:5432
```

### 3. Start PostgreSQL

Any local PostgreSQL works. Quickest path with Docker:

```bash
docker run --name typing-race-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=typing_race \
  -p 5432:5432 -d postgres:16
```

### 4. Push schema + generate client

```bash
npm run db:push
npm run db:generate
```

### 5. Start dev (web + socket together)

```bash
npm run dev
```

Open <http://localhost:3000>.

To verify multiplayer, open the same page in a second browser window (or an
incognito tab), enter a different username, and join with the room code.

## Game flow

1. Landing — enter username, then **Create room** or join with a 6-char code.
2. Lobby — share the code with friends. The host clicks **Start race**.
3. Countdown — 3-second arcade countdown.
4. Race — type the passage. Correct characters move your car; mistakes must be
   corrected with backspace before you can continue.
5. Results — leaderboard with WPM, accuracy, and finishing position. Pick
   **Rematch** to run another round in the same room.

## Production build (single host)

```bash
npm run build      # builds Next.js + compiles the socket server to dist/
npm run start      # runs both web (3000) and socket server (4000)
```

## Deploy: Vercel + Fly.io + Neon (always-on, ~free)

Vercel can host the Next.js frontend but **cannot** host the Socket.io server
(serverless functions don't support persistent WebSocket connections or shared
in-memory state). The realtime piece runs on Fly.io with `min_machines_running = 1`,
which keeps the VM up 24/7 without an idle shutdown.

```
┌────────────┐         WSS         ┌────────────────────┐
│  Browser   │ ─────────────────▶ │  Fly.io machine    │
│  (Vercel)  │ ◀───────────────── │  Socket.io + Node  │
└─────┬──────┘                     └─────────┬──────────┘
      │ HTTPS                                │ Postgres
      ▼                                      ▼
┌────────────┐                       ┌────────────────────┐
│  Vercel    │ ─── reads results ──▶ │  Neon (Postgres)   │
└────────────┘                       └────────────────────┘
```

### 1. Provision Postgres on Neon

1. Create a project at <https://console.neon.tech/>.
2. Copy the **pooled** connection string for Vercel (serverless) and the
   **direct** connection string for Fly (long-running). Either works for both;
   Neon's pooler is fine in both contexts.
3. Apply the schema once from your laptop:

   ```bash
   DATABASE_URL="postgresql://...neon.tech/..." npx prisma db push
   ```

### 2. Deploy the socket server to Fly.io

```bash
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
fly auth login

# Edit fly.toml first — change `app = "neontype-socket"` to a globally unique name.
fly launch --no-deploy --copy-config

# Inject secrets (do NOT commit these)
fly secrets set \
  DATABASE_URL="postgresql://...neon.tech/..." \
  CLIENT_ORIGIN="https://your-vercel-app.vercel.app"

fly deploy
```

The `fly.toml` in this repo sets `auto_stop_machines = false` and
`min_machines_running = 1`, so the machine stays running with no idle timeout.
Verify with `fly status` — you should see one machine in `started` state.

Note your app URL — it's `https://<app-name>.fly.dev`. You'll wire it into
Vercel next.

### 3. Deploy the frontend to Vercel

1. Push this repo to GitHub.
2. Import it at <https://vercel.com/new>. Vercel auto-detects Next.js.
3. Under **Environment Variables**, add:

   | Key                       | Value                                                |
   | ------------------------- | ---------------------------------------------------- |
   | `DATABASE_URL`            | Your Neon connection string                          |
   | `NEXT_PUBLIC_SOCKET_URL`  | `https://<your-fly-app>.fly.dev`                     |

4. Deploy. Vercel runs `npm run vercel-build` (`prisma generate && next build`).

### 4. Update Fly's `CLIENT_ORIGIN` to your final Vercel URL

```bash
fly secrets set CLIENT_ORIGIN="https://<your-vercel-app>.vercel.app"
```

(Optionally comma-separate to allow preview deployments:
`https://prod.vercel.app,https://*.vercel.app` — note that Socket.io's CORS
does not honor wildcards, so list each explicitly.)

### Why it stays always-on

- **Vercel** never sleeps the frontend — static + SSR responses serve from the
  edge / on-demand serverless without a cold-shutdown window.
- **Fly.io** with `auto_stop_machines = false` + `min_machines_running = 1`
  keeps the socket VM running 24/7 regardless of traffic. The 15-min idle
  shutdown some platforms enforce does not apply here.
- **Neon** doesn't pause connections on its free plan; only fully inactive
  *projects* are eventually paused (no impact on an actively-deployed app).

No external uptime pinger is required. If you want one anyway as defense in
depth, point UptimeRobot at `https://<your-fly-app>.fly.dev/health`.

## Notes

- For the MVP there is no auth — each player is identified by the username
  they enter on the landing page. Results are persisted under that username.
- Room state lives in-memory on the socket server. To scale beyond one Fly
  machine, swap `RoomManager` for a Redis-backed adapter and enable the
  Socket.io Redis adapter.
