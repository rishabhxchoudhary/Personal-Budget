import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { TransactionFormData } from '../utils/validation';

export type Transaction = {
  id: string;
  amount: string;
  date: string;
  category: string;
  type: 'income' | 'expense';
  note?: string;
  createdAt: string;
  userId?: string;
};

export type TransactionFilter = 'all' | 'income' | 'expense';

export type UseTransactionsReturn = {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  fetchTransactions: (filter?: TransactionFilter) => Promise<void>;
  createTransaction: (data: TransactionFormData) => Promise<Transaction>;
  clearError: () => void;
};

export function useTransactions(): UseTransactionsReturn {
  const { data: session, status } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchTransactions = useCallback(
    async (filter: TransactionFilter = 'all') => {
      // Don't fetch if not authenticated
      if (status === 'loading') return;
      if (status === 'unauthenticated' || !session?.user) {
        setError('Please sign in to view your transactions');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filter !== 'all') {
          params.append('type', filter);
        }
        // Include user ID in the query
        params.append('userId', session.user.id);

        const response = await fetch(`/api/transactions?${params.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Please sign in to view your transactions');
          }
          const errorData = await response
            .json()
            .catch(() => ({ error: 'Failed to fetch transactions' }));
          throw new Error(errorData.error || 'Failed to fetch transactions');
        }

        const data = await response.json();
        setTransactions(data.transactions || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(message);
        console.error('Error fetching transactions:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [session, status],
  );

  const createTransaction = useCallback(
    async (data: TransactionFormData): Promise<Transaction> => {
      // Check authentication
      if (status === 'unauthenticated' || !session?.user) {
        throw new Error('Please sign in to add transactions');
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            ...data,
            userId: session.user.id,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Please sign in to add transactions');
          }
          const errorData = await response
            .json()
            .catch(() => ({ error: 'Failed to save transaction' }));
          throw new Error(errorData.error || 'Failed to save transaction');
        }

        const newTransaction = await response.json();

        // Add the new transaction to the list
        setTransactions((prev) => [newTransaction, ...prev]);

        return newTransaction;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Network error. Please try again.';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [session, status],
  );

  return {
    transactions,
    isLoading,
    error,
    fetchTransactions,
    createTransaction,
    clearError,
  };
}
