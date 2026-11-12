import { pubsub } from "./db/redis";
import { roomChannel } from "./db/keys";
import { getRoom } from "./db/roomRepo";
import { createRoom, joinRoom, leaveRoom, kickPlayer, resetGame } from "./game/lobby";
import { startGame, submitPrompt } from "./game/prompts";
import { endTurn, submitVote } from "./game/turns";
import type { RoomSettings } from "./types";

type CreateRoomArgs = RoomSettings & { hostName: string };

export const resolvers = {
  Query: {
    room: (_: unknown, { id }: { id: string }) => {
      return getRoom(id);
    }
  },
  Mutation: {
    createRoom: async (_: unknown, args: CreateRoomArgs) => {
      const { hostName, lobbyName, rounds, playerLimit, timeLimit } = args;
      const settings = { lobbyName, rounds, playerLimit, timeLimit };

      const room = await createRoom(hostName, settings);
      if (!room) throw new Error("Failed to create room");

      return { room, hostId: room.players[0]?.id };
    },
    joinRoom: async (_: unknown, { code, playerName }: { code: string; playerName: string }) => {
      const { room, playerId } = await joinRoom(code, playerName);
      return { room, playerId }
    },
    leaveRoom: async (_: unknown, { roomId, playerId }: { roomId: string; playerId: string }) => {
      return await leaveRoom(roomId, playerId);
    },
    kickPlayer: async (_: unknown, { roomId, playerId }: { roomId: string; playerId: string }) => {
      return await kickPlayer(roomId, playerId);
    },
    startGame: async (_: unknown, { roomId }: { roomId: string }) => {
      return await startGame(roomId);
    },
    submitPrompt: async (_: unknown, { roomId, playerId, prompt }: { roomId: string; playerId: string; prompt: string }) => {
      return await submitPrompt(roomId, playerId, prompt);
    },
    endTurn: async (_: unknown, { roomId }: { roomId: string }) => {
      return await endTurn(roomId);
    },
    submitVote: async (_: unknown, { roomId, playerId, value }: { roomId: string; playerId: string; value: number }) => {
      return await submitVote(roomId, playerId, value);
    },
    resetGame: async (_: unknown, { roomId }: { roomId: string }) => {
      return await resetGame(roomId);
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
