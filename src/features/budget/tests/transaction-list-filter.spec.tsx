import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
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

describe('TransactionList - Filter functionality', () => {
  test('renders filter dropdown with all options', () => {
    render(<TransactionList transactions={mockTransactions} itemsPerPage={5} />);

    const filterSelect = screen.getByLabelText(/filter by type/i);
    expect(filterSelect).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('All');
    expect(options[1]).toHaveTextContent('Income');
    expect(options[2]).toHaveTextContent('Expense');
  });

  test('shows all transactions by default', () => {
    render(<TransactionList transactions={mockTransactions} itemsPerPage={10} />);

    // Should show first 10 transactions
    expect(screen.getByText(/showing 1-10 of 12/i)).toBeInTheDocument();
  });

  test('filters to show only income transactions', async () => {
    const user = userEvent.setup();
    render(<TransactionList transactions={mockTransactions} itemsPerPage={10} />);

    const filterSelect = screen.getByLabelText(/filter by type/i);
    await user.selectOptions(filterSelect, 'income');

    // Income transactions: 1, 3, 6, 8, 10, 12 (6 total)
    expect(screen.getByText(/showing 1-6 of 6/i)).toBeInTheDocument();

    // Verify income transactions are shown
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('Freelance')).toBeInTheDocument();
    expect(screen.getByText('Bonus')).toBeInTheDocument();

    // Verify expense transactions are not shown
    expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('Coffee')).not.toBeInTheDocument();
  });

  test('filters to show only expense transactions', async () => {
    const user = userEvent.setup();
    render(<TransactionList transactions={mockTransactions} itemsPerPage={10} />);

    const filterSelect = screen.getByLabelText(/filter by type/i);
    await user.selectOptions(filterSelect, 'expense');

    // Expense transactions: 2, 4, 5, 7, 9, 11 (6 total)
    expect(screen.getByText(/showing 1-6 of 6/i)).toBeInTheDocument();

    // Verify expense transactions are shown
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('Utilities')).toBeInTheDocument();

    // Verify income transactions are not shown
    expect(screen.queryByText('Salary')).not.toBeInTheDocument();
    expect(screen.queryByText('Bonus')).not.toBeInTheDocument();
  });

  test('resets to first page when filter changes', async () => {
    const user = userEvent.setup();
    render(<TransactionList transactions={mockTransactions} itemsPerPage={3} />);

    // Navigate to page 2
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);
    expect(screen.getByText(/showing 4-6 of 12/i)).toBeInTheDocument();

    // Apply filter
    const filterSelect = screen.getByLabelText(/filter by type/i);
    await user.selectOptions(filterSelect, 'income');

    // Should be back on page 1
    expect(screen.getByText(/showing 1-3 of 6/i)).toBeInTheDocument();
  });

  test('shows empty state when no transactions match filter', async () => {
    const user = userEvent.setup();
    const singleExpenseTransaction = [mockTransactions[1]]; // Only expense transaction

    render(<TransactionList transactions={singleExpenseTransaction} itemsPerPage={5} />);

    // Filter by income when only expense exists
    const filterSelect = screen.getByLabelText(/filter by type/i);
    await user.selectOptions(filterSelect, 'income');

    expect(screen.getByText(/no transactions found/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  test('pagination works correctly with filters', async () => {
    const user = userEvent.setup();
    render(<TransactionList transactions={mockTransactions} itemsPerPage={3} />);

    // Filter to income (6 transactions)
    const filterSelect = screen.getByLabelText(/filter by type/i);
    await user.selectOptions(filterSelect, 'income');

    // Page 1: showing 3 of 6
    expect(screen.getByText(/showing 1-3 of 6/i)).toBeInTheDocument();

    // Navigate to page 2
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    // Page 2: showing remaining 3
    expect(screen.getByText(/showing 4-6 of 6/i)).toBeInTheDocument();

    // Next button should be disabled on last page
    expect(nextButton).toBeDisabled();
  });

  test('filter dropdown persists when showing empty state', async () => {
    const user = userEvent.setup();
    const singleExpenseTransaction = [mockTransactions[1]];

    render(<TransactionList transactions={singleExpenseTransaction} itemsPerPage={5} />);

    // Filter by income when only expense exists
    const filterSelect = screen.getByLabelText(/filter by type/i);
    await user.selectOptions(filterSelect, 'income');

    // Filter should still be visible
    expect(screen.getByLabelText(/filter by type/i)).toBeInTheDocument();
    expect(screen.getByText(/no transactions found/i)).toBeInTheDocument();

    // Should be able to change filter back
    await user.selectOptions(filterSelect, 'all');
    expect(screen.queryByText(/no transactions found/i)).not.toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  test('switching filters maintains correct transaction display', async () => {
    const user = userEvent.setup();
    render(<TransactionList transactions={mockTransactions} itemsPerPage={10} />);

    const filterSelect = screen.getByLabelText(/filter by type/i);

    // Start with all
    expect(screen.getByText(/showing 1-10 of 12/i)).toBeInTheDocument();

    // Switch to income
    await user.selectOptions(filterSelect, 'income');
    expect(screen.getByText(/showing 1-6 of 6/i)).toBeInTheDocument();

    // Switch to expense
    await user.selectOptions(filterSelect, 'expense');
    expect(screen.getByText(/showing 1-6 of 6/i)).toBeInTheDocument();

    // Switch back to all
    await user.selectOptions(filterSelect, 'all');
    expect(screen.getByText(/showing 1-10 of 12/i)).toBeInTheDocument();
  });
});
