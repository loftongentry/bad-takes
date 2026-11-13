// Defense/voting loop: advancing turns, timing each phase, ending a defense, and tallying votes
import * as repo from "../db/roomRepo";
import { requirePlayer } from "./permissions";
// prompts.ts also imports from this file; the cycle is fine because these are only called later
import { startTurnsIfAllPromptsIn } from "./prompts";
import { randomUUID } from "crypto";
import { PREP_SECONDS, REVEAL_SECONDS } from "./rules";
import { emptyGameState, roundOf } from "./state";
import type { Player, Room, RoomStatus, StoredGameState } from "../types";
import { GameError, roomClosedError } from "./errors";
import { logFailure, logger } from "../logger";

type TimedPhase = "PROMPT_ENTRY" | "DEFENSE" | "VOTING";

// Starts the next turn in the queue. When the queue is empty, starts the next round's writing
// phase, or after the last round moves to RESULTS.
// Turns belonging to players who have since left are skipped.
// Only happens if the room is still in `fromStatus`: when several requests race to advance
// the same turn (e.g. the last two votes arriving together), exactly one wins and the rest
// do nothing. Returns whether this call advanced the room.
// `pauseSeconds` lengthens the next phase's clock (time for the "who wrote it" card).
export async function advanceToNextTurn(
  room: Room,
  fromStatus: RoomStatus,
  state: StoredGameState,
  scoredPlayer?: Player,
  pauseSeconds = 0,
) {
  const roomId = room.id;
  const stillHere = new Set(room.players.map((p) => p.id));

  // Pop the next turn from queue, skipping anyone who left
  let nextTurn = state.queue.shift();
  while (nextTurn && !stillHere.has(nextTurn.defenderId)) {
    nextTurn = state.queue.shift();
  }

  const round = roundOf(state);
  let to: RoomStatus;
  let next = state;
  if (nextTurn) {
    to = "DEFENSE";
    state.currentTurn = nextTurn;
    // Absolute end of this defense. Every client counts down to it, and the server ends the turn when it passes.
    state.deadline = new Date(
      Date.now() + (pauseSeconds + PREP_SECONDS + room.settings.timeLimit) * 1000,
    ).toISOString();
  } else if (round < room.settings.rounds) {
    // Everyone has defended: on to the next round, starting with fresh takes
    to = "PROMPT_ENTRY";
    next = emptyGameState(round + 1);
    next.lastReveal = state.lastReveal;
    next.deadline = new Date(
      Date.now() + (pauseSeconds + room.settings.promptTimeLimit) * 1000,
    ).toISOString();
    logger.info({ roomId, round: round + 1 }, "next round");
  } else {
    to = "RESULTS";
    state.deadline = null;
    logger.info({ roomId }, "no turns left, showing results");
  }

  const advanced = await repo.advanceRoom({
    roomId,
    from: fromStatus,
    to,
    // The phase as the caller read it: if the room has moved on since, nothing happens
    expectedDeadline: room.gameState?.deadline,
    state: next,
    updatedPlayer: scoredPlayer,
    clearPrompts: to === "PROMPT_ENTRY",
  });
  if (!advanced) {
    logger.debug({ roomId, from: fromStatus }, "already advanced by another request");
    return false;
  }

  if (next.deadline && (to === "DEFENSE" || to === "PROMPT_ENTRY")) {
    schedulePhaseEnd(roomId, to, next.deadline);
  }

  const finalRoom = await repo.getRoom(roomId);
  await repo.publishRoom(finalRoom);
  return true;
}

// --- Phase timers (writing, defense and voting) ---

// Timers live in this process's memory; restorePhaseTimers() re-creates them from Redis
// on startup, so a server restart mid-turn doesn't leave a phase running forever.
export function schedulePhaseEnd(roomId: string, phase: TimedPhase, deadline: string) {
  const delay = Math.max(0, Date.parse(deadline) - Date.now());
  setTimeout(() => {
    endPhaseAtDeadline(roomId, phase, deadline).catch((error) => {
      logger.error({ roomId, phase, err: error }, "couldn't end the phase on time");
    });
  }, delay);
}

export async function restorePhaseTimers() {
  const timed = await repo.getPhaseDeadlines();
  for (const { roomId, status, deadline } of timed) {
    schedulePhaseEnd(roomId, status, deadline);
  }
  logger.info({ count: timed.length }, "restored phase timers");
}

// Ends the phase whose deadline this is. Does nothing if that phase already ended early
// or a later one has started (its deadline will differ).
async function endPhaseAtDeadline(roomId: string, phase: TimedPhase, deadline: string) {
  const room = await repo.getRoom(roomId);
  if (!room || room.status !== phase || room.gameState?.deadline !== deadline) {
    return;
  }

  // Each passes the deadline on, so the phase only ends if it's still this exact one
  if (phase === "PROMPT_ENTRY") {
    logger.info({ roomId }, "writing time is up");
    await startTurnsIfAllPromptsIn(roomId, { timeUp: true, deadline });
  } else if (phase === "DEFENSE") {
    logger.info({ roomId }, "defense time is up");
    await moveToVoting(roomId, deadline);
  } else {
    logger.info({ roomId }, "voting time is up");
    await tallyIfAllVotesIn(roomId, { votingClosed: true, deadline });
  }
}

