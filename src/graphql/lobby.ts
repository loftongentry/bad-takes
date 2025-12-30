import { gql } from "@apollo/client";

// 1. Fragment: Ensures we always fetch the exact same data shape
const ROOM_FRAGMENT = gql`
  fragment RoomData on Room {
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
    gameState {
      deadline
      votesCast
    }
  }
`;

export const LOBBY_OPS = {
  // --- QUERIES ---
  GET: gql`
    ${ROOM_FRAGMENT}
    query GetRoom($roomId: ID!) {
      room(id: $roomId) {
        ...RoomData
      }
    }
  `,

  // --- SUBSCRIPTIONS ---
  // Listens for "Room Closed" (null) or Updates
  SUB: gql`
    ${ROOM_FRAGMENT}
    subscription WatchRoom($roomId: ID!) {
      room(roomId: $roomId) {
        ...RoomData
      }
    }
  `,

  // --- MUTATIONS ---
  
  // Updated to match your backend Schema arguments
  CREATE: gql`
    ${ROOM_FRAGMENT}
    mutation CreateRoom(
      $hostName: String!, 
      $lobbyName: String!, 
      $rounds: Int!, 
      $playerLimit: Int!, 
      $timeLimit: Int!
    ) {
      createRoom(
        hostName: $hostName, 
        lobbyName: $lobbyName, 
        rounds: $rounds, 
        playerLimit: $playerLimit, 
        timeLimit: $timeLimit
      ) {
        hostId
        room {
          ...RoomData
        }
      }
    }
  `,

  JOIN: gql`
    ${ROOM_FRAGMENT}
    mutation JoinRoom($code: String!, $playerName: String!) {
      joinRoom(code: $code, playerName: $playerName) {
        playerId
        room {
          ...RoomData
        }
      }
    }
  `,

  LEAVE: gql`
    mutation Leave($roomId: ID!, $playerId: ID!) {
      leaveRoom(roomId: $roomId, playerId: $playerId)
    }
  `,

  KICK: gql`
    mutation Kick($roomId: ID!, $playerId: ID!) {
      kickPlayer(roomId: $roomId, playerId: $playerId)
    }
  `,

  START: gql`
    ${ROOM_FRAGMENT}
    mutation Start($roomId: ID!) {
      startGame(roomId: $roomId) {
        ...RoomData
      }
    }
  `,

  SUBMIT_PROMPT: gql`
    mutation SubmitPrompt($roomId: ID!, $playerId: ID!, $prompt: String!) {
      submitPrompt(roomId: $roomId, playerId: $playerId, prompt: $prompt)
    }
  `,
};