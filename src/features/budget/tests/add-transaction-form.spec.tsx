import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
// 🚨 This import should fail initially (good: RED first)
import { AddTransactionForm } from '@/features/budget/components/add-transaction-form';

describe('AddTransactionForm (UI skeleton)', () => {
  test('renders fields with accessible labels and disabled submit by default', async () => {
    render(<AddTransactionForm onSubmit={jest.fn()} />);

    const amount = screen.getByLabelText(/amount/i);
    const date = screen.getByLabelText(/date/i);
    const category = screen.getByLabelText(/category/i);
    const income = screen.getByLabelText(/income/i);
    const expense = screen.getByLabelText(/expense/i);
    const note = screen.getByLabelText(/note/i);
    const submit = screen.getByRole('button', { name: /add transaction/i });

    expect(amount).toBeInTheDocument();
    expect(date).toBeInTheDocument();
    expect(category).toBeInTheDocument();
    expect(income).toBeInTheDocument();
    expect(expense).toBeInTheDocument();
    expect(note).toBeInTheDocument();
    expect(submit).toHaveAttribute('aria-disabled', 'true');
  });

  test('keyboard tab order is logical and labels are associated', async () => {
    const user = userEvent.setup();
    render(<AddTransactionForm onSubmit={jest.fn()} />);

    await user.tab();
    expect(screen.getByLabelText(/amount/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/date/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/category/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/income/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/expense/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/note/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: /add transaction/i })).toHaveFocus();
  });

  test('does not invoke onSubmit when required fields are missing', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    const form = screen.getByTestId('add-transaction-form');
    // Press Enter to attempt submit (button should be disabled anyway)
    await user.type(form, '{enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('enables submit button when all required fields are filled', async () => {
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Fill in fields
    await userEvent.type(screen.getByLabelText(/amount/i), '100');
    await userEvent.type(screen.getByLabelText(/date/i), '2025-08-01');
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'general');
    await userEvent.click(screen.getByLabelText(/income/i));

    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    expect(submitButton).not.toHaveAttribute('aria-disabled', 'true');
    expect(submitButton).toBeEnabled();
  });

  test('calls onSubmit when form is valid', async () => {
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    // Fill in fields
    await userEvent.type(screen.getByLabelText(/amount/i), '100');
    await userEvent.type(screen.getByLabelText(/date/i), '2025-08-01');
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'general');
    await userEvent.click(screen.getByLabelText(/income/i));

    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await userEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith({
      amount: '100',
      date: '2025-08-01',
      category: 'general',
      type: 'income',
      note: '', // Default blank for now
    });
  });

  test('does not invoke onSubmit when required fields are missing', async () => {
    const onSubmit = jest.fn();
    render(<AddTransactionForm onSubmit={onSubmit} />);

    const submitButton = screen.getByRole('button', { name: /add transaction/i });
    await userEvent.click(submitButton);

    expect(onSubmit).not.toHaveBeenCalled();
  });
  
});
