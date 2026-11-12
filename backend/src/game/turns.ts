// Defense/voting loop: advancing turns, timing each phase, ending a defense, and tallying votes
import * as repo from "../db/roomRepo";
import { requirePlayer } from "./permissions";
import type { Player, Room, RoomStatus, StoredGameState } from "../types";

// "Get ready" countdown before each defense. The app's defense screen uses the same value.
export const PREP_SECONDS = 5;

// How long players have to vote; when it runs out, the votes that came in are counted.
// Overridable so tests don't have to wait.
export const VOTE_SECONDS = Number(process.env.VOTE_SECONDS) || 30;

type TimedPhase = "DEFENSE" | "VOTING";

// Starts the next turn in the queue, or moves to RESULTS when the queue is empty.
// Turns belonging to players who have since left are skipped.
// Only happens if the room is still in `fromStatus`: when several requests race to advance
// the same turn (e.g. the last two votes arriving together), exactly one wins and the rest
// do nothing. Returns whether this call advanced the room.
export async function advanceToNextTurn(
  room: Room,
  fromStatus: RoomStatus,
  state: StoredGameState,
  scoredPlayer?: Player
) {
  const roomId = room.id;
  const stillHere = new Set(room.players.map((p) => p.id));

  // Pop the next turn from queue, skipping anyone who left
  let nextTurn = state.queue.shift();
  while (nextTurn && !stillHere.has(nextTurn.defenderId)) {
    nextTurn = state.queue.shift();
  }

  if (nextTurn) {
    state.currentTurn = nextTurn;
    // Absolute end of this defense. Every client counts down to it, and the server ends the turn when it passes.
    state.deadline = new Date(Date.now() + (PREP_SECONDS + room.settings.timeLimit) * 1000).toISOString();
  } else {
    state.deadline = null;
    console.log(`[GameLogic] No more turns in room ${roomId}, transitioning to RESULTS`);
  }

  const advanced = await repo.advanceRoom(roomId, fromStatus, nextTurn ? "DEFENSE" : "RESULTS", state, scoredPlayer);
  if (!advanced) {
    console.log(`[GameLogic] Room ${roomId} already advanced past ${fromStatus} by another request`);
    return false;
  }

  if (state.deadline) {
    schedulePhaseEnd(roomId, "DEFENSE", state.deadline);
  }

  const finalRoom = await repo.getRoom(roomId);
  await repo.publishRoom(finalRoom);
  return true;
}

// --- Phase timers (defense and voting) ---

// Timers live in this process's memory; restorePhaseTimers() re-creates them from Redis
// on startup, so a server restart mid-turn doesn't leave a phase running forever.
export function schedulePhaseEnd(roomId: string, phase: TimedPhase, deadline: string) {
  const delay = Math.max(0, Date.parse(deadline) - Date.now());
  setTimeout(() => {
    endPhaseAtDeadline(roomId, phase, deadline).catch((error) => {
      console.error(`[GameLogic] Failed to end ${phase} on time for room ${roomId}:`, error);
    });
  }, delay);
}

export async function restorePhaseTimers() {
  const timed = await repo.getPhaseDeadlines();
  for (const { roomId, status, deadline } of timed) {
    schedulePhaseEnd(roomId, status, deadline);
  }
  console.log(`[GameLogic] Restored ${timed.length} phase timer(s)`);
}

// Ends the phase whose deadline this is. Does nothing if that phase already ended early
// or a later one has started (its deadline will differ).
async function endPhaseAtDeadline(roomId: string, phase: TimedPhase, deadline: string) {
  const room = await repo.getRoom(roomId);
  if (!room || room.status !== phase || room.gameState?.deadline !== deadline) {
    return;
  }

  if (phase === "DEFENSE") {
    console.log(`[GameLogic] Time's up for the defense in room ${roomId}`);
    await moveToVoting(roomId);
  } else {
    console.log(`[GameLogic] Voting closed in room ${roomId}`);
    await tallyIfAllVotesIn(roomId, { votingClosed: true });
  }
}

