import { useState, useCallback } from 'react';
import { TransactionFormData } from '../utils/validation';

export type Transaction = TransactionFormData & {
  id: string;
  createdAt: string;
};

export type UseTransactionsReturn = {
  createTransaction: (data: TransactionFormData) => Promise<Transaction>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
};

export function useTransactions(): UseTransactionsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
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
    createTransaction,
    isLoading,
    error,
    clearError,
  };
}
