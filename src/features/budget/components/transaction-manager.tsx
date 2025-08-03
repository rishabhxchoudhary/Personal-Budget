'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AddTransactionForm } from './add-transaction-form';
import { TransactionList, Transaction } from './transaction-list';
import { useTransactions } from '../hooks/useTransactions';
import { UserMenu } from '@/features/auth/components/user-menu';
import { LoginButton } from '@/features/auth/components/login-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Eye, EyeOff, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TransactionManagerProps = {
  itemsPerPage?: number;
};

export function TransactionManager({ itemsPerPage = 10 }: TransactionManagerProps) {
  const { status } = useSession();
  const { transactions, fetchTransactions, isLoading, error } = useTransactions();
  const [showForm, setShowForm] = useState(true);

  const handleTransactionAdded = useCallback(async () => {
    // The hook already adds the transaction to the list, but we'll refresh to ensure consistency
    // and get the updated list from the server
    await fetchTransactions();
  }, [fetchTransactions]);

  // Fetch transactions on mount when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      fetchTransactions().catch(() => {
        // Error is already handled in the hook
      });
    }
  }, [fetchTransactions, status]);

  // Convert transactions from the API format to the list format
  const formattedTransactions: Transaction[] = transactions.map((t) => ({
    id: t.id,
    amount: t.amount,
    date: t.date,
    category: t.category,
    type: t.type as 'income' | 'expense',
    note: t.note || '',
  }));

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64 dark:bg-slate-800" />
          <p className="text-center text-muted-foreground dark:text-slate-400">Loading...</p>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[400px] dark:bg-slate-800" />
            <Skeleton className="h-[400px] dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt for unauthenticated users
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white dark:bg-slate-900">
          <CardHeader className="text-center space-y-2 pb-8">
            <div className="mx-auto w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Wallet className="h-8 w-8 text-primary dark:text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Personal Budget Manager
            </CardTitle>
            <CardDescription className="text-base text-slate-600 dark:text-slate-400">
              Track your income and expenses with ease
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Welcome!
                </h2>
                <p className="text-muted-foreground dark:text-slate-400">
                  Please sign in to access your personal budget manager and start tracking your
                  transactions.
                </p>
              </div>
              <LoginButton className="w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <div className="container max-w-7xl mx-auto p-6 space-y-8">
        {/* Header with user menu */}
        <header className="flex justify-between items-center pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
              Personal Budget Manager
            </h1>
            <p className="text-muted-foreground dark:text-slate-400">
              Manage your finances with confidence
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="relative w-full rounded-lg border p-4 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-100 shadow-md"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="text-sm">{error}</div>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Add Transaction Section */}
          {showForm && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  Add New Transaction
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  className="lg:hidden"
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </div>
              <AddTransactionForm onSubmit={handleTransactionAdded} useApi={true} />
            </section>
          )}

          {/* Transaction History Section */}
          <section className={cn('space-y-4', !showForm && 'lg:col-span-2')}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Transaction History
              </h2>
              <Button
                onClick={() => setShowForm(!showForm)}
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {showForm ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hide Form
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Show Form
                  </>
                )}
              </Button>
            </div>

            {isLoading && transactions.length === 0 ? (
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardContent className="flex items-center justify-center py-16">
                  <div
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                    className="text-center space-y-2"
                  >
                    <Skeleton className="h-4 w-32 mx-auto dark:bg-slate-800" />
                    <p className="text-sm text-muted-foreground dark:text-slate-400">
                      Loading transactions...
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <TransactionList transactions={formattedTransactions} itemsPerPage={itemsPerPage} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
