import "dotenv/config";
import express from "express";
import { createServer, type IncomingMessage } from "http";
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
import { ALLOWED_ORIGINS, PRODUCTION, TRUST_PROXY, isAllowedWebSocketOrigin } from "./security";
import type { Context } from "./resolvers";
import { alreadyLogged, logger } from "./logger";
import { redis } from "./db/redis";

const GRAPH_QL = "/graphql";
const PORT = process.env.PORT || 3500;
// Largest request accepted, over HTTP or WebSocket. Real requests are a few KB at most; without
// a cap, WebSocket messages could be up to 100 MB and stall the server.
const MAX_REQUEST_BYTES = 64 * 1024;

// How long /health waits for Redis to answer before calling it down
const HEALTH_TIMEOUT_MS = 1000;

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
  const original = unwrapResolverError(error);
  if (!alreadyLogged(original)) {
    logger.error({ path: formatted.path, err: original }, "request failed");
  }
  return {
    message: "Something went wrong on our end. Please try again.",
    extensions: { code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR },
  };
}

async function main() {
  const app = express();
  app.set("trust proxy", TRUST_PROXY);
  const httpServer = createServer(app);
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: GRAPH_QL,
    maxPayload: MAX_REQUEST_BYTES,
    // Live updates only for the app's own web pages (see ALLOWED_ORIGINS)
    verifyClient: ({ req }: { req: IncomingMessage }) => isAllowedWebSocketOrigin(req),
  });
  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer<Context>({
    schema,
    formatError,
    // The schema is public in the repo, but there's no need to hand it out in production
    introspection: !PRODUCTION,
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

  if (PRODUCTION && ALLOWED_ORIGINS.length === 0) {
    logger.warn("ALLOWED_ORIGINS is not set: any web page can use this API from a browser");
  }
  app.use(
    GRAPH_QL,
    // Unset in development: any page may call the API
    cors(ALLOWED_ORIGINS.length ? { origin: ALLOWED_ORIGINS } : undefined),
    express.json({ limit: MAX_REQUEST_BYTES }),
    expressMiddleware(server, {
      // The caller's address, for rate limits (see TRUST_PROXY)
      context: async ({ req }) => ({ ip: req.ip ?? "unknown" }),
    }),
  );

  // For the host's uptime checks: healthy only if Redis answers too, since no game works without
  // it. 503 otherwise, so a load balancer stops sending players here.
  app.get("/health", async (_req, res) => {
    const redisUp = await Promise.race([
      redis.ping().then(
        () => true,
        () => false,
      ),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), HEALTH_TIMEOUT_MS)),
    ]);
    res
      .status(redisUp ? 200 : 503)
      .json({ status: redisUp ? "ok" : "unavailable", redis: redisUp });
  });

  httpServer.listen(PORT, () => {
    logger.info(`Listening on http://localhost:${PORT}${GRAPH_QL} (WebSocket on ws://)`);
  });

  // Phase timers are in memory, so pick up any defenses/votes that were running before a restart
  restorePhaseTimers().catch((err) => logger.error({ err }, "couldn't restore phase timers"));
}

main().catch((err) => {
  logger.fatal({ err }, "server failed to start");
  process.exit(1);
});
