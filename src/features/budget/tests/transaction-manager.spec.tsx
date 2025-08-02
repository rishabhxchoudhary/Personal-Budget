import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { TransactionManager } from '@/features/budget/components/transaction-manager';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import { resetMockTransactions } from '@/mocks/handlers';

describe('TransactionManager', () => {
  beforeEach(() => {
    // Reset mock data before each test
    resetMockTransactions();
  });

  test('renders both form and list sections', async () => {
    render(<TransactionManager />);

    expect(screen.getByText('Personal Budget Manager')).toBeInTheDocument();
    expect(screen.getByText('Add New Transaction')).toBeInTheDocument();
    expect(screen.getByText('Transaction History')).toBeInTheDocument();

    // Wait for transactions to load
    await waitFor(() => {
      expect(screen.getByText('January salary')).toBeInTheDocument();
    });
  });

  test('loads and displays initial transactions', async () => {
    render(<TransactionManager itemsPerPage={3} />);

    // Should show loading state initially
    expect(screen.getByText('Loading transactions...')).toBeInTheDocument();

    // Wait for transactions to load
    await waitFor(() => {
      expect(screen.queryByText('Loading transactions...')).not.toBeInTheDocument();
    });

    // Should display transactions
    expect(screen.getByText('Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Utilities')).toBeInTheDocument();
    expect(screen.getByText('Freelance project')).toBeInTheDocument();

    // Should show pagination info (5 total transactions in mock data)
    expect(screen.getByText(/showing 1-3 of 5/i)).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    server.use(
      http.get('/api/transactions', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      }),
    );

    render(<TransactionManager />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    });
  });

  test('can toggle form visibility', async () => {
    const user = userEvent.setup();
    render(<TransactionManager />);

    // Form should be visible by default
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();

    // Click hide form button
    const toggleButton = screen.getByRole('button', { name: /hide form/i });
    await user.click(toggleButton);

    // Form should be hidden
    expect(screen.queryByLabelText(/amount/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show form/i })).toBeInTheDocument();

    // Click show form button
    await user.click(screen.getByRole('button', { name: /show form/i }));

    // Form should be visible again
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
  });

  test('adds new transaction and updates list', async () => {
    const user = userEvent.setup();
    render(<TransactionManager itemsPerPage={10} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Restaurant')).toBeInTheDocument();
    });

    // Initial count
    expect(screen.getByText(/showing 1-5 of 5/i)).toBeInTheDocument();

    // Fill out the form
    await user.type(screen.getByLabelText(/amount/i), '500');
    await user.type(screen.getByLabelText(/date/i), '2025-01-15');
    await user.selectOptions(screen.getByLabelText(/category/i), 'general');
    await user.click(screen.getByLabelText(/expense/i));
    await user.type(screen.getByLabelText(/note/i), 'New test expense');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /add transaction/i }));

    // Wait for success message and the new transaction to appear
    await waitFor(() => {
      expect(screen.getByText(/transaction added successfully/i)).toBeInTheDocument();
    });

    // The hook should automatically refresh the list
    await waitFor(() => {
      expect(screen.getByText('New test expense')).toBeInTheDocument();
    });

    // Verify the transaction appears with correct formatting
    expect(screen.getByText('-$500.00')).toBeInTheDocument();
    expect(screen.getByText('2025-01-15')).toBeInTheDocument();

    // Transaction count should be updated (was 5, now 6)
    await waitFor(() => {
      expect(screen.getByText(/showing 1-6 of 6/i)).toBeInTheDocument();
    });
  });

  test('filters work correctly in the integrated view', async () => {
    const user = userEvent.setup();
    render(<TransactionManager itemsPerPage={10} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Restaurant')).toBeInTheDocument();
    });

    // Filter by income
    const filterSelect = screen.getByLabelText(/filter by type/i);
    await user.selectOptions(filterSelect, 'income');

    // Should only show income transactions
    expect(screen.getByText('January salary')).toBeInTheDocument();
    expect(screen.getByText('Freelance project')).toBeInTheDocument();
    expect(screen.queryByText('Restaurant')).not.toBeInTheDocument();
    expect(screen.queryByText('Utilities')).not.toBeInTheDocument();

    // Count should be updated (2 income transactions in mock data)
    expect(screen.getByText(/showing 1-2 of 2/i)).toBeInTheDocument();
  });

  test('pagination works in integrated view', async () => {
    const user = userEvent.setup();
    render(<TransactionManager itemsPerPage={2} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/showing 1-2 of 5/i)).toBeInTheDocument();
    });

    // First page should show first 2 transactions (newest first)
    expect(screen.getByText('Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Utilities')).toBeInTheDocument();

    // Navigate to next page
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    // Should show next 2 transactions
    expect(screen.getByText(/showing 3-4 of 5/i)).toBeInTheDocument();
    expect(screen.getByText('Freelance project')).toBeInTheDocument();
    expect(screen.queryByText('Utilities')).not.toBeInTheDocument();
  });

  test('form resets after successful submission', async () => {
    const user = userEvent.setup();
    render(<TransactionManager />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Restaurant')).toBeInTheDocument();
    });

    // Fill and submit form
    const amountInput = screen.getByLabelText(/amount/i);
    const dateInput = screen.getByLabelText(/date/i);
    const noteInput = screen.getByLabelText(/note/i);

    await user.type(amountInput, '100');
    await user.type(dateInput, '2025-01-20');
    await user.selectOptions(screen.getByLabelText(/category/i), 'general');
    await user.click(screen.getByLabelText(/income/i));
    await user.type(noteInput, 'Test transaction');

    await user.click(screen.getByRole('button', { name: /add transaction/i }));

    // Wait for submission to complete
    await waitFor(() => {
      expect(screen.getByText('Test transaction')).toBeInTheDocument();
    });

    // Form should be reset
    expect(amountInput).toHaveValue(null);
    expect(dateInput).toHaveValue('');
    expect(noteInput).toHaveValue('');
  });

  test('handles network errors when loading transactions', async () => {
    server.use(
      http.get('/api/transactions', () => {
        return HttpResponse.error();
      }),
    );

    render(<TransactionManager />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error. Please try again.');
    });

    // Should still show the form
    expect(screen.getByText('Add New Transaction')).toBeInTheDocument();
  });

  test('shows success message after adding transaction', async () => {
    const user = userEvent.setup();
    render(<TransactionManager />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Restaurant')).toBeInTheDocument();
    });

    // Add a transaction
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/date/i), '2025-01-20');
    await user.selectOptions(screen.getByLabelText(/category/i), 'general');
    await user.click(screen.getByLabelText(/income/i));

    await user.click(screen.getByRole('button', { name: /add transaction/i }));

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/transaction added successfully/i)).toBeInTheDocument();
    });

    // Success message should disappear after a few seconds
    await waitFor(
      () => {
        expect(screen.queryByText(/transaction added successfully/i)).not.toBeInTheDocument();
      },
      { timeout: 4000 },
    );
  });

  test('persists filter selection when adding new transactions', async () => {
    const user = userEvent.setup();
    render(<TransactionManager itemsPerPage={10} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Restaurant')).toBeInTheDocument();
    });

    // Filter by expense
    const filterSelect = screen.getByLabelText(/filter by type/i);
    await user.selectOptions(filterSelect, 'expense');

    // Verify filter is applied
    expect(screen.queryByText('January salary')).not.toBeInTheDocument();
    expect(screen.getByText('Restaurant')).toBeInTheDocument();

    // Add a new expense
    await user.type(screen.getByLabelText(/amount/i), '75');
    await user.type(screen.getByLabelText(/date/i), '2025-01-20');
    await user.selectOptions(screen.getByLabelText(/category/i), 'general');
    await user.click(screen.getByLabelText(/expense/i));
    await user.type(screen.getByLabelText(/note/i), 'New expense');

    await user.click(screen.getByRole('button', { name: /add transaction/i }));

    // Wait for the new transaction
    await waitFor(() => {
      expect(screen.getByText('New expense')).toBeInTheDocument();
    });

    // Filter should still be set to expense
    expect(filterSelect).toHaveValue('expense');
    expect(screen.queryByText('January salary')).not.toBeInTheDocument();
    expect(screen.getByText('Restaurant')).toBeInTheDocument();
  });
});
