import type { NextAuthConfig } from 'next-auth';
import { DynamoDB, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { DynamoDBAdapter } from '@auth/dynamodb-adapter';
import Google from 'next-auth/providers/google';

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image: string | null;
    };
    expires: string;
  }

  interface User {
    id: string;
    email: string;
    name: string;
    image: string | null;
  }
}

const config: DynamoDBClientConfig = {
  credentials: {
    accessKeyId: process.env.AUTH_DYNAMODB_ID ?? '',
    secretAccessKey: process.env.AUTH_DYNAMODB_SECRET ?? '',
  },
  region: process.env.AUTH_DYNAMODB_REGION,
};

const client = DynamoDBDocument.from(new DynamoDB(config), {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? '',
    }),
  ],
  adapter: DynamoDBAdapter(client, {
    tableName: process.env.AUTH_DYNAMODB_TABLE_NAME ?? 'auth-js',
    partitionKey: 'pk',
    sortKey: 'sk',
    indexName: 'GSI1',
    indexPartitionKey: 'GSI1PK',
    indexSortKey: 'GSI1SK',
  }),
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = user?.id ?? token?.sub ?? '';
        session.user.email = user?.email ?? session.user.email ?? '';
        session.user.name = user?.name ?? session.user.name ?? '';
        session.user.image = user?.image ?? session.user.image ?? null;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
} satisfies NextAuthConfig;
