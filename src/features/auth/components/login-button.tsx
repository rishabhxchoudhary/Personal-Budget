'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';

import { cn } from '@/lib/utils';

export type LoginButtonProps = {
  callbackUrl?: string;
  className?: string;
};

export function LoginButton({ callbackUrl = '/', className }: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await signIn('google', {
        callbackUrl,
        redirect: true,
      });
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      console.error('Sign in error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-4">
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"
        >
          <div className="text-sm [&_p]:leading-relaxed">{error}</div>
        </div>
      )}
      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          'w-full h-12 relative bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium shadow-sm transition-all duration-200 hover:shadow-md px-4 py-2',
          className,
        )}
        aria-label="Sign in with Google"
        aria-busy={isLoading}
        style={{
          backgroundColor: isHovered && !isLoading ? '#f8f9fa' : '#fff',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.6 : 1,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Google Icon SVG */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 48 48"
          aria-hidden="true"
          className="absolute left-4"
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        <span className="ml-6">{isLoading ? 'Signing in...' : 'Sign in with Google'}</span>
      </button>
    </div>
  );
}
