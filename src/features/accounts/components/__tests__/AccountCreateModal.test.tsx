import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountCreateModal } from '../AccountCreateModal';
import { AccountType } from '@/shared/types/common';

// Mock the API call
const mockCreateAccount = jest.fn();
jest.mock('@/shared/api/accounts', () => ({
  createAccount: jest.fn(),
}));

// Get the mocked function
import { createAccount } from '@/shared/api/accounts';

describe('AccountCreateModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onAccountCreated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAccount.mockReset();
  });

  it('renders the modal when open', () => {
    render(<AccountCreateModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByLabelText(/account name/i)).toBeInTheDocument();
    expect(screen.getByText(/account type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/initial balance/i)).toBeInTheDocument();
    expect(screen.getByText(/currency/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AccountCreateModal {...defaultProps} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    render(<AccountCreateModal {...defaultProps} />);

    const createButton = screen.getByRole('button', { name: /create account/i });
    await user.click(createButton);

    expect(screen.getByText(/account name is required/i)).toBeInTheDocument();
  });

  it('shows validation error for invalid balance', async () => {
    const user = userEvent.setup();
    render(<AccountCreateModal {...defaultProps} />);

    // Provide valid name first
    const nameInput = screen.getByLabelText(/account name/i);
    await user.type(nameInput, 'Test Account');

    const balanceInput = screen.getByLabelText(/initial balance/i);
    await user.type(balanceInput, 'invalid');

    const createButton = screen.getByRole('button', { name: /create account/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/Initial balance is required/i)).toBeInTheDocument();
    });
  });

  it('creates account with valid data', async () => {
    const user = userEvent.setup();
    const mockAccount = {
      accountId: 'acc-123',
      userId: 'user-123',
      name: 'Test Account',
      type: 'checking' as AccountType,
      balanceMinor: 100000,
      currency: 'USD',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (createAccount as jest.Mock).mockResolvedValue(mockAccount);

    render(<AccountCreateModal {...defaultProps} />);

    // Fill out the form
    await user.type(screen.getByLabelText(/account name/i), 'Test Account');
    await user.type(screen.getByLabelText(/initial balance/i), '1000');

    const createButton = screen.getByRole('button', { name: /create account/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(createAccount).toHaveBeenCalledWith({
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 100000, // $1000 * 100
        currency: 'USD',
        isActive: true,
      });
    });

    expect(defaultProps.onAccountCreated).toHaveBeenCalledWith(mockAccount);
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows loading state during creation', async () => {
    const user = userEvent.setup();
    const mockAccount = {
      accountId: 'acc-123',
      userId: 'user-123',
      name: 'Test Account',
      type: 'checking' as AccountType,
      balanceMinor: 100000,
      currency: 'USD',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock a delayed response
    (createAccount as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockAccount), 100)),
    );

    render(<AccountCreateModal {...defaultProps} />);

    // Fill out the form
    await user.type(screen.getByLabelText(/account name/i), 'Test Account');
    await user.type(screen.getByLabelText(/initial balance/i), '1000');

    const createButton = screen.getByRole('button', { name: /create account/i });
    await user.click(createButton);

    expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
  });

  it('handles creation error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Account creation failed';

    (createAccount as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    render(<AccountCreateModal {...defaultProps} />);

    // Fill out the form
    await user.type(screen.getByLabelText(/account name/i), 'Test Account');
    await user.type(screen.getByLabelText(/initial balance/i), '1000');

    const createButton = screen.getByRole('button', { name: /create account/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Modal should remain open
    expect(defaultProps.onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('includes optional fields when provided', async () => {
    const user = userEvent.setup();
    const mockAccount = {
      accountId: 'acc-123',
      userId: 'user-123',
      name: 'Test Account',
      type: 'checking' as AccountType,
      balanceMinor: 100000,
      currency: 'USD',
      isActive: true,
      institution: 'Test Bank',
      lastFour: '1234',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (createAccount as jest.Mock).mockResolvedValue(mockAccount);

    render(<AccountCreateModal {...defaultProps} />);

    // Fill out the form with optional fields
    await user.type(screen.getByLabelText(/account name/i), 'Test Account');
    await user.type(screen.getByLabelText(/initial balance/i), '1000');
    await user.type(screen.getByLabelText(/institution/i), 'Test Bank');
    await user.type(screen.getByLabelText(/last four digits/i), '1234');

    const createButton = screen.getByRole('button', { name: /create account/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(createAccount).toHaveBeenCalledWith({
        name: 'Test Account',
        type: 'checking',
        balanceMinor: 100000,
        currency: 'USD',
        isActive: true,
        institution: 'Test Bank',
        lastFour: '1234',
      });
    });
  });

  it('cancels creation and closes modal', async () => {
    const user = userEvent.setup();
    render(<AccountCreateModal {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    expect(createAccount).not.toHaveBeenCalled();
  });

  it('resets form when modal is reopened', () => {
    const { rerender } = render(<AccountCreateModal {...defaultProps} open={false} />);

    // Open modal and fill form
    rerender(<AccountCreateModal {...defaultProps} open={true} />);

    const nameInput = screen.getByLabelText(/account name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Test' } });

    // Close and reopen modal
    rerender(<AccountCreateModal {...defaultProps} open={false} />);
    rerender(<AccountCreateModal {...defaultProps} open={true} />);

    expect((screen.getByLabelText(/account name/i) as HTMLInputElement).value).toBe('');
  });
});
