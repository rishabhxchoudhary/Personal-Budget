import NextAuth from "next-auth";
import { authConfig } from "./config";

export const {
  auth,
  handlers,
  signIn,
  signOut,
} = NextAuth(authConfig);

export { authConfig };

// Helper functions for common auth operations
export async function getSession() {
  return await auth();
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}
