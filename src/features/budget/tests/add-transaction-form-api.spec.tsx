import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AddTransactionForm } from '@/features/budget/components/add-transaction-form';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';

describe('AddTransactionForm API Integration', () => {
  test('submits transaction data to API on valid form submission', async () => {
    const user = userEvent.setup();
    let capturedRequest: Record<string, unknown> | null = null;

    // Mock the API endpoint
    server.use(
      http.post('/api/transactions', async ({ request }) => {
        capturedRequest = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            id: '123',
            ...(capturedRequest as Record<string, unknown>),
            createdAt: new Date().toISOString(),
          },
          { status: 201 },
        );
      }),
    );

    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Fill in the form
    await user.type(screen.getByLabelText(/amount/i), '150.50');
    await user.type(screen.getByLabelText(/date/i), '2025-08-15');
    await user.selectOptions(screen.getByLabelText(/category/i), 'general');
    await user.click(screen.getByLabelText(/expense/i));
    await user.type(screen.getByLabelText(/note/i), 'Monthly subscription');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    // Wait for the API call to complete
    await waitFor(() => {
      expect(capturedRequest).toEqual(
        expect.objectContaining({
          amount: '150.5',
          date: '2025-08-15',
          category: 'general',
          type: 'expense',
          note: 'Monthly subscription',
        }),
      );
    });

    // Verify onSubmit was called with the response data
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '123',
        amount: '150.5',
        date: '2025-08-15',
        category: 'general',
        type: 'expense',
        note: 'Monthly subscription',
        createdAt: expect.any(String),
      }),
    );
  });

  test('displays loading state during form submission', async () => {
    const user = userEvent.setup();

    // Mock a slow API response
    server.use(
      http.post('/api/transactions', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({ id: '123' }, { status: 201 });
      }),
    );

    render(<AddTransactionForm onSubmit={jest.fn()} />);

    // Fill in required fields
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/date/i), '2025-08-15');
    await user.selectOptions(screen.getByLabelText(/category/i), 'general');
    await user.click(screen.getByLabelText(/income/i));

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    // Check for loading state
    expect(screen.getByRole('button', { name: /adding.../i })).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });
  });

  test('displays error message when API call fails', async () => {
    const user = userEvent.setup();

    // Mock an API error
    server.use(
      http.post('/api/transactions', () => {
        return HttpResponse.json({ error: 'Failed to save transaction' }, { status: 500 });
      }),
    );

    render(<AddTransactionForm onSubmit={jest.fn()} />);

    // Fill in the form
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/date/i), '2025-08-15');
    await user.selectOptions(screen.getByLabelText(/category/i), 'general');
    await user.click(screen.getByLabelText(/income/i));

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to save transaction');
    });

    // Form should still be enabled for retry
    expect(submitButton).not.toBeDisabled();
  });

  test('resets form after successful submission', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/transactions', () => {
        return HttpResponse.json({ id: '123' }, { status: 201 });
      }),
    );

    render(<AddTransactionForm onSubmit={jest.fn()} />);

    // Fill in the form
    const amountInput = screen.getByLabelText(/amount/i);
    const dateInput = screen.getByLabelText(/date/i);
    const categorySelect = screen.getByLabelText(/category/i);
    const noteInput = screen.getByLabelText(/note/i);

    await user.type(amountInput, '100');
    await user.type(dateInput, '2025-08-15');
    await user.selectOptions(categorySelect, 'general');
    await user.click(screen.getByLabelText(/income/i));
    await user.type(noteInput, 'Test note');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /add transaction/i }));

    // Wait for submission to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add transaction/i })).not.toBeDisabled();
    });

    // Check that form fields are reset
    expect(amountInput).toHaveValue(null);
    expect(dateInput).toHaveValue('');
    expect(categorySelect).toHaveValue('');
    expect(noteInput).toHaveValue('');
    expect(screen.getByLabelText(/income/i)).not.toBeChecked();
    expect(screen.getByLabelText(/expense/i)).not.toBeChecked();
  });

  test('handles network errors gracefully', async () => {
    const user = userEvent.setup();

    // Mock a network error
    server.use(
      http.post('/api/transactions', () => {
        return HttpResponse.error();
      }),
    );

    render(<AddTransactionForm onSubmit={jest.fn()} />);

    // Fill in the form
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/date/i), '2025-08-15');
    await user.selectOptions(screen.getByLabelText(/category/i), 'general');
    await user.click(screen.getByLabelText(/income/i));

    // Submit the form
    await user.click(screen.getByRole('button', { name: /add transaction/i }));

    // Check for error message
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch');
    });
  });

  test('prevents multiple simultaneous submissions', async () => {
    const user = userEvent.setup();
    let requestCount = 0;

    server.use(
      http.post('/api/transactions', async () => {
        requestCount++;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({ id: '123' }, { status: 201 });
      }),
    );

    render(<AddTransactionForm onSubmit={jest.fn()} />);

    // Fill in the form
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/date/i), '2025-08-15');
    await user.selectOptions(screen.getByLabelText(/category/i), 'general');
    await user.click(screen.getByLabelText(/income/i));

    const submitButton = screen.getByRole('button', { name: /add transaction/i });

    // Try to click submit multiple times quickly
    await user.click(submitButton);
    await user.click(submitButton);
    await user.click(submitButton);

    // Wait for the request to complete
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    // Should only have made one request
    expect(requestCount).toBe(1);
  });

  test('displays success message after successful submission', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/transactions', () => {
        return HttpResponse.json({ id: '123' }, { status: 201 });
      }),
    );

    render(<AddTransactionForm onSubmit={jest.fn()} />);

    // Fill in the form
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/date/i), '2025-08-15');
    await user.selectOptions(screen.getByLabelText(/category/i), 'general');
    await user.click(screen.getByLabelText(/income/i));

    // Submit the form
    await user.click(screen.getByRole('button', { name: /add transaction/i }));

    // Check for success message
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
});
