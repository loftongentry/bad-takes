import { gql } from "@apollo/client";

export const CREATE_ROOM = gql`
  mutation CreateRoom(
    $hostName: String!
    $lobbyName: String!
    $rounds: Int!
    $playerLimit: Int!
    $timeLimit: Int!
  ) {
    createRoom(
      hostName: $hostName
      lobbyName: $lobbyName
      rounds: $rounds
      playerLimit: $playerLimit
      timeLimit: $timeLimit
    ) {
      hostPlayerId
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

export type CreateRoomVars = {
  hostName: string;
  lobbyName: string;
  rounds: number;
  playerLimit: number;
  timeLimit: number;
};

export type CreateRoomData = {
  createRoom: {
    hostPlayerId: string;
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
      players: Array<{
        id: string;
        name: string;
        isHost: boolean;
        score: number;
      }>;
    };
  };
};
