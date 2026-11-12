// End-to-end tests: plays real games against the backend and Redis.
//
//   npm run redis:up        (from the repo root, once)
//   npm run test:e2e        (from backend/)
//
// Starts its own backend on E2E_PORT (default 3599) so it doesn't clash with `npm run dev`.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.E2E_PORT || '3599';
const HTTP = `http://localhost:${PORT}/graphql`;
const WS = `ws://localhost:${PORT}/graphql`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- tiny test runner ---
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
function assert(cond, message) {
  if (!cond) throw new Error(message);
}

// Starts a backend process on `port`. `ready` resolves once it answers /health.
function startBackend(port, extraEnv = {}) {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: port, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (d) => (logs += d));
  child.stderr.on('data', (d) => (logs += d));
  const ready = (async () => {
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`http://localhost:${port}/health`)).ok) return;
      } catch {}
      await sleep(500);
    }
    throw new Error(`backend never came up on port ${port}\n${logs}`);
  })();
  return { ready, stop: () => child.kill() };
}

// --- GraphQL helpers ---
async function gqlRaw(query, variables = {}, url = HTTP) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}

async function gql(query, variables = {}, url = HTTP) {
  const j = await gqlRaw(query, variables, url);
  if (j.errors) throw new Error(j.errors.map((e) => e.message).join('; '));
  return j.data;
}

const ROOM = `id joinCode status players { id name isHost score }
  gameState { votesCast submittedPromptsCount currentTurn { defenderId promptId promptText } }`;

const getRoom = async (roomId) => (await gql(`query($id:ID!){ room(id:$id){ ${ROOM} } }`, { id: roomId })).room;

// Creates a room hosted by names[0] and joins the rest. Returns { roomId, players: [{ id, name }] }
async function setupRoom(names) {
  const c = await gql(
    `mutation($h:String!){ createRoom(hostName:$h, lobbyName:"E2E", rounds:1, playerLimit:20, timeLimit:60) { hostId room { id joinCode } } }`,
    { h: names[0] }
  );
  const roomId = c.createRoom.room.id;
  const players = [{ id: c.createRoom.hostId, name: names[0] }];
  for (const name of names.slice(1)) {
    const j = await gql(`mutation($c:String!,$n:String!){ joinRoom(code:$c, playerName:$n) { playerId } }`, {
      c: c.createRoom.room.joinCode,
      n: name,
    });
    players.push({ id: j.joinRoom.playerId, name });
  }
  return { roomId, players };
}

const startGame = (roomId) => gql(`mutation($r:ID!){ startGame(roomId:$r){ status } }`, { r: roomId });

const submitPrompt = (roomId, playerId, prompt) =>
  gql(`mutation($r:ID!,$p:ID!,$t:String!){ submitPrompt(roomId:$r, playerId:$p, prompt:$t) }`, { r: roomId, p: playerId, t: prompt });

const endTurn = (roomId) => gql(`mutation($r:ID!){ endTurn(roomId:$r) }`, { r: roomId });

const submitVoteRaw = (roomId, playerId, value) =>
  gqlRaw(`mutation($r:ID!,$p:ID!,$v:Int!){ submitVote(roomId:$r, playerId:$p, value:$v) }`, { r: roomId, p: playerId, v: value });

const submitVote = (roomId, playerId, value) =>
  gql(`mutation($r:ID!,$p:ID!,$v:Int!){ submitVote(roomId:$r, playerId:$p, value:$v) }`, { r: roomId, p: playerId, v: value });

const leaveRoom = (roomId, playerId) =>
  gql(`mutation($r:ID!,$p:ID!){ leaveRoom(roomId:$r, playerId:$p) }`, { r: roomId, p: playerId });

// Plays every defense/vote turn until RESULTS. Voters vote all at once when `concurrentVotes`.
// Returns the defender ids in the order they defended.
async function playAllTurns(roomId, players, { concurrentVotes = false } = {}) {
  const defenders = [];
  let room = await getRoom(roomId);
  while (room.status === 'DEFENSE' && defenders.length < 50) {
    const defenderId = room.gameState.currentTurn.defenderId;
    defenders.push(defenderId);
    await endTurn(roomId);
    const voters = players.filter((p) => p.id !== defenderId);
    if (concurrentVotes) {
      await Promise.all(voters.map((v) => submitVote(roomId, v.id, 1)));
    } else {
      for (const v of voters) await submitVote(roomId, v.id, 1);
    }
    room = await getRoom(roomId);
  }
  return { defenders, room };
}

// Minimal graphql-transport-ws client (the protocol the app's graphql-ws client speaks)
function subscribe(roomId) {
  const events = [];
  const ws = new WebSocket(WS, 'graphql-transport-ws');
  const ready = new Promise((resolve, reject) => {
    ws.onopen = () => ws.send(JSON.stringify({ type: 'connection_init' }));
    ws.onerror = (e) => reject(new Error('ws error ' + e.message));
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === 'connection_ack') {
        ws.send(JSON.stringify({
          id: '1',
          type: 'subscribe',
          payload: { query: `subscription($roomId:ID!){ room(roomId:$roomId){ status } }`, variables: { roomId } },
        }));
        setTimeout(resolve, 500); // let the Redis channel subscription register
      } else if (m.type === 'next') {
        events.push(m.payload.data.room);
      } else if (m.type === 'error') {
        reject(new Error(JSON.stringify(m.payload)));
      }
    };
  });
  return { events, ready, close: () => ws.close() };
}

