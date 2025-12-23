import { HttpLink, InMemoryCache, ApolloClient, ApolloLink } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";

const HTTP_URL = process.env.EXPO_PUBLIC_GRAPHQL_URL;
const WS_URL = HTTP_URL?.replace('http', 'ws') || '';

const httpLink = new HttpLink({
  uri: HTTP_URL,
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    lazy: false,
    retryAttempts: 5,
    on: {
      connected: () => {
        console.log('WS connected');
      },
      closed: (event) => {
        console.info('WS closed', event);
      },
      error: (error) => {
        console.error('WS error', error);
      },
    }
  })
);

const link = ApolloLink.split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return (
      def.kind === 'OperationDefinition' && def.operation === 'subscription'
    );
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
        }
      }
    }
  }),
});