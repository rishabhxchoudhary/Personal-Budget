import React from 'react';
import { LoginButton } from '@/features/auth/components/login-button';
import { redirect } from 'next/navigation';
import { getSession } from '@/auth';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  // Check if user is already authenticated
  const session = await getSession();
  if (session?.user) {
    redirect(searchParams.callbackUrl || '/');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          padding: '2rem',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Personal Budget Manager
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          Sign in to manage your personal finances
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <LoginButton callbackUrl={searchParams.callbackUrl || '/'} />
        </div>

        <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
          By signing in, you agree to keep your financial data secure and private
        </p>
      </div>
    </div>
  );
}
