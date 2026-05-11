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

## Production build

```bash
npm run build      # builds Next.js + compiles the socket server to dist/
npm run start      # runs both web (3000) and socket server (4000)
```

## Notes

- For the MVP there is no auth — each player is identified by the username
  they enter on the landing page. Results are persisted under that username.
- Room state lives in-memory on the socket server. For multi-instance
  deployments you would swap `RoomManager` for a Redis-backed adapter and
  enable the Socket.io Redis adapter.
