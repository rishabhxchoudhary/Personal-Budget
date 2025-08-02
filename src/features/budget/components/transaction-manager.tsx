import React, { useState, useCallback, useEffect } from 'react';
import { AddTransactionForm } from './add-transaction-form';
import { TransactionList, Transaction } from './transaction-list';
import { useTransactions } from '../hooks/useTransactions';

export type TransactionManagerProps = {
  itemsPerPage?: number;
};

export function TransactionManager({ itemsPerPage = 10 }: TransactionManagerProps) {
  const { transactions, fetchTransactions, isLoading, error } = useTransactions();
  const [showForm, setShowForm] = useState(true);

  const handleTransactionAdded = useCallback(async () => {
    // The hook already adds the transaction to the list, but we'll refresh to ensure consistency
    // and get the updated list from the server
    await fetchTransactions();
  }, [fetchTransactions]);

  // Fetch transactions on mount
  useEffect(() => {
    fetchTransactions().catch(() => {
      // Error is already handled in the hook
    });
  }, [fetchTransactions]);

  // Convert transactions from the API format to the list format
  const formattedTransactions: Transaction[] = transactions.map((t) => ({
    id: t.id,
    amount: t.amount,
    date: t.date,
    category: t.category,
    type: t.type as 'income' | 'expense',
    note: t.note || '',
  }));

  return (
    <div>
      <h1>Personal Budget Manager</h1>

      {error && (
        <div role="alert" style={{ color: 'red', marginBottom: '1rem' }}>
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
          <div>Loading transactions...</div>
        ) : (
          <TransactionList transactions={formattedTransactions} itemsPerPage={itemsPerPage} />
        )}
      </section>
    </div>
  );
}
