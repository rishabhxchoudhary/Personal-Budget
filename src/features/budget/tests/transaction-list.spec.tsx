import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
// 🚨 This import should fail initially (good: RED first)
import { TransactionList } from '@/features/budget/components/transaction-list';

const mockTransactions: Array<{
  id: string;
  amount: string;
  date: string;
  category: string;
  type: 'income' | 'expense';
  note: string;
}> = [
  {
    id: '1',
    amount: '100',
    date: '2025-01-01',
    category: 'general',
    type: 'income',
    note: 'Salary',
  },
  {
    id: '2',
    amount: '50',
    date: '2025-01-02',
    category: 'general',
    type: 'expense',
    note: 'Groceries',
  },
  {
    id: '3',
    amount: '200',
    date: '2025-01-03',
    category: 'general',
    type: 'income',
    note: 'Freelance',
  },
  {
    id: '4',
    amount: '30',
    date: '2025-01-04',
    category: 'general',
    type: 'expense',
    note: 'Coffee',
  },
  {
    id: '5',
    amount: '150',
    date: '2025-01-05',
    category: 'general',
    type: 'expense',
    note: 'Utilities',
  },
  {
    id: '6',
    amount: '300',
    date: '2025-01-06',
    category: 'general',
    type: 'income',
    note: 'Bonus',
  },
  {
    id: '7',
    amount: '75',
    date: '2025-01-07',
    category: 'general',
    type: 'expense',
    note: 'Entertainment',
  },
  { id: '8', amount: '125', date: '2025-01-08', category: 'general', type: 'income', note: 'Gift' },
  {
    id: '9',
    amount: '90',
    date: '2025-01-09',
    category: 'general',
    type: 'expense',
    note: 'Transport',
  },
  {
    id: '10',
    amount: '180',
    date: '2025-01-10',
    category: 'general',
    type: 'income',
    note: 'Investment',
  },
  {
    id: '11',
    amount: '45',
    date: '2025-01-11',
    category: 'general',
    type: 'expense',
    note: 'Lunch',
  },
  {
    id: '12',
    amount: '220',
    date: '2025-01-12',
    category: 'general',
    type: 'income',
    note: 'Side project',
  },
];

describe('TransactionList', () => {
  test('renders empty state when no transactions', () => {
    render(<TransactionList transactions={[]} itemsPerPage={5} />);

    expect(screen.getByText(/no transactions found/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  test('renders transactions with correct fields', () => {
    render(<TransactionList transactions={mockTransactions.slice(0, 3)} itemsPerPage={5} />);

    // Check headers
    expect(screen.getByText(/date/i)).toBeInTheDocument();
    expect(screen.getByText(/type/i)).toBeInTheDocument();
    expect(screen.getByText(/category/i)).toBeInTheDocument();
    expect(screen.getByText(/amount/i)).toBeInTheDocument();
    expect(screen.getByText(/note/i)).toBeInTheDocument();

    // Check first transaction
    expect(screen.getByText('2025-01-01')).toBeInTheDocument();
    expect(screen.getAllByText('income')[0]).toBeInTheDocument();
    expect(screen.getAllByText('general')[0]).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
  });

  test('displays correct number of items per page', () => {
    render(<TransactionList transactions={mockTransactions} itemsPerPage={5} />);

    // Should show 5 items on first page
    const rows = screen.getAllByRole('row');
    // +1 for header row
    expect(rows).toHaveLength(6);

    // Check pagination info
    expect(screen.getByText(/showing 1-5 of 12/i)).toBeInTheDocument();
  });

  test('navigates to next page', async () => {
    const user = userEvent.setup();
    render(<TransactionList transactions={mockTransactions} itemsPerPage={5} />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    // Should show items 6-10
    expect(screen.getByText(/showing 6-10 of 12/i)).toBeInTheDocument();
    expect(screen.getByText('2025-01-06')).toBeInTheDocument();
    expect(screen.getByText('Bonus')).toBeInTheDocument();
  });

  test('navigates to previous page', async () => {
    const user = userEvent.setup();
    render(<TransactionList transactions={mockTransactions} itemsPerPage={5} />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    const prevButton = screen.getByRole('button', { name: /previous/i });
    await user.click(prevButton);

    // Should be back on first page
    expect(screen.getByText(/showing 1-5 of 12/i)).toBeInTheDocument();
    expect(screen.getByText('2025-01-01')).toBeInTheDocument();
  });

  test('disables previous button on first page', () => {
    render(<TransactionList transactions={mockTransactions} itemsPerPage={5} />);

    const prevButton = screen.getByRole('button', { name: /previous/i });
    expect(prevButton).toBeDisabled();
  });

  test('disables next button on last page', async () => {
    const user = userEvent.setup();
    render(<TransactionList transactions={mockTransactions} itemsPerPage={5} />);

    const nextButton = screen.getByRole('button', { name: /next/i });

    // Go to page 2
    await user.click(nextButton);
    expect(nextButton).not.toBeDisabled();

    // Go to page 3 (last page)
    await user.click(nextButton);
    expect(screen.getByText(/showing 11-12 of 12/i)).toBeInTheDocument();
    expect(nextButton).toBeDisabled();
  });

  test('formats amounts based on transaction type', () => {
    render(<TransactionList transactions={mockTransactions.slice(0, 2)} itemsPerPage={5} />);

    // Income should be positive
    expect(screen.getByText('$100.00')).toBeInTheDocument();

    // Expense should be negative
    expect(screen.getByText('-$50.00')).toBeInTheDocument();
  });

  test('applies correct styling to income and expense rows', () => {
    render(<TransactionList transactions={mockTransactions.slice(0, 2)} itemsPerPage={5} />);

    const incomeRow = screen.getByText('$100.00').closest('tr');
    const expenseRow = screen.getByText('-$50.00').closest('tr');

    expect(incomeRow).toHaveAttribute('data-transaction-type', 'income');
    expect(expenseRow).toHaveAttribute('data-transaction-type', 'expense');
  });
});
