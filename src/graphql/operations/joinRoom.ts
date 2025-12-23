import { gql } from "@apollo/client";

export const JOIN_ROOM = gql`
  mutation JoinRoom(
    $joinCode: String!
    $playerName: String!
  ) {
    joinRoom(
      joinCode: $joinCode
      playerName: $playerName
    ) {
      playerId
      room {
        id
        joinCode
        status
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
  }
`

export type JoinRoomVars = {
  joinCode: string;
  playerName: string;
};

export type JoinRoomData = {
  joinRoom: {
    playerId: string;
    room: {
      id: string;
      joinCode: string;
      status: string;
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
};