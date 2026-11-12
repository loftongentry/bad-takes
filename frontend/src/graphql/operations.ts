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
      submittedPromptsCount
      currentTurn {
        defenderId
        promptId
        promptText
      } 
    }
  }
`;

export const ROOM_OPS = {
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

  // Host-only mutations send the caller's own player id as hostId; the server checks it

  KICK: gql`
    mutation Kick($roomId: ID!, $hostId: ID!, $playerId: ID!) {
      kickPlayer(roomId: $roomId, hostId: $hostId, playerId: $playerId)
    }
  `,

  START: gql`
    ${ROOM_FRAGMENT}
    mutation Start($roomId: ID!, $hostId: ID!) {
      startGame(roomId: $roomId, hostId: $hostId) {
        ...RoomData
      }
    }
  `,

  SUBMIT_PROMPT: gql`
    mutation SubmitPrompt($roomId: ID!, $playerId: ID!, $prompt: String!) {
      submitPrompt(roomId: $roomId, playerId: $playerId, prompt: $prompt)
    }
  `,

  // Defender only. When time runs out, the server ends the turn itself.
  END_TURN: gql`
    mutation EndTurn($roomId: ID!, $playerId: ID!) {
      endTurn(roomId: $roomId, playerId: $playerId)
    }
  `,

  SUBMIT_VOTE: gql`
    mutation SubmitVote($roomId: ID!, $playerId: ID!, $value: Int!) {
      submitVote(roomId: $roomId, playerId: $playerId, value: $value)
    }
  `,

  RESET_GAME: gql`
    mutation ResetGame($roomId: ID!, $hostId: ID!) {
      resetGame(roomId: $roomId, hostId: $hostId)
    }
  `,
};