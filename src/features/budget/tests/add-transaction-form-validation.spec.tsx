import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AddTransactionForm } from '@/features/budget/components/add-transaction-form';

describe('AddTransactionForm validation', () => {
  test('displays error message for empty amount field', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Fill all fields except amount
    await user.type(screen.getByLabelText(/date/i), '2025-08-01');
    const categorySelect = screen.getByLabelText(/category/i);
    await user.selectOptions(categorySelect, 'general');
    await user.click(screen.getByLabelText(/income/i));

    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    expect(screen.getByText('Amount is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('displays error message for negative amount', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Fill all fields with negative amount
    await user.type(screen.getByLabelText(/amount/i), '-50');
    await user.type(screen.getByLabelText(/date/i), '2025-08-01');
    const categorySelect = screen.getByLabelText(/category/i);
    await user.selectOptions(categorySelect, 'general');
    await user.click(screen.getByLabelText(/income/i));

    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    expect(screen.getByText('Amount must be a positive number')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('displays error message for zero amount', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Fill all fields with zero amount
    await user.type(screen.getByLabelText(/amount/i), '0');
    await user.type(screen.getByLabelText(/date/i), '2025-08-01');
    const categorySelect = screen.getByLabelText(/category/i);
    await user.selectOptions(categorySelect, 'general');
    await user.click(screen.getByLabelText(/income/i));

    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    expect(screen.getByText('Amount must be a positive number')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('displays error message for invalid amount format', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Fill all fields with invalid amount
    await user.type(screen.getByLabelText(/amount/i), 'abc');
    await user.type(screen.getByLabelText(/date/i), '2025-08-01');
    const categorySelect = screen.getByLabelText(/category/i);
    await user.selectOptions(categorySelect, 'general');
    await user.click(screen.getByLabelText(/income/i));

    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    // Note: HTML5 number input prevents typing non-numeric characters, so the value remains empty
    expect(screen.getByText('Amount is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('displays error message for empty date field', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Fill all fields except date
    await user.type(screen.getByLabelText(/amount/i), '100');
    const categorySelect = screen.getByLabelText(/category/i);
    await user.selectOptions(categorySelect, 'general');
    await user.click(screen.getByLabelText(/income/i));

    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    expect(screen.getByText('Date is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('displays error message for invalid date format', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Fill all fields with invalid date
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/date/i), 'invalid-date');
    const categorySelect = screen.getByLabelText(/category/i);
    await user.selectOptions(categorySelect, 'general');
    await user.click(screen.getByLabelText(/income/i));

    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    // Note: HTML5 date input may not accept invalid date formats, resulting in empty value
    expect(screen.getByText('Date is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('displays error message for empty category', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Fill all fields except category
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/date/i), '2025-08-01');
    await user.click(screen.getByLabelText(/income/i));

    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    expect(screen.getByText('Please select a category')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('displays error message when type is not selected', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Fill all fields except type
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/date/i), '2025-08-01');
    await user.selectOptions(screen.getByLabelText(/category/i), 'general');

    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    expect(screen.getByText('Please select a transaction type')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('displays multiple error messages when multiple fields are invalid', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Leave all required fields empty
    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    expect(screen.getByText('Amount is required')).toBeInTheDocument();
    expect(screen.getByText('Date is required')).toBeInTheDocument();
    expect(screen.getByText('Please select a category')).toBeInTheDocument();
    expect(screen.getByText('Please select a transaction type')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('error messages are accessible with proper ARIA attributes', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    // Check amount field
    const amountInput = screen.getByLabelText(/amount/i);
    const amountError = screen.getByText('Amount is required');
    expect(amountInput).toHaveAttribute('aria-invalid', 'true');
    expect(amountInput).toHaveAttribute('aria-describedby', 'amount-error');
    expect(amountError).toHaveAttribute('role', 'alert');
    expect(amountError).toHaveAttribute('id', 'amount-error');

    // Check date field
    const dateInput = screen.getByLabelText(/date/i);
    const dateError = screen.getByText('Date is required');
    expect(dateInput).toHaveAttribute('aria-invalid', 'true');
    expect(dateInput).toHaveAttribute('aria-describedby', 'date-error');
    expect(dateError).toHaveAttribute('role', 'alert');
    expect(dateError).toHaveAttribute('id', 'date-error');
  });

  test('error messages disappear when fields are corrected', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Submit with empty fields to trigger errors
    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    // Verify errors are displayed
    expect(screen.getByText('Amount is required')).toBeInTheDocument();
    expect(screen.getByText('Date is required')).toBeInTheDocument();
    expect(screen.getByText('Please select a category')).toBeInTheDocument();
    expect(screen.getByText('Please select a transaction type')).toBeInTheDocument();

    // Fill in all fields correctly
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/date/i), '2025-08-01');
    const categorySelect = screen.getByLabelText(/category/i);
    await user.selectOptions(categorySelect, 'general');
    await user.click(screen.getByLabelText(/income/i));

    // Submit again
    await user.click(submitButton);

    // Verify errors are gone
    expect(screen.queryByText('Amount is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Date is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Please select a category')).not.toBeInTheDocument();
    expect(screen.queryByText('Please select a transaction type')).not.toBeInTheDocument();

    // Verify onSubmit was called
    expect(onSubmit).toHaveBeenCalledWith({
      amount: '100',
      date: '2025-08-01',
      category: 'general',
      type: 'income',
      note: '',
    });
  });

  test('note field is optional and does not trigger validation error', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Fill all required fields but leave note empty
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/date/i), '2025-08-01');
    const categorySelect = screen.getByLabelText(/category/i);
    await user.selectOptions(categorySelect, 'general');
    await user.click(screen.getByLabelText(/income/i));

    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    // Should not show any errors and should submit
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith({
      amount: '100',
      date: '2025-08-01',
      category: 'general',
      type: 'income',
      note: '',
    });
  });

  test('accepts decimal amounts', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Fill all fields with decimal amount
    await user.type(screen.getByLabelText(/amount/i), '99.99');
    await user.type(screen.getByLabelText(/date/i), '2025-08-01');
    const categorySelect = screen.getByLabelText(/category/i);
    await user.selectOptions(categorySelect, 'general');
    await user.click(screen.getByLabelText(/income/i));

    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith({
      amount: '99.99',
      date: '2025-08-01',
      category: 'general',
      type: 'income',
      note: '',
    });
  });
});
