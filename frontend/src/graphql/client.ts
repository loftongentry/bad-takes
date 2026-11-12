import { AppState } from "react-native";
import { HttpLink, InMemoryCache, ApolloClient, ApolloLink } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";

const HTTP_URL = process.env.EXPO_PUBLIC_GRAPHQL_URL;
const WS_URL = HTTP_URL?.replace("http", "ws") || "";

const httpLink = new HttpLink({
  uri: HTTP_URL,
});

// The subscription only delivers changes that happen while it's connected. Anything published
// while the phone was asleep, backgrounded or offline is lost, so whenever we might have missed
// something we ask the server for the current state of every room on screen.
const catchUp = () => {
  apolloClient.refetchQueries({ include: "active" }).catch((error) => {
    console.warn("Could not refresh after reconnecting", error);
  });
};

const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    lazy: false,
    // A party game can't give up on its connection: keep trying (phones lose signal, sleep,
    // switch networks), retrying after any failure, not only clean disconnects...
    retryAttempts: Infinity,
    shouldRetry: () => true,
    // ...waiting at most ~10 seconds between attempts (the default doubles forever)
    retryWait: (retries) =>
      new Promise((resolve) =>
        setTimeout(resolve, Math.min(1000 * 2 ** retries, 10_000) + Math.random() * 1000),
      ),
    // Ping regularly so a connection that silently died is noticed and replaced
    keepAlive: 10_000,
    on: {
      connected: (_socket, _payload, wasRetry) => {
        console.log(wasRetry ? "WS reconnected" : "WS connected");
        if (wasRetry) {
          catchUp();
        }
      },
      closed: (event) => {
        console.info("WS closed", event);
      },
      error: (error) => {
        console.error("WS error", error);
      },
    },
  }),
);

const link = ApolloLink.split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === "OperationDefinition" && def.operation === "subscription";
  },
  wsLink,
  httpLink,
);

export const apolloClient = new ApolloClient({
  link: link,
  cache: new InMemoryCache({
    typePolicies: {
      Room: {
        fields: {
          players: {
            merge: false,
          },
        },
      },
    },
  }),
});

// Coming back to the app (unlocking the phone, switching back to it) is the other moment
// updates may have been missed while the connection was down
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    catchUp();
  }
});
