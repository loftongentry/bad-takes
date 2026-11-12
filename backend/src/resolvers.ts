import { pubsub } from "./db/redis";
import { roomChannel } from "./db/keys";
import { getRoom } from "./db/roomRepo";
import { createRoom, joinRoom, leaveRoom, kickPlayer, resetGame } from "./game/lobby";
import { startGame, submitPrompt } from "./game/prompts";
import { endTurn, submitVote } from "./game/turns";
import type { RoomSettings } from "./types";

type CreateRoomArgs = RoomSettings & { hostName: string };

// Every action that needs to know who is acting takes the caller's secret playerToken
type ByPlayer = { roomId: string; playerToken: string };

export const resolvers = {
  Query: {
    room: (_: unknown, { id }: { id: string }) => {
      return getRoom(id);
    }
  },
  Mutation: {
    createRoom: async (_: unknown, args: CreateRoomArgs) => {
      const { hostName, lobbyName, rounds, playerLimit, timeLimit, promptTimeLimit } = args;
      const settings = { lobbyName, rounds, playerLimit, timeLimit, promptTimeLimit };

      const { room, hostId, hostToken } = await createRoom(hostName, settings);
      if (!room) throw new Error("Failed to create room");

      return { room, hostId, playerToken: hostToken };
    },
    joinRoom: async (_: unknown, { code, playerName }: { code: string; playerName: string }) => {
      const { room, playerId, playerToken } = await joinRoom(code, playerName);
      return { room, playerId, playerToken }
    },
    leaveRoom: async (_: unknown, { roomId, playerToken }: ByPlayer) => {
      return await leaveRoom(roomId, playerToken);
    },
    kickPlayer: async (_: unknown, { roomId, playerToken, playerId }: ByPlayer & { playerId: string }) => {
      return await kickPlayer(roomId, playerToken, playerId);
    },
    startGame: async (_: unknown, { roomId, playerToken }: ByPlayer) => {
      return await startGame(roomId, playerToken);
    },
    submitPrompt: async (_: unknown, { roomId, playerToken, prompt }: ByPlayer & { prompt: string }) => {
      return await submitPrompt(roomId, playerToken, prompt);
    },
    endTurn: async (_: unknown, { roomId, playerToken }: ByPlayer) => {
      return await endTurn(roomId, playerToken);
    },
    submitVote: async (_: unknown, { roomId, playerToken, value }: ByPlayer & { value: number }) => {
      return await submitVote(roomId, playerToken, value);
    },
    resetGame: async (_: unknown, { roomId, playerToken }: ByPlayer) => {
      return await resetGame(roomId, playerToken);
    }
  },
  Subscription: {
    room: {
      subscribe: (_: unknown, { roomId }: { roomId: string }) => {
        return pubsub.asyncIterator(roomChannel(roomId));
      }
    }
  }
}