// DEFENSE -> VOTING, starting the voting clock. Atomic, so if the defender's "End Defense"
// and the timer race, only one moves the room on. Returns whether this call did.
async function moveToVoting(roomId: string) {
  const state = await repo.getStoredGameState(roomId);
  if (!state) {
    return false;
  }
  state.deadline = new Date(Date.now() + VOTE_SECONDS * 1000).toISOString();

  if (!(await repo.advanceRoom(roomId, "DEFENSE", "VOTING", state))) {
    return false;
  }
  schedulePhaseEnd(roomId, "VOTING", state.deadline);

  const updatedRoom = await repo.getRoom(roomId);
  await repo.publishRoom(updatedRoom);
  return true;
}

// The defender ending their own defense early. (When time runs out the server ends it.)
export async function endTurn(roomId: string, playerToken: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.status !== "DEFENSE") {
      return false;
    }

    const player = await requirePlayer(room, playerToken);
    if (room.gameState?.currentTurn?.defenderId !== player.id) {
      throw new Error("Only the defender can end their defense early");
    }

    console.log(`[GameLogic] Ending turn for room ${roomId}`);

    return await moveToVoting(roomId);
  } catch (error) {
    console.error(`[RoomStore.endTurn] Failed to end turn for room ${roomId}:`, error);
    throw error;
  }
}

export async function submitVote(roomId: string, playerToken: string, value: number) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.status !== "VOTING") {
      throw new Error("Not in voting phase");
    }

    const defenderId = room.gameState?.currentTurn?.defenderId;
    const playerId = (await requirePlayer(room, playerToken)).id;
    if (playerId === defenderId) {
      throw new Error("The defender can't vote on their own defense");
    }
    if (value !== 1 && value !== -1) {
      throw new Error("Vote must be 1 or -1");
    }

    await repo.recordVote(roomId, playerId, value);
    console.log(`[GameLogic] Player ${playerId} voted in room ${roomId}`);

    const tallied = await tallyIfAllVotesIn(roomId);
    if (!tallied) {
      const updatedRoom = await repo.getRoom(roomId);
      await repo.publishRoom(updatedRoom);
    }

    return true;
  } catch (error) {
    console.error(`[RoomStore.submitVote] Failed to submit vote for room ${roomId}:`, error);
    throw error;
  }
}

// If everyone still in the room (other than the defender) has voted, scores the defender
// and starts the next turn. Called after each vote and when a player leaves mid-vote.
// With votingClosed (the voting timer ran out), tallies whatever votes came in; players who
// didn't vote don't count. Returns whether it tallied.
export async function tallyIfAllVotesIn(roomId: string, { votingClosed = false } = {}) {
  const room = await repo.getRoom(roomId);
  if (!room || room.status !== "VOTING") {
    return false;
  }

  const defenderId = room.gameState?.currentTurn?.defenderId;
  const voterIds = new Set(room.players.filter((p) => p.id !== defenderId).map((p) => p.id));

  // Only votes from players still in the room count
  const votes = Object.entries(await repo.getVotes(roomId)).filter(([voterId]) => voterIds.has(voterId));

  console.log(`[GameLogic] Room ${roomId} has ${votes.length}/${voterIds.size} votes`);
  if (votes.length < voterIds.size && !votingClosed) {
    return false;
  }

  console.log(`[GameLogic] Tallying ${votes.length} vote(s) for room ${roomId}`);
  const roundScore = votes.reduce((sum, [, vote]) => sum + Number(vote), 0);

  // Defender's new score is saved in the same atomic step that advances the turn,
  // so it can't be applied twice if another final vote arrives at the same moment
  const defender = room.players.find((p) => p.id === defenderId);
  const scoredDefender = defender ? { ...defender, score: defender.score + roundScore } : undefined;

  const state = await repo.getStoredGameState(roomId);
  if (!state) {
    return false;
  }
  await advanceToNextTurn(room, "VOTING", state, scoredDefender);
  return true;
}