// DEFENSE -> VOTING, starting the voting clock. `defenseDeadline` identifies the defense being
// ended. Atomic, so if the defender's "End Defense" and the timer race, only one moves the room
// on, and neither can end a later defense. Returns whether this call did.
async function moveToVoting(roomId: string, defenseDeadline: string | null | undefined) {
  const [state, room] = await Promise.all([repo.getStoredGameState(roomId), repo.getRoom(roomId)]);
  if (!state || !room) {
    return false;
  }
  state.deadline = new Date(Date.now() + room.settings.voteTimeLimit * 1000).toISOString();

  const moved = await repo.advanceRoom({
    roomId,
    from: "DEFENSE",
    to: "VOTING",
    expectedDeadline: defenseDeadline,
    state,
  });
  if (!moved) {
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
      throw roomClosedError();
    }

    // Who's asking comes first: a player who was removed should hear that, not about the phase
    const player = await requirePlayer(room, playerToken);
    if (room.status !== "DEFENSE") {
      return false;
    }
    if (room.gameState?.currentTurn?.defenderId !== player.id) {
      throw new GameError("Only the defender can end their defense early");
    }

    logger.info({ roomId }, "defender ended their defense");

    return await moveToVoting(roomId, room.gameState?.deadline);
  } catch (error) {
    logFailure("endTurn", error, { roomId });
    throw error;
  }
}

export async function submitVote(roomId: string, playerToken: string, value: number) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw roomClosedError();
    }

    const playerId = (await requirePlayer(room, playerToken)).id;
    if (room.status !== "VOTING") {
      throw new GameError("Voting has closed.");
    }

    const defenderId = room.gameState?.currentTurn?.defenderId;
    if (playerId === defenderId) {
      throw new GameError("The defender can't vote on their own defense");
    }
    if (value !== 1 && value !== -1) {
      throw new GameError("Vote must be 1 or -1");
    }

    await repo.recordVote(roomId, playerId, value);
    logger.debug({ roomId, playerId }, "vote recorded");

    const tallied = await tallyIfAllVotesIn(roomId);
    if (!tallied) {
      const updatedRoom = await repo.getRoom(roomId);
      await repo.publishRoom(updatedRoom);
    }

    return true;
  } catch (error) {
    logFailure("submitVote", error, { roomId });
    throw error;
  }
}

// If everyone still in the room (other than the defender) has voted, scores the defender
// and starts the next turn. Called after each vote and when a player leaves mid-vote.
// With votingClosed (the voting timer ran out), tallies whatever votes came in; players who
// didn't vote don't count. Returns whether it tallied.
// `deadline`, when given, limits this to that exact voting round (the timer's own).
export async function tallyIfAllVotesIn(
  roomId: string,
  { votingClosed = false, deadline }: { votingClosed?: boolean; deadline?: string } = {},
) {
  const room = await repo.getRoom(roomId);
  if (!room || room.status !== "VOTING") {
    return false;
  }
  if (deadline !== undefined && room.gameState?.deadline !== deadline) {
    return false;
  }

  const defenderId = room.gameState?.currentTurn?.defenderId;
  const voterIds = new Set(room.players.filter((p) => p.id !== defenderId).map((p) => p.id));

  // Only votes from players still in the room count
  const votes = Object.entries(await repo.getVotes(roomId)).filter(([voterId]) =>
    voterIds.has(voterId),
  );

  if (votes.length < voterIds.size && !votingClosed) {
    return false;
  }

  logger.info({ roomId, votes: votes.length, voters: voterIds.size }, "votes counted");
  const roundScore = votes.reduce((sum, [, vote]) => sum + Number(vote), 0);

  // Defender's new score is saved in the same atomic step that advances the turn,
  // so it can't be applied twice if another final vote arrives at the same moment
  const defender = room.players.find((p) => p.id === defenderId);
  const scoredDefender = defender ? { ...defender, score: defender.score + roundScore } : undefined;

  const state = await repo.getStoredGameState(roomId);
  if (!state) {
    return false;
  }

  // Reveal who wrote it, if the room does that
  let pauseSeconds = 0;
  const turn = state.currentTurn;
  if (room.settings.revealAuthors && turn) {
    const authorId = state.prompts.find((p) => p.id === turn.promptId)?.authorId;
    const author = room.players.find((p) => p.id === authorId);
    const cheers = votes.filter(([, vote]) => Number(vote) > 0).length;
    state.lastReveal = {
      id: randomUUID(),
      at: new Date().toISOString(),
      promptText: turn.promptText,
      authorName: author?.name ?? "Someone who left",
      defenderId: turn.defenderId,
      defenderName: defender?.name ?? "Someone who left",
      score: roundScore,
      cheers,
      boos: votes.length - cheers,
    };
    pauseSeconds = REVEAL_SECONDS;
  }
  await advanceToNextTurn(room, "VOTING", state, scoredDefender, pauseSeconds);
  return true;
}
