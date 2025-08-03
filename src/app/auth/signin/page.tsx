import React from 'react';
import { LoginButton } from '@/features/auth/components/login-button';
import { redirect } from 'next/navigation';
import { getSession } from '@/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white dark:bg-slate-900">
        <CardHeader className="text-center space-y-2 pb-6">
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Personal Budget Manager
          </CardTitle>
          <CardDescription className="text-base text-slate-600 dark:text-slate-400">
            Sign in to manage your personal finances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LoginButton callbackUrl={searchParams.callbackUrl || '/'} />

          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            By signing in, you agree to keep your financial data secure and private
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
