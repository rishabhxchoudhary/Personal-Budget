import React, { useState } from 'react';

export type Transaction = {
  id: string;
  amount: string;
  date: string;
  category: string;
  type: 'income' | 'expense';
  note: string;
};

export type TransactionListProps = {
  transactions: Transaction[];
  itemsPerPage: number;
};

export function TransactionList({ transactions, itemsPerPage }: TransactionListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  if (transactions.length === 0) {
    return <div>No transactions found</div>;
  }

  // Calculate pagination
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, transactions.length);
  const currentTransactions = transactions.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const formatAmount = (amount: string, type: 'income' | 'expense'): string => {
    const value = parseFloat(amount);
    const formatted = value.toFixed(2);
    return type === 'expense' ? `-$${formatted}` : `$${formatted}`;
  };

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {currentTransactions.map((transaction) => (
            <tr key={transaction.id} data-transaction-type={transaction.type}>
              <td>{transaction.date}</td>
              <td>{transaction.type}</td>
              <td>{transaction.category}</td>
              <td>{formatAmount(transaction.amount, transaction.type)}</td>
              <td>{transaction.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <span>
          Showing {startIndex + 1}-{endIndex} of {transactions.length}
        </span>
        <button onClick={handlePreviousPage} disabled={currentPage === 1}>
          Previous
        </button>
        <button onClick={handleNextPage} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}
