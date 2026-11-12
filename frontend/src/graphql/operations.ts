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
      promptTimeLimit
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

  // The game's rules and limits (the same for every room), so the app never hard-codes them
  RULES: gql`
    query GetRules {
      rules {
        minPlayers
        rounds {
          min
          max
        }
        playerLimit {
          min
          max
        }
        timeLimit {
          min
          max
        }
        promptTimeLimit {
          min
          max
        }
        prepSeconds
        voteSeconds
        playerNameMaxLength
        lobbyNameMaxLength
        promptMaxLength
      }
    }
  `,

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
      $hostName: String!
      $lobbyName: String!
      $rounds: Int!
      $playerLimit: Int!
      $timeLimit: Int!
      $promptTimeLimit: Int!
    ) {
      createRoom(
        hostName: $hostName
        lobbyName: $lobbyName
        rounds: $rounds
        playerLimit: $playerLimit
        timeLimit: $timeLimit
        promptTimeLimit: $promptTimeLimit
      ) {
        hostId
        playerToken
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
        playerToken
        room {
          ...RoomData
        }
      }
    }
  `,

  // Every action identifies the caller by their secret playerToken (from create/join).
  // The server checks it, including that host-only actions come from the host.

  LEAVE: gql`
    mutation Leave($roomId: ID!, $playerToken: String!) {
      leaveRoom(roomId: $roomId, playerToken: $playerToken)
    }
  `,

  // Host only. $playerId is the public id of the player to remove.
  KICK: gql`
    mutation Kick($roomId: ID!, $playerToken: String!, $playerId: ID!) {
      kickPlayer(roomId: $roomId, playerToken: $playerToken, playerId: $playerId)
    }
  `,

  // Host only
  START: gql`
    ${ROOM_FRAGMENT}
    mutation Start($roomId: ID!, $playerToken: String!) {
      startGame(roomId: $roomId, playerToken: $playerToken) {
        ...RoomData
      }
    }
  `,

  SUBMIT_PROMPT: gql`
    mutation SubmitPrompt($roomId: ID!, $playerToken: String!, $prompt: String!) {
      submitPrompt(roomId: $roomId, playerToken: $playerToken, prompt: $prompt)
    }
  `,

  // Defender only. When time runs out, the server ends the turn itself.
  END_TURN: gql`
    mutation EndTurn($roomId: ID!, $playerToken: String!) {
      endTurn(roomId: $roomId, playerToken: $playerToken)
    }
  `,

  SUBMIT_VOTE: gql`
    mutation SubmitVote($roomId: ID!, $playerToken: String!, $value: Int!) {
      submitVote(roomId: $roomId, playerToken: $playerToken, value: $value)
    }
  `,

  // Host only
  RESET_GAME: gql`
    mutation ResetGame($roomId: ID!, $playerToken: String!) {
      resetGame(roomId: $roomId, playerToken: $playerToken)
    }
  `,
};
