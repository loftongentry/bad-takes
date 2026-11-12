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
  gameState { deadline votesCast submittedPromptsCount currentTurn { defenderId promptId promptText } }`;

const getRoom = async (roomId) => (await gql(`query($id:ID!){ room(id:$id){ ${ROOM} } }`, { id: roomId })).room;

// Players act with a secret token, but tests mostly think in (public) player ids.
// setupRoom records each player's token so helpers can take an id and act as that player.
const tokenOf = new Map(); // playerId -> secret player token
const hostOf = new Map(); // roomId -> host's player id
const tok = (playerId) => tokenOf.get(playerId) ?? 'not-a-real-token';

// Creates a room hosted by names[0] and joins the rest. Returns { roomId, players: [{ id, name }] }
async function setupRoom(names, { timeLimit = 60, url = HTTP } = {}) {
  const c = await gql(
    `mutation($h:String!,$t:Int!){ createRoom(hostName:$h, lobbyName:"E2E", rounds:1, playerLimit:20, timeLimit:$t) { hostId playerToken room { id joinCode } } }`,
    { h: names[0], t: timeLimit },
    url
  );
  const roomId = c.createRoom.room.id;
  const players = [{ id: c.createRoom.hostId, name: names[0] }];
  hostOf.set(roomId, c.createRoom.hostId);
  tokenOf.set(c.createRoom.hostId, c.createRoom.playerToken);
  for (const name of names.slice(1)) {
    const j = await gql(
      `mutation($c:String!,$n:String!){ joinRoom(code:$c, playerName:$n) { playerId playerToken } }`,
      { c: c.createRoom.room.joinCode, n: name },
      url
    );
    players.push({ id: j.joinRoom.playerId, name });
    tokenOf.set(j.joinRoom.playerId, j.joinRoom.playerToken);
  }
  return { roomId, players };
}

const startGameAs = (roomId, hostId, url = HTTP) =>
  gqlRaw(`mutation($r:ID!,$t:String!){ startGame(roomId:$r, playerToken:$t){ status } }`, { r: roomId, t: tok(hostId) }, url);

const startGame = async (roomId) => {
  const res = await startGameAs(roomId, hostOf.get(roomId));
  if (res.errors) throw new Error(res.errors.map((e) => e.message).join('; '));
  return res.data;
};

const resetGameAs = (roomId, hostId) =>
  gqlRaw(`mutation($r:ID!,$t:String!){ resetGame(roomId:$r, playerToken:$t) }`, { r: roomId, t: tok(hostId) });

const kickAs = (roomId, hostId, playerId) =>
  gqlRaw(`mutation($r:ID!,$t:String!,$p:ID!){ kickPlayer(roomId:$r, playerToken:$t, playerId:$p) }`, { r: roomId, t: tok(hostId), p: playerId });

const submitPrompt = (roomId, playerId, prompt, url = HTTP) =>
  gql(`mutation($r:ID!,$t:String!,$x:String!){ submitPrompt(roomId:$r, playerToken:$t, prompt:$x) }`, { r: roomId, t: tok(playerId), x: prompt }, url);

const endTurnAs = (roomId, playerId, url = HTTP) =>
  gqlRaw(`mutation($r:ID!,$t:String!){ endTurn(roomId:$r, playerToken:$t) }`, { r: roomId, t: tok(playerId) }, url);

// Ends the current defense early, as the defender
async function endTurn(roomId) {
  const room = await getRoom(roomId);
  const res = await endTurnAs(roomId, room.gameState.currentTurn.defenderId);
  if (res.errors) throw new Error(res.errors.map((e) => e.message).join('; '));
  return res.data;
}

const submitVoteRaw = (roomId, playerId, value, url = HTTP) =>
  gqlRaw(`mutation($r:ID!,$t:String!,$v:Int!){ submitVote(roomId:$r, playerToken:$t, value:$v) }`, { r: roomId, t: tok(playerId), v: value }, url);

const submitVote = async (roomId, playerId, value, url = HTTP) => {
  const res = await submitVoteRaw(roomId, playerId, value, url);
  if (res.errors) throw new Error(res.errors.map((e) => e.message).join('; '));
  return res.data;
};

const leaveRoom = (roomId, playerId) =>
  gql(`mutation($r:ID!,$t:String!){ leaveRoom(roomId:$r, playerToken:$t) }`, { r: roomId, t: tok(playerId) });

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

  assert(!(await resetGameAs(roomId, alice.id)).errors, 'host should be able to reset');
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
  const res = await gqlRaw(`mutation($r:ID!,$t:String!){ submitPrompt(roomId:$r, playerToken:$t, prompt:"too early") }`, {
    r: roomId,
    t: tok(players[0].id),
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

test('turns go in random order and nobody defends their own take (30 games x 3 players)', async () => {
  const games = await Promise.all(Array.from({ length: 30 }, (_, i) => setupRoom([`Host${i}`, `B${i}`, `C${i}`])));
  const firstDefenders = new Set();
  let selfDefenses = 0;

  await Promise.all(games.map(async ({ roomId, players }) => {
    await startGame(roomId);
    // Each prompt's text names its author, so we can tell whose take is being defended
    for (const p of players) await submitPrompt(roomId, p.id, `take by ${p.id}`);

    let room = await getRoom(roomId);
    firstDefenders.add(players.findIndex((p) => p.id === room.gameState.currentTurn.defenderId));
    while (room.status === 'DEFENSE') {
      const { defenderId, promptText } = room.gameState.currentTurn;
      if (promptText === `take by ${defenderId}`) selfDefenses++;
      await endTurn(roomId);
      for (const v of players.filter((p) => p.id !== defenderId)) await submitVote(roomId, v.id, 1);
      room = await getRoom(roomId);
    }
  }));

  assert(selfDefenses === 0, `${selfDefenses} turns had a player defending their own take`);
  assert(firstDefenders.size > 1, 'the same seat (the host) went first in all 30 games');
});

test('a game needs at least 2 players and can only be started once', async () => {
  const solo = await setupRoom(['Solo']);
  const res = await startGameAs(solo.roomId, solo.players[0].id);
  assert(res.errors, 'starting with 1 player should fail');
  assert((await getRoom(solo.roomId)).status === 'LOBBY', 'a failed start should leave the room in LOBBY');

  const { roomId, players } = await setupRoom(['A', 'B']);
  await startGame(roomId);
  const again = await startGameAs(roomId, players[0].id);
  assert(again.errors, 'starting a game that already started should fail');
});

test('only the host can start, reset, or kick', async () => {
  const { roomId, players } = await setupRoom(['Host', 'B', 'C']);
  const [host, b, c] = players;

  assert((await kickAs(roomId, b.id, c.id)).errors, 'a non-host should not be able to kick');
  assert((await kickAs(roomId, b.id, host.id)).errors, 'a non-host should not be able to kick the host');
  assert((await kickAs(roomId, host.id, host.id)).errors, 'the host should not be able to kick themselves');
  assert((await getRoom(roomId)).players.length === 3, 'no one should have been removed');

  assert((await startGameAs(roomId, b.id)).errors, 'a non-host should not be able to start');
  assert((await getRoom(roomId)).status === 'LOBBY', 'the game should not have started');
  assert((await resetGameAs(roomId, b.id)).errors, 'a non-host should not be able to reset');

  assert(!(await kickAs(roomId, host.id, c.id)).errors, 'the host should be able to kick');
  assert((await getRoom(roomId)).players.length === 2, 'the kicked player should be gone');
  assert(!(await startGameAs(roomId, host.id)).errors, 'the host should be able to start');
});

test("a player's public id can't be used to act as them", async () => {
  const { roomId, players } = await setupRoom(['Host', 'B', 'C']);
  const [host, b, c] = players;
  // Every player can see everyone's id (it's in the room data), so ids must not work as credentials
  const asId = (query, extra = {}) => gqlRaw(query, { r: roomId, t: host.id, ...extra });

  assert((await asId(`mutation($r:ID!,$t:String!){ startGame(roomId:$r, playerToken:$t){ status } }`)).errors,
    "the host's public id should not start the game");
  assert((await asId(`mutation($r:ID!,$t:String!,$p:ID!){ kickPlayer(roomId:$r, playerToken:$t, playerId:$p) }`, { p: c.id })).errors,
    "the host's public id should not kick anyone");
  assert((await getRoom(roomId)).status === 'LOBBY' && (await getRoom(roomId)).players.length === 3, 'nothing should have changed');

  const tokenQuery = await gqlRaw(`query($id:ID!){ room(id:$id){ players { id playerToken } } }`, { id: roomId });
  assert(tokenQuery.errors, 'player tokens must not be readable through the API');

  // A player who leaves can't act with their old token
  await leaveRoom(roomId, c.id);
  await startGame(roomId);
  const stale = await gqlRaw(`mutation($r:ID!,$t:String!){ submitPrompt(roomId:$r, playerToken:$t, prompt:"ghost") }`, { r: roomId, t: tok(c.id) });
  assert(stale.errors, "a departed player's token should stop working");
  await submitPrompt(roomId, b.id, 'still works');
});

test('only the defender can end their defense early', async () => {
  const { roomId, players } = await setupRoom(['A', 'B', 'C']);
  await startGame(roomId);
  for (const p of players) await submitPrompt(roomId, p.id, `take from ${p.name}`);
  const defenderId = (await getRoom(roomId)).gameState.currentTurn.defenderId;
  const other = players.find((p) => p.id !== defenderId);

  assert((await endTurnAs(roomId, other.id)).errors, 'a non-defender should not be able to end the defense');
  assert((await getRoom(roomId)).status === 'DEFENSE', 'the defense should still be running');
  assert(!(await endTurnAs(roomId, defenderId)).errors, 'the defender should be able to end it');
  assert((await getRoom(roomId)).status === 'VOTING', 'should be VOTING');
});

test('the server ends each defense at its deadline, and an old timer never ends a later turn', async () => {
  const PREP = 5;
  const start = async (timeLimit) => {
    const { roomId, players } = await setupRoom(['A', 'B'], { timeLimit });
    await startGame(roomId);
    for (const p of players) await submitPrompt(roomId, p.id, `take from ${p.name}`);
    return { roomId, players, startedAt: Date.now() };
  };

  const [timed, early] = await Promise.all([start(1), start(2)]);

  // Room 1: nobody ends the defense, so the server must (deadline = prep 5s + 1s)
  const room1 = await getRoom(timed.roomId);
  const secondsToDeadline = (Date.parse(room1.gameState.deadline) - timed.startedAt) / 1000;
  assert(Math.abs(secondsToDeadline - (PREP + 1)) < 1.5, `deadline should be ~${PREP + 1}s away, got ${secondsToDeadline.toFixed(1)}s`);

  // Room 2: turn 1 ends early at ~2s, so turn 2 starts with a later deadline (~2 + 7 = 9s).
  // Turn 1's own timer still fires at ~7s and must leave turn 2 alone.
  await sleep(2000);
  await endTurn(early.roomId);
  const turn1Defender = (await getRoom(early.roomId)).gameState.currentTurn.defenderId;
  await submitVote(early.roomId, early.players.find((p) => p.id !== turn1Defender).id, 1);
  assert((await getRoom(early.roomId)).status === 'DEFENSE', 'turn 2 should have started');

  await sleep(timed.startedAt + (PREP + 1) * 1000 + 700 - Date.now());
  assert((await getRoom(timed.roomId)).status === 'VOTING', 'the server should end the defense when time runs out');

  await sleep(early.startedAt + (PREP + 2) * 1000 + 700 - Date.now()); // just past turn 1's deadline
  assert((await getRoom(early.roomId)).status === 'DEFENSE', "turn 1's timer ended turn 2 early");

  await sleep(2500); // past turn 2's own deadline
  assert((await getRoom(early.roomId)).status === 'VOTING', 'turn 2 should end at its own deadline');
});

test('defense timers survive a server restart', async () => {
  const port = '3596';
  const url = `http://localhost:${port}/graphql`;
  let backend = startBackend(port);
  try {
    await backend.ready;
    const { roomId, players } = await setupRoom(['A', 'B'], { timeLimit: 2, url });
    assert(!(await startGameAs(roomId, players[0].id, url)).errors, 'host should be able to start');
    for (const p of players) await submitPrompt(roomId, p.id, 'x', url);
    const { deadline } = (await gql(`query($id:ID!){ room(id:$id){ gameState { deadline } } }`, { id: roomId }, url)).room.gameState;

    // Restart mid-defense: the original timer dies with the process
    backend.stop();
    await sleep(500);
    backend = startBackend(port);
    await backend.ready;

    await sleep(Date.parse(deadline) + 1000 - Date.now());
    const { status } = (await gql(`query($id:ID!){ room(id:$id){ status } }`, { id: roomId }, url)).room;
    assert(status === 'VOTING', `the restarted server should still end the defense on time (status ${status})`);
  } finally {
    backend.stop();
  }
});

// Sets up a started game with all prompts in. Returns { roomId, players, room }
async function gameInDefense(names) {
  const { roomId, players } = await setupRoom(names);
  await startGame(roomId);
  for (const p of players) await submitPrompt(roomId, p.id, `take from ${p.name}`);
  return { roomId, players, room: await getRoom(roomId) };
}

test('leaving during prompt entry: the game starts once everyone remaining has submitted', async () => {
  const { roomId, players } = await setupRoom(['Host', 'B', 'C']);
  await startGame(roomId);
  await submitPrompt(roomId, players[0].id, 'one');
  await submitPrompt(roomId, players[1].id, 'two');
  await leaveRoom(roomId, players[2].id); // C leaves without submitting
  const room = await getRoom(roomId);
  assert(room.status === 'DEFENSE', `game should start with the 2 remaining players (status ${room.status})`);
});

test("leaving during voting: the remaining votes are enough", async () => {
  const { roomId, players, room } = await gameInDefense(['Host', 'B', 'C']);
  const defenderId = room.gameState.currentTurn.defenderId;
  const voters = players.filter((p) => p.id !== defenderId);
  // The leaver can't be the host, since a host leaving closes the room
  const leaver = voters.find((p) => p.id !== players[0].id);
  const stayer = voters.find((p) => p !== leaver);
  await endTurn(roomId);
  await submitVote(roomId, stayer.id, 1);
  await leaveRoom(roomId, leaver.id);
  const after = await getRoom(roomId);
  assert(after.status !== 'VOTING', 'voting should finish once everyone still in the room has voted');
});

test('the current defender leaving skips straight to the next turn', async () => {
  // Retry until a non-host defends first, since a host leaving closes the room
  let game;
  for (let i = 0; i < 20; i++) {
    game = await gameInDefense(['Host', 'B', 'C']);
    if (game.room.gameState.currentTurn.defenderId !== game.players[0].id) break;
  }
  const { roomId, room } = game;
  const leaverId = room.gameState.currentTurn.defenderId;
  await leaveRoom(roomId, leaverId);
  const after = await getRoom(roomId);
  assert(after.status === 'DEFENSE', `a new turn should start right away (status ${after.status})`);
  assert(after.gameState.currentTurn.defenderId !== leaverId, 'the player who left should no longer be defending');
});

test("a player who leaves is skipped when their turn comes up", async () => {
  const { roomId, players, room } = await gameInDefense(['Host', 'B', 'C', 'D']);
  const firstDefender = room.gameState.currentTurn.defenderId;
  const leaver = players.find((p) => p.id !== firstDefender && p.id !== players[0].id);
  await leaveRoom(roomId, leaver.id);
  const remaining = players.filter((p) => p.id !== leaver.id);

  const { defenders, room: end } = await playAllTurns(roomId, remaining);
  assert(!defenders.includes(leaver.id), 'the player who left should never be the defender');
  assert(defenders.length === 3, `expected 3 turns for the 3 remaining players, got ${defenders.length}`);
  assert(end.status === 'RESULTS', `game should finish (status ${end.status})`);
});

