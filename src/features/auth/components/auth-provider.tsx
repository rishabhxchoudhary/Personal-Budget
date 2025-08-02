'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

export type AuthProviderProps = {
  children: React.ReactNode;
  session?: Session | null;
};

export function AuthProvider({ children, session }: AuthProviderProps) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}