// ---------------------------------------------------------------------------

test('full 2-player game: every phase, scoring, reset, host leaving', async () => {
  const { roomId, players } = await setupRoom(['Alice', 'Bob']);
  const [alice, bob] = players;
  const sub = subscribe(roomId);
  await sub.ready;

  assert((await startGame(roomId)).startGame.status === 'PROMPT_ENTRY', 'startGame should move to PROMPT_ENTRY');
  await submitPrompt(roomId, alice.id, 'Pineapple belongs on pizza');
  assert((await getRoom(roomId)).status === 'PROMPT_ENTRY', 'one of two prompts should stay in PROMPT_ENTRY');
  await submitPrompt(roomId, bob.id, 'Mondays are the best day');

  const { defenders, room } = await playAllTurns(roomId, players);
  assert(defenders.length === 2, `expected 2 turns, got ${defenders.length}`);
  assert(new Set(defenders).size === 2, 'each player should defend once');
  assert(room.status === 'RESULTS', `expected RESULTS, got ${room.status}`);
  assert(room.players.every((p) => p.score === 1), 'each defender should score +1');

  await gql(`mutation($r:ID!){ resetGame(roomId:$r) }`, { r: roomId });
  const reset = await getRoom(roomId);
  assert(reset.status === 'LOBBY' && reset.players.every((p) => p.score === 0), 'reset should return to LOBBY with 0 scores');

  await sleep(300);
  const statuses = sub.events.filter(Boolean).map((e) => e.status);
  for (const s of ['PROMPT_ENTRY', 'DEFENSE', 'VOTING', 'RESULTS', 'LOBBY']) {
    assert(statuses.includes(s), `subscription never pushed ${s} (got ${statuses.join(' > ')})`);
  }

  const before = sub.events.length;
  await leaveRoom(roomId, alice.id);
  await sleep(500);
  assert(sub.events.slice(before).at(-1) === null, 'host leaving should push room: null');
  assert((await getRoom(roomId)) === null, 'host leaving should delete the room');
  sub.close();
});

test('duplicate endTurn calls are ignored', async () => {
  const { roomId, players } = await setupRoom(['A', 'B']);
  await startGame(roomId);
  for (const p of players) await submitPrompt(roomId, p.id, `take from ${p.name}`);
  assert((await endTurn(roomId)).endTurn === true, 'first endTurn should succeed');
  assert((await endTurn(roomId)).endTurn === false, 'second endTurn should be a no-op');
  assert((await getRoom(roomId)).status === 'VOTING', 'should be VOTING');
});

test('submittedPromptsCount counts submissions', async () => {
  const { roomId, players } = await setupRoom(['A', 'B', 'C']);
  await startGame(roomId);
  await submitPrompt(roomId, players[0].id, 'one');
  let room = await getRoom(roomId);
  assert(room.gameState.submittedPromptsCount === 1, `expected 1, got ${room.gameState.submittedPromptsCount}`);
  await submitPrompt(roomId, players[1].id, 'two');
  room = await getRoom(roomId);
  assert(room.gameState.submittedPromptsCount === 2, `expected 2, got ${room.gameState.submittedPromptsCount}`);
});

test('resubmitting a prompt replaces it instead of counting twice', async () => {
  const { roomId, players } = await setupRoom(['A', 'B', 'C']);
  await startGame(roomId);
  await submitPrompt(roomId, players[0].id, 'first try');
  await submitPrompt(roomId, players[0].id, 'retry after a network blip');
  let room = await getRoom(roomId);
  assert(room.status === 'PROMPT_ENTRY', `game started early with only 1 of 3 players submitted (status ${room.status})`);
  await submitPrompt(roomId, players[1].id, 'two');
  room = await getRoom(roomId);
  assert(room.status === 'PROMPT_ENTRY', `game started before the last player submitted (status ${room.status})`);
  await submitPrompt(roomId, players[2].id, 'three');
  const { defenders } = await playAllTurns(roomId, players);
  assert(defenders.length === 3, `expected 3 turns, got ${defenders.length}`);
});

test('prompts are rejected outside the prompt phase', async () => {
  const { roomId, players } = await setupRoom(['A', 'B']);
  const res = await gqlRaw(`mutation($r:ID!,$p:ID!){ submitPrompt(roomId:$r, playerId:$p, prompt:"too early") }`, {
    r: roomId,
    p: players[0].id,
  });
  assert(res.errors, 'submitting in LOBBY should fail');
});

