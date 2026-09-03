# VIBE FOUR — Connect 4 Reimagined

Mobile-first, animated Connect 4 built for Vercel. Pair with a friend using a 4-letter code, or play pass-and-play on one phone.

**Stack:** Next.js 16 (App Router) + Tailwind 4 + Framer Motion + canvas-confetti + Upstash Redis (with in-memory fallback)

## Features
- **Code pairing:** Create room → get `AB12` → share → friend joins → instant play (polls every 1s)
- **Hot seat:** Offline pass-and-play with score tracking
- **Name memory:** Prompt on first visit, stored in `localStorage` (`vibe-four:name`), editable anytime
- **Mobile-first:** Large tap targets, ghost disc preview, haptic vibration (`navigator.vibrate`), no tiny buttons
- **Fun animations:** Spring disc drop, winning line glow & star, confetti bursts, turn pulse, floating gradients
- **Sounds:** Tiny WebAudio synth (drop/click/win/error) with mute toggle persisted in `localStorage`
- **QOL:** Valid-move highlighting, undo (local), rematch handshake (online), copy code/link, move count, draws tracked, expire in 4h, works with no login

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

Online rooms work locally without Redis (in-memory `Map` fallback). For multi-instance persistence (Vercel), set up Upstash.

## Deploy to Vercel (with Redis)

1. **Push to GitHub** and import in Vercel, or `vercel --prod`

2. **Create Upstash Redis:**
   - Go to https://console.upstash.com → Create Database → choose `Global` or `US East`
   - Copy **REST URL** and **REST TOKEN** from REST API section

3. **Add env vars in Vercel:**
   - Project → Settings → Environment Variables
   ```
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxx
   ```
   - Or use Vercel integration: Storage → Create → Upstash Redis → Connect → it auto-injects vars

4. **Deploy** — rooms now persist across serverless functions, expire after 4 hours.

> **Without Redis** on Vercel, rooms live only in one lambda instance and may be lost — fine for demos, not for production. The `.env.example` shows vars.

## How pairing works

- `POST /api/room/create` → generates 4-char code (`ABCDEFGH...23456789`), stores board, returns `token`
- Token is saved per-room in `localStorage` as `vibe-four:token:CODE` — identifies you as P1/P2
- `POST /api/room/join` → second player joins, room flips to `playing`
- `GET /api/room/[code]?token=...` → polled every 1s by both clients
- `POST /api/room/[code]/move` → validates turn + column, updates board, checks win via `checkWinner` (`src/lib/game.ts:18`)
- `POST /api/room/[code]/rematch` → both players must request, then board resets

See `src/lib/roomStore.ts:15` for Redis vs in-memory switch.

## Project structure

```
src/lib/game.ts         # pure engine: board, win detection
src/lib/roomStore.ts    # Redis + in-memory room persistence
src/lib/sounds.ts       # WebAudio sfx + haptics
src/components/Board.tsx
src/components/LocalGame.tsx
src/components/NameModal.tsx
src/app/page.tsx        # Home
src/app/play/local/page.tsx
src/app/play/online/page.tsx       # lobby
src/app/play/online/[code]/page.tsx # online game
src/app/api/room/**     # REST API
```

## Mobile tips

- Add to Home Screen on iOS for full-screen
- Keep tab open while playing online (polling pauses when backgrounded)
- Tap column numbers or ghost disc to drop

Enjoy — vibe and connect four! 🎉
