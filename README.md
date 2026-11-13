# Bad Takes

A party game: everyone writes a controversial "bad take", then players take turns
defending a random one against the clock while everyone else votes.

| Folder                  | What                     | Stack                                              |
| ----------------------- | ------------------------ | -------------------------------------------------- |
| [`frontend/`](frontend) | Mobile app               | Expo, expo-router, Tamagui, Apollo Client, Zustand |
| [`backend/`](backend)   | GraphQL API + game logic | Express, Apollo Server, graphql-ws, Redis          |
| [`e2e/`](e2e)           | UI tests                 | Playwright                                         |

The frontend and backend are independent npm packages (separate `package.json` and
lockfiles). The root `package.json` only holds convenience scripts.

## Code layout

```
frontend/
  app/                 one file per screen (expo-router)
  src/graphql/         Apollo client, operations, schema types
  src/hooks/           useRoom (live room data and screen routing), useRoomActions
                       (mutations), useRules, timers
  src/state/           session store (saved on the device) and settings (Zustand)
  src/session/         picking a saved game back up when the app opens
  src/ui/              shared components (How to Play, the host's Players menu, code input)
  src/ui/soapbox/      the Soapbox look: colors and fonts (tokens.ts), page shell, buttons,
                       signs, caution tape, stamps

backend/src/
  index.ts             HTTP + WebSocket server
  schema.ts            GraphQL schema
  resolvers.ts         maps GraphQL fields to game functions
  types.ts             Room, Player, GameState
  db/                  Redis client, key layout, roomRepo (all reads/writes)
  game/                rules: lobby, prompts, turns, pure state helpers
```

Game flow is driven by the room's `status` on the server:
`LOBBY → PROMPT_ENTRY → DEFENSE ⇄ VOTING → RESULTS → (reset) LOBBY`.
Each screen redirects when the status changes.

## Setup

Requires Docker and Node 22.13+ or 24.3+ (Expo SDK 58 doesn't support odd-numbered Node releases).

```sh
npm install   # also installs frontend/, backend/ and e2e/ dependencies
```

## Running

```sh
npm run dev
```

This starts Redis in Docker, the backend on port 3500, and the Expo dev server.
The frontend's `predev` step writes your LAN IP into `frontend/.env` so a phone on
the same Wi-Fi can reach the backend.

To use Expo's interactive keys (`r` to reload, `a` for Android, etc.), run the two
halves in separate terminals instead:

```sh
npm run redis:up
npm run dev:backend
npm run dev:frontend
```

`npm run redis:down` stops Redis.

### Playing on one PC (browser)

The app runs in a web browser too, which is the quickest way to play a whole game alone:

1. Start Redis and the backend: `npm run redis:up`, then `npm run dev:backend`
2. In another terminal, `npm run dev:frontend`, then press `w` to open the app in a browser
3. Open the same address (usually http://localhost:8081) in a second and third window. Each
   window is a separate player: create a game in one and join with the code in the others.

Each window remembers its player, so refreshing one keeps that player in the game (on a phone,
closing and reopening the app does the same). The web version is close to, but not exactly, the
phone app (keyboard and alert behavior differ), so do a final check on a real device.

### Playing on a phone

Install **Expo Go** (iOS or Android; the project is on Expo SDK 58, which needs the current Expo Go), make sure the phone is on the same Wi-Fi as this PC,
and scan the QR code that `npm run dev:frontend` prints. No Mac is needed for an iPhone.
An Android emulator (from Android Studio) also works: press `a` instead of scanning.
If the phone can't reach the backend, set the PC's address yourself:
`$env:DEV_HOST_IP="192.168.x.x"; npm run dev:frontend` in PowerShell
(`DEV_HOST_IP=192.168.x.x npm run dev:frontend` in bash).

## Checks

```sh
npm run format          # format everything with Prettier (format:check to only check)
npm run lint            # ESLint, both packages
npm run typecheck       # TypeScript, both packages
npm --prefix backend run test:e2e    # plays real games against the backend (needs Redis running)
npm run test:ui         # plays games through the app in headless Chromium (needs Redis running)
```

The UI tests build the web version of the app, start their own backend (port 3598) and serve the
build (port 3597), then play whole games with one browser window per player. Before the first run,
install the browser with `npx --prefix e2e playwright install chromium`. Useful options (after
`npm --prefix e2e test --`): `--headed` to watch, `--ui` to step through, `-g "remove"` to run
matching tests only. `SKIP_WEB_BUILD=1` reuses the last build when only the tests changed.

To tune animations and sounds without playing a game, open **Motion lab (dev)** at the bottom of
the Home screen (development builds only): it shows every animation and sound with a button to
replay it.

The sound effects in `frontend/assets/sounds/` are synthesized by
[`frontend/scripts/make-sounds.js`](frontend/scripts/make-sounds.js) (`npm --prefix frontend run
make-sounds`), so there's nothing to license. To use a recorded sound instead, replace a file with
one of the same name.

The end-to-end tests start their own backend on port 3599, so they can run alongside `npm run dev`.

GitHub Actions runs all of these on every push to `main` and every pull request
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

The game's rules and limits (player counts, time ranges, text lengths) live in
[`backend/src/game/rules.ts`](backend/src/game/rules.ts). The app reads them from the server's
`rules` query, so change them there only.

## Environment

- `frontend/.env`: `EXPO_PUBLIC_GRAPHQL_URL`, generated by `npm run dev:frontend`
- `backend/.env` (optional): `PORT` (default `3500`) and `REDIS_URL` (default `redis://localhost:6379`)
