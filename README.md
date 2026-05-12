# NeonType — Multiplayer Typing Race

A browser multiplayer typing race game with neon-arcade aesthetics. Type the
shared passage faster and more accurately than your friends to move your car
across the finish line first.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + Framer Motion (UI / animation)
- **Pusher Channels** (free Sandbox) for realtime — presence channels +
  client events. No custom server.
- **Redux Toolkit** for state, with localStorage persistence for username
  and your last 20 race results.

The whole app runs on a single Vercel free deployment. No database, no
backend server, no credit card.

## Project structure

```
typing-race/
├── app/
│   ├── page.tsx                       # landing
│   ├── lobby/[code]/page.tsx          # lobby
│   ├── race/[code]/page.tsx           # race screen
│   ├── results/[code]/page.tsx        # results
│   └── api/
│       ├── room/route.ts              # POST → returns a fresh 6-char code
│       └── pusher/auth/route.ts       # signs presence channel auth
├── components/                         # Car · RaceTrack · TypingArea · …
├── hooks/
│   ├── useRoomChannel.ts              # Pusher channel + Redux glue
│   └── useTypingEngine.ts             # keyboard state + WPM/accuracy
├── lib/
│   ├── pusher.ts                      # browser Pusher singleton
│   ├── pusherServer.ts                # server Pusher SDK (auth signing)
│   ├── passages.ts                    # easy/medium/hard text tiers
│   ├── store/                         # Redux store, slices, Provider
│   └── utils.ts
└── types/                              # shared TS types
```

## Run locally

### 1. Install

```bash
npm install
```

### 2. Sign up at Pusher (free, no card)

1. Go to <https://dashboard.pusher.com/accounts/sign_up>, sign up (GitHub OAuth works).
2. **Create app** → pick "Channels" → name it anything → pick a cluster (e.g. `ap2` for
   Asia/Mumbai, `us2` for US-east) → "Create app".
3. Open the app → **App Keys** tab. Copy `app_id`, `key`, `secret`, `cluster`.
4. Open the **App Settings** tab → scroll to **Features** → tick
   **Enable client events** → Save. (Without this, the realtime layer won't work.)

### 3. Configure environment

```bash
cp .env.example .env.local
# paste your Pusher app_id / key / secret / cluster into the matching variables
# (both PUSHER_KEY/CLUSTER and NEXT_PUBLIC_PUSHER_KEY/CLUSTER — same values)
```

### 4. Start dev

```bash
npm run dev
```

Open <http://localhost:3000>. Use a second browser window (or incognito tab)
with a different username to test multiplayer.

## Game flow

1. **Landing** — enter username, **Create room** (returns a 6-char code) or
   join with a code.
2. **Lobby** — share the code. Host picks Easy/Medium/Hard. Host clicks **Start race**.
3. **Countdown** — synced 3-second countdown based on the host's `startsAt` timestamp.
4. **Race** — type the passage. Correct chars move your car; mistakes must be
   corrected with backspace. Your car stays fixed; the road, finish line, and
   other cars move relative to your progress.
5. **Results** — leaderboard with WPM, accuracy, and finish position. Pick
   **Rematch** to run another round in the same room.

## Deploy to Vercel

The whole project deploys as one Vercel project. No external host needed
besides Pusher.

### 1. Push to GitHub

```bash
git push origin main
```

### 2. Import on Vercel

1. Go to <https://vercel.com/new>, **Import Project** from your GitHub repo.
2. Vercel auto-detects Next.js — no settings to change.
3. Before clicking Deploy, expand **Environment Variables** and add:

   | Name                          | Value                              |
   | ----------------------------- | ---------------------------------- |
   | `PUSHER_APP_ID`               | from Pusher dashboard              |
   | `PUSHER_KEY`                  | from Pusher dashboard              |
   | `PUSHER_SECRET`               | from Pusher dashboard              |
   | `PUSHER_CLUSTER`              | e.g. `ap2`, `us2`, `mt1`           |
   | `NEXT_PUBLIC_PUSHER_KEY`      | same value as `PUSHER_KEY`         |
   | `NEXT_PUBLIC_PUSHER_CLUSTER`  | same value as `PUSHER_CLUSTER`     |

4. Deploy.

That's it — your app is live at `https://<project>.vercel.app`. Vercel never
sleeps the frontend; Pusher's free tier holds your WebSocket connections.

### Free-tier limits (Sandbox)

- 100 concurrent connections (= roughly 100 simultaneous players online)
- 200,000 messages/day (a 30s race with 4 players uses ~1,200 messages →
  well over 100 races/day)
- 10 client events per second per connection (the typing engine emits at 10Hz)

## Notes

- **Authority model**: there is no central server-of-truth. Each client
  publishes its own progress over the presence channel via client events,
  and Redux on each browser aggregates. The host's client is the one that
  picks the passage and broadcasts the start timestamp.
- **Persistence**: per-player race history is stored in `localStorage` via
  Redux. There is no shared database — leaderboards are per-session only.
- **Late join**: the lobby admits new joiners only while a race hasn't
  started yet. Joining mid-race silently leaves you waiting in a stale lobby
  view for the next round.
