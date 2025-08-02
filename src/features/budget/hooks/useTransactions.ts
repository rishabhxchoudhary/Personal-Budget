import { useState, useCallback } from 'react';
import { TransactionFormData } from '../utils/validation';

export type Transaction = TransactionFormData & {
  id: string;
  createdAt: string;
};

export type TransactionFilter = {
  type?: 'all' | 'income' | 'expense';
  page?: number;
  limit?: number;
};

export type UseTransactionsReturn = {
  transactions: Transaction[];
  totalCount: number;
  createTransaction: (data: TransactionFormData) => Promise<Transaction>;
  fetchTransactions: (filter?: TransactionFilter) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
};

export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchTransactions = useCallback(async (filter?: TransactionFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter?.type && filter.type !== 'all') {
        params.append('type', filter.type);
      }
      if (filter?.page) {
        params.append('page', filter.page.toString());
      }
      if (filter?.limit) {
        params.append('limit', filter.limit.toString());
      }

      const response = await fetch(`/api/transactions?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Network error. Please try again.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTransaction = useCallback(async (data: TransactionFormData): Promise<Transaction> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save transaction`);
      }

      const transaction = await response.json();
      return transaction;
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Network error. Please try again.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    transactions,
    totalCount,
    createTransaction,
    fetchTransactions,
    isLoading,
    error,
    clearError,
  };
}