test('simultaneous prompt submissions are all kept (15 rooms x 4 players)', async () => {
  const rooms = await Promise.all(Array.from({ length: 15 }, (_, i) => setupRoom([`A${i}`, `B${i}`, `C${i}`, `D${i}`])));
  await Promise.all(rooms.map((r) => startGame(r.roomId)));
  await Promise.all(rooms.flatMap((r) => r.players.map((p) => submitPrompt(r.roomId, p.id, `take from ${p.name}`))));
  const statuses = await Promise.all(rooms.map(async (r) => (await getRoom(r.roomId)).status));
  const stuck = statuses.filter((s) => s !== 'DEFENSE').length;
  assert(stuck === 0, `${stuck} of 15 rooms never left PROMPT_ENTRY (lost prompts)`);
  for (const r of rooms) {
    const room = await getRoom(r.roomId);
    assert(room.gameState.currentTurn, 'every room should have a first turn');
  }
});

test('simultaneous final votes advance exactly one turn (10 rooms x 3 players)', async () => {
  const rooms = await Promise.all(Array.from({ length: 10 }, (_, i) => setupRoom([`A${i}`, `B${i}`, `C${i}`])));
  await Promise.all(rooms.map((r) => startGame(r.roomId)));
  for (const r of rooms) for (const p of r.players) await submitPrompt(r.roomId, p.id, `take from ${p.name}`);

  const results = await Promise.all(rooms.map((r) => playAllTurns(r.roomId, r.players, { concurrentVotes: true })));
  const bad = results.filter(({ defenders, room }) => defenders.length !== 3 || new Set(defenders).size !== 3 || room.status !== 'RESULTS');
  assert(bad.length === 0, `${bad.length} of 10 rooms skipped or repeated a turn (turn counts: ${results.map((r) => r.defenders.length).join(',')})`);
  for (const { room } of results) {
    assert(room.players.every((p) => p.score === 2), `each defender should score exactly +2, got ${room.players.map((p) => p.score).join(',')}`);
  }
});

test('invalid votes are rejected', async () => {
  const { roomId, players } = await setupRoom(['A', 'B', 'C']);
  await startGame(roomId);
  for (const p of players) await submitPrompt(roomId, p.id, `take from ${p.name}`);
  const room = await getRoom(roomId);
  const defenderId = room.gameState.currentTurn.defenderId;
  const voter = players.find((p) => p.id !== defenderId);
  await endTurn(roomId);

  assert((await submitVoteRaw(roomId, defenderId, 1)).errors, 'the defender should not be able to vote');
  assert((await submitVoteRaw(roomId, voter.id, 1000)).errors, 'a vote of 1000 should be rejected');
  assert((await submitVoteRaw(roomId, 'not-a-player', 1)).errors, 'a non-member should not be able to vote');
  assert((await getRoom(roomId)).gameState.votesCast === 0, 'no invalid vote should have been recorded');
});

test('a game needs at least 2 players and can only be started once', async () => {
  const solo = await setupRoom(['Solo']);
  const res = await gqlRaw(`mutation($r:ID!){ startGame(roomId:$r){ status } }`, { r: solo.roomId });
  assert(res.errors, 'starting with 1 player should fail');
  assert((await getRoom(solo.roomId)).status === 'LOBBY', 'a failed start should leave the room in LOBBY');

  const { roomId } = await setupRoom(['A', 'B']);
  await startGame(roomId);
  const again = await gqlRaw(`mutation($r:ID!){ startGame(roomId:$r){ status } }`, { r: roomId });
  assert(again.errors, 'starting a game that already started should fail');
});

test('active rooms outlive the expiry time; idle rooms still expire', async () => {
  // A separate backend whose rooms expire after 3 seconds of inactivity
  const port = '3597';
  const url = `http://localhost:${port}/graphql`;
  const backend = startBackend(port, { ROOM_TTL_SECONDS: '3' });
  try {
    await backend.ready;
    const exists = async (roomId) => (await gql(`query($id:ID!){ room(id:$id){ id } }`, { id: roomId }, url)).room !== null;

    const c = await gql(
      `mutation { createRoom(hostName:"A", lobbyName:"TTL", rounds:1, playerLimit:5, timeLimit:60) { room { id joinCode } } }`,
      {},
      url
    );
    const { id: roomId, joinCode } = c.createRoom.room;
    await sleep(2000);
    await gql(`mutation($c:String!){ joinRoom(code:$c, playerName:"B") { playerId } }`, { c: joinCode }, url);
    await sleep(2000); // 4s after creation, 2s after the last activity
    assert(await exists(roomId), 'room expired 3s after creation even though a player joined at 2s');

    await sleep(3500); // now 3.5s with no activity
    assert(!(await exists(roomId)), 'a room with no activity should still expire');
  } finally {
    backend.stop();
  }
});

// ---------------------------------------------------------------------------

const main = startBackend(PORT);

let failed = 0;
try {
  await main.ready;

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS  ${name}`);
    } catch (e) {
      failed++;
      console.log(`FAIL  ${name}\n      ${e.message}`);
    }
  }
} catch (e) {
  failed++;
  console.log(`ERROR ${e.message}`);
} finally {
  main.stop();
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exit(failed ? 1 : 0);
}