test('a game that drops below 2 players ends', async () => {
  const { roomId, players } = await gameInDefense(['Host', 'B']);
  await leaveRoom(roomId, players[1].id);
  const room = await getRoom(roomId);
  assert(room.status === 'RESULTS', `with one player left the game should end (status ${room.status})`);
});

test('kicking a player mid-game is handled like leaving', async () => {
  const { roomId, players } = await setupRoom(['Host', 'B', 'C']);
  await startGame(roomId);
  await submitPrompt(roomId, players[0].id, 'one');
  await submitPrompt(roomId, players[1].id, 'two');
  assert(!(await kickAs(roomId, players[0].id, players[2].id)).errors, 'host should be able to kick');
  assert((await getRoom(roomId)).status === 'DEFENSE', 'game should start once the kicked player is gone');
});

test('voting closes at its time limit and counts the votes that came in', async () => {
  // A separate backend where voting lasts 2 seconds
  const port = '3595';
  const url = `http://localhost:${port}/graphql`;
  const backend = startBackend(port, { VOTE_SECONDS: '2' });
  try {
    await backend.ready;
    const { roomId, players } = await setupRoom(['A', 'B', 'C'], { url });
    const at = (query, variables) => gql(query, variables, url);
    assert(!(await startGameAs(roomId, players[0].id, url)).errors, 'host should be able to start');
    for (const p of players) await submitPrompt(roomId, p.id, p.name, url);
    const readRoom = async () => (await at(`query($id:ID!){ room(id:$id){ ${ROOM} } }`, { id: roomId })).room;

    const defenderId = (await readRoom()).gameState.currentTurn.defenderId;
    await endTurnAs(roomId, defenderId, url);
    const voting = await readRoom();
    assert(voting.status === 'VOTING', 'should be voting');
    assert(voting.gameState.deadline, 'voting should have a deadline');

    // Only one of the two voters votes before time runs out
    const [voter] = players.filter((p) => p.id !== defenderId);
    await submitVote(roomId, voter.id, 1, url);

    await sleep(Date.parse(voting.gameState.deadline) + 1000 - Date.now());
    const after = await readRoom();
    assert(after.status === 'DEFENSE', `voting should close and the next turn start (status ${after.status})`);
    const defender = after.players.find((p) => p.id === defenderId);
    assert(defender.score === 1, `the vote that came in should count (score ${defender.score})`);
  } finally {
    backend.stop();
  }
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
