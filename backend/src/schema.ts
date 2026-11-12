// TODO: Track who submitted prompts
// TODO: Track votes to be able to display users who have and have not voted on when waiting between players' defenses (who are we waiting to vote - should also implement a timer on that as well to force timely voting)
import { makeExecutableSchema } from "@graphql-tools/schema";
import { resolvers } from "./resolvers";

const typeDefs = `
  # The phases of a game, in order (DEFENSE and VOTING repeat once per turn)
  enum RoomStatus {
    LOBBY
    PROMPT_ENTRY
    DEFENSE
    VOTING
    RESULTS
  }

  type Range {
    min: Int!
    max: Int!
  }

  # The game's rules and limits, so the app doesn't keep its own copies (see game/rules.ts)
  type GameRules {
    minPlayers: Int!
    rounds: Range!
    playerLimit: Range!
    # Defense time, in seconds
    timeLimit: Range!
    # Writing time, in seconds
    promptTimeLimit: Range!
    # "Get ready" countdown before each defense; included in the defense deadline
    prepSeconds: Int!
    voteSeconds: Int!
    playerNameMaxLength: Int!
    lobbyNameMaxLength: Int!
    promptMaxLength: Int!
  }

  type RoomSettings {
    lobbyName: String!
    rounds: Int!
    playerLimit: Int!
    timeLimit: Int!
    # Seconds players get to write their take
    promptTimeLimit: Int!
  }
    
  type Player {
    id: ID!
    name: String!
    isHost: Boolean!
    score: Int!
  }

  type TurnInfo {
    defenderId: ID!
    promptId: ID!
    promptText: String!
  }

  type GameState {
    deadline: String
    votesCast: Int
    submittedPromptsCount: Int
    currentTurn: TurnInfo
  }

  type Room {
    id: ID!
    joinCode: String!
    status: RoomStatus!
    settings: RoomSettings!
    players: [Player!]!
    gameState: GameState
  }

  # playerToken is a secret, returned only to the player who created or joined. Every action
  # identifies the caller by it. Player ids are public, so they never authorize anything.
  type CreateResponse { hostId: ID!, playerToken: String!, room: Room! }
  type JoinResponse { playerId: ID!, playerToken: String!, room: Room! }

  type Query {
    room(id: ID!): Room
    rules: GameRules!
  }

  type Mutation {
    createRoom(hostName: String!, lobbyName: String!, rounds: Int!, playerLimit: Int!, timeLimit: Int!, promptTimeLimit: Int!): CreateResponse!
    joinRoom(code: String!, playerName: String!): JoinResponse!
    leaveRoom(roomId: ID!, playerToken: String!): Boolean!
    # Host only. playerId is the public id of the player to remove.
    kickPlayer(roomId: ID!, playerToken: String!, playerId: ID!): Boolean!
    # Host only
    startGame(roomId: ID!, playerToken: String!): Room!
    submitPrompt(roomId: ID!, playerToken: String!, prompt: String!): Boolean!
    # The defender ending their defense early; the server ends it automatically at gameState.deadline
    endTurn(roomId: ID!, playerToken: String!): Boolean!
    submitVote(roomId: ID!, playerToken: String!, value: Int!): Boolean!
    # Host only
    resetGame(roomId: ID!, playerToken: String!): Boolean!
  }

  type Subscription {
    room(roomId: ID!): Room
  }
`;

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
