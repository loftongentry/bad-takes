import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";
import { ApolloServer } from "@apollo/server";
import { ApolloServerErrorCode, unwrapResolverError } from "@apollo/server/errors";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import cors from "cors";
import type { GraphQLFormattedError } from "graphql";
import { schema } from "./schema";
import { restorePhaseTimers } from "./game/turns";
import { GameError } from "./game/errors";

const GRAPH_QL = "/graphql";
const PORT = process.env.PORT || 3500;
// Largest request accepted, over HTTP or WebSocket. Real requests are a few KB at most; without
// a cap, WebSocket messages could be up to 100 MB and stall the server.
const MAX_REQUEST_BYTES = 64 * 1024;

// Errors about the request itself (malformed query, wrong argument types): sent back as they are
const REQUEST_ERROR_CODES = new Set<unknown>([
  ApolloServerErrorCode.GRAPHQL_PARSE_FAILED,
  ApolloServerErrorCode.GRAPHQL_VALIDATION_FAILED,
  ApolloServerErrorCode.BAD_USER_INPUT,
  ApolloServerErrorCode.BAD_REQUEST,
  ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND,
  ApolloServerErrorCode.PERSISTED_QUERY_NOT_SUPPORTED,
  ApolloServerErrorCode.OPERATION_RESOLUTION_FAILURE,
]);

// Game errors (see game/errors.ts) reach the app with their message, for the player to read.
// Anything else is a bug or an outage (Redis down, say): logged here in full, and replaced with a
// generic message so internals never reach the app.
function formatError(formatted: GraphQLFormattedError, error: unknown): GraphQLFormattedError {
  if (unwrapResolverError(error) instanceof GameError) {
    return formatted;
  }
  if (REQUEST_ERROR_CODES.has(formatted.extensions?.code)) {
    return formatted;
  }
  console.error("Unexpected error", formatted.path ?? "", unwrapResolverError(error));
  return {
    message: "Something went wrong on our end. Please try again.",
    extensions: { code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR },
  };
}

async function main() {
  const app = express();
  const httpServer = createServer(app);
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: GRAPH_QL,
    maxPayload: MAX_REQUEST_BYTES,
  });
  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
    formatError,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();

              // Close existing WebSocket connections.
              await new Promise<void>((resolve) => {
                wsServer.close(() => {
                  resolve();
                });
              });
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(GRAPH_QL, cors(), express.json({ limit: MAX_REQUEST_BYTES }), expressMiddleware(server));

  app.get("/health", (_req, res) => {
    res.send("OK");
  });

  httpServer.listen(PORT, () => {
    console.log(`HTTP: http://localhost:${PORT}${GRAPH_QL}`);
    console.log(`WS:   ws://localhost:${PORT}${GRAPH_QL}`);
  });

  // Phase timers are in memory, so pick up any defenses/votes that were running before a restart
  restorePhaseTimers().catch((err) => console.error("Failed to restore phase timers", err));
}

main().catch((err) => {
  console.error("Server failed to start", err);
  process.exit(1);
});
