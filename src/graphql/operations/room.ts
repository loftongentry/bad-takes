import { gql } from "@apollo/client";

export const ROOM_BY_ID = gql`
  query RoomById($roomId: ID!) {
    roomById(roomId: $roomId) {
      id
      joinCode
      settings {
        lobbyName
        rounds
        playerLimit
        timeLimit
      }
      players {
        id
        name
        isHost
        score
      }
    }
  }
`

export type RoomByIdVars = {
  roomId: string;
};

export type RoomByIdData = {
  roomById: {
    id: string;
    joinCode: string;
    settings: {
      lobbyName: string;
      rounds: number;
      playerLimit: number;
      timeLimit: number;
    };
    players: {
      id: string;
      name: string;
      isHost: boolean;
      score: number;
    }[];
  };
};

export const ROOM_UPDATED = gql`
  subscription RoomUpdated($roomId: ID!) {
    roomUpdated(roomId: $roomId) {
      id
      settings {
        lobbyName
        rounds
        playerLimit
        timeLimit
      }
      players {
        id
        name
        isHost
        score
      }
    }
  }
`

export type RoomUpdatedVars = {
  roomId: string;
};

export type RoomUpdatedData = {
  roomUpdated: {
    id: string;
    settings: {
      lobbyName: string;
      rounds: number;
      playerLimit: number;
      timeLimit: number;
    };
    players: {
      id: string;
      name: string;
      isHost: boolean;
      score: number;
    }[];
  };
};

export const LEAVE_ROOM = gql`
  mutation LeaveRoom($roomId: ID!, $playerId: ID!) {
    leaveRoom(roomId: $roomId, playerId: $playerId) {
      roomId
      closed
      room {
        id
        players {
          id
        }
      }
    }
  }
`

export type LeaveRoomVars = {
  roomId: string;
  playerId: string;
};

export type LeaveRoomData = {
  leaveRoom: {
    roomId: string;
    closed: boolean;
    room: {
      id: string;
      players: {
        id: string;
      } | null;
    };
  };
};

export const KICK_PLAYER = gql`
  mutation KickPlayer($roomId: ID!, $playerId: ID!) {
    kickPlayer(roomId: $roomId, playerId: $playerId) {
      id
      players {
        id
      }
    }
  }
`

export const START_GAME = gql`
  mutation StartGame($roomId: ID!) {
    startGame(roomId: $roomId) {
      id
      status
    }
  }
`