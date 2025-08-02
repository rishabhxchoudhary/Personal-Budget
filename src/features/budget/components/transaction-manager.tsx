import React, { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AddTransactionForm } from './add-transaction-form';
import { TransactionList, Transaction } from './transaction-list';
import { useTransactions } from '../hooks/useTransactions';
import { UserMenu } from '@/features/auth/components/user-menu';
import { LoginButton } from '@/features/auth/components/login-button';

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
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Show sign-in prompt for unauthenticated users
  if (status === 'unauthenticated') {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <h1>Personal Budget Manager</h1>
        <div
          style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            marginTop: '2rem',
          }}
        >
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Welcome!</h2>
          <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
            Please sign in to access your personal budget manager and start tracking your
            transactions.
          </p>
          <LoginButton />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with user menu */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <h1>Personal Budget Manager</h1>
        <UserMenu />
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            color: '#dc2626',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {showForm && (
        <section style={{ marginBottom: '2rem' }}>
          <h2>Add New Transaction</h2>
          <AddTransactionForm onSubmit={handleTransactionAdded} useApi={true} />
        </section>
      )}

      <section>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2>Transaction History</h2>
          <button onClick={() => setShowForm(!showForm)} type="button">
            {showForm ? 'Hide Form' : 'Show Form'}
          </button>
        </div>

        {isLoading && transactions.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            style={{ textAlign: 'center', padding: '2rem' }}
          >
            Loading transactions...
          </div>
        ) : (
          <TransactionList transactions={formattedTransactions} itemsPerPage={itemsPerPage} />
        )}
      </section>
    </div>
  );
}
