import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SettleUpDialog } from '../SettleUpDialog';
import { DebtsIOweServiceImpl } from '../../services/debts-i-owe-service';
import { DebtsIOweItem } from '../../services/debts-i-owe-service';

// Mock the service
jest.mock('../../services/debts-i-owe-service');

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} role="alert">
      {children}
    </div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('SettleUpDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnComplete = jest.fn();
  const mockService = DebtsIOweServiceImpl as jest.MockedClass<typeof DebtsIOweServiceImpl>;

  const mockDebt: DebtsIOweItem = {
    personId: 'person1',
    personName: 'Alice Smith',
    currency: 'USD',
    outstandingMinor: 5000,
    totalOwedMinor: 8000,
    totalPaidMinor: 3000,
    lastActivityAt: new Date('2024-01-15'),
    debtShareIds: ['share1', 'share2'],
  };

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    userId: 'user123',
    debt: mockDebt,
    onComplete: mockOnComplete,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockService.prototype.settleUp = jest.fn().mockResolvedValue([
      {
        paymentId: 'payment1',
        debtShareId: 'share1',
        payerId: 'user123',
        payeeId: 'person1',
        amountMinor: 3000,
        paymentDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  it('renders dialog when open', () => {
    render(<SettleUpDialog {...defaultProps} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Settle Up with Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Outstanding: $50.00')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<SettleUpDialog {...defaultProps} open={false} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('shows amount input with currency symbol', () => {
    render(<SettleUpDialog {...defaultProps} />);

    const input = screen.getByLabelText('Payment Amount');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', '0.00');

    // Check for currency symbol
    const inputContainer = input.parentElement;
    expect(inputContainer).toHaveTextContent('$');
  });

  it('handles amount input changes', async () => {
    const user = userEvent.setup();
    render(<SettleUpDialog {...defaultProps} />);

    const input = screen.getByLabelText('Payment Amount');
    await user.type(input, '25.50');

    expect(input).toHaveValue('25.50');
  });

  it('validates amount input', async () => {
    const user = userEvent.setup();
    render(<SettleUpDialog {...defaultProps} />);

    const input = screen.getByLabelText('Payment Amount');

    // Test amount too high
    await user.type(input, '100.00');

    expect(screen.getByText(/Amount must be between/)).toBeInTheDocument();
    expect(screen.getByText(/\$0.01 and \$50.00/)).toBeInTheDocument();
  });

  it('prevents invalid characters in amount input', async () => {
    const user = userEvent.setup();
    render(<SettleUpDialog {...defaultProps} />);

    const input = screen.getByLabelText('Payment Amount');
    await user.type(input, 'abc123.45xyz');

    // Should only accept valid decimal format
    expect(input).toHaveValue('123.45');
  });

  it('handles 50% quick button', async () => {
    const user = userEvent.setup();
    render(<SettleUpDialog {...defaultProps} />);

    const halfButton = screen.getByText('50%');
    await user.click(halfButton);

    const input = screen.getByLabelText('Payment Amount');
    expect(input).toHaveValue('25.00');
  });

  it('handles full amount quick button', async () => {
    const user = userEvent.setup();
    render(<SettleUpDialog {...defaultProps} />);

    const fullButton = screen.getByText('Full Amount');
    await user.click(fullButton);

    const input = screen.getByLabelText('Payment Amount');
    expect(input).toHaveValue('50.00');
  });

  it('shows allocation preview for valid amounts', async () => {
    const user = userEvent.setup();
    render(<SettleUpDialog {...defaultProps} />);

    const input = screen.getByLabelText('Payment Amount');
    await user.type(input, '30.00');

    await waitFor(() => {
      expect(screen.getByText('Payment Allocation (FIFO)')).toBeInTheDocument();
      expect(screen.getByText('Total Payment')).toBeInTheDocument();
      expect(screen.getByText('$30.00')).toBeInTheDocument();
    });
  });

  it('hides allocation preview for invalid amounts', async () => {
    const user = userEvent.setup();
    render(<SettleUpDialog {...defaultProps} />);

    const input = screen.getByLabelText('Payment Amount');
    await user.type(input, '0');

    expect(screen.queryByText('Payment Allocation (FIFO)')).not.toBeInTheDocument();
  });

  it('handles successful payment submission', async () => {
    const user = userEvent.setup();
    render(<SettleUpDialog {...defaultProps} />);

    const input = screen.getByLabelText('Payment Amount');
    await user.type(input, '30.00');

    const confirmButton = screen.getByText('Confirm Payment');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockService.prototype.settleUp).toHaveBeenCalledWith(
        'user123',
        'person1',
        3000,
        'Settlement payment to Alice Smith',
      );
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Payment recorded successfully!')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    // Should call onComplete after delay
    await waitFor(
      () => {
        expect(mockOnComplete).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );
  });

  it('handles payment submission error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Insufficient funds';
    mockService.prototype.settleUp = jest.fn().mockRejectedValue(new Error(errorMessage));

    render(<SettleUpDialog {...defaultProps} />);

    const input = screen.getByLabelText('Payment Amount');
    await user.type(input, '30.00');

    const confirmButton = screen.getByText('Confirm Payment');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Should not call onComplete on error
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();

    // Mock a delayed response
    mockService.prototype.settleUp = jest
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<SettleUpDialog {...defaultProps} />);

    const input = screen.getByLabelText('Payment Amount');
    await user.type(input, '30.00');

    const confirmButton = screen.getByText('Confirm Payment');
    await user.click(confirmButton);

    // Should show loading state
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();
    expect(input).toBeDisabled();
  });

  it('disables confirm button for invalid amounts', async () => {
    const user = userEvent.setup();
    render(<SettleUpDialog {...defaultProps} />);

    const confirmButton = screen.getByText('Confirm Payment');

    // Initially disabled (no amount)
    expect(confirmButton).toBeDisabled();

    // Type invalid amount
    const input = screen.getByLabelText('Payment Amount');
    await user.type(input, '0');

    expect(confirmButton).toBeDisabled();

    // Type valid amount
    await user.clear(input);
    await user.type(input, '25.00');

    expect(confirmButton).toBeEnabled();
  });

  it('handles cancel button', async () => {
    const user = userEvent.setup();
    render(<SettleUpDialog {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('prevents closing during loading', async () => {
    const user = userEvent.setup();

    mockService.prototype.settleUp = jest
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<SettleUpDialog {...defaultProps} />);

    const input = screen.getByLabelText('Payment Amount');
    await user.type(input, '30.00');

    const confirmButton = screen.getByText('Confirm Payment');
    await user.click(confirmButton);

    // Try to close during loading
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDisabled();
  });

  it('resets state when dialog reopens', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SettleUpDialog {...defaultProps} />);

    // Enter some data
    const input = screen.getByLabelText('Payment Amount');
    await user.type(input, '25.00');

    // Close and reopen
    rerender(<SettleUpDialog {...defaultProps} open={false} />);
    rerender(<SettleUpDialog {...defaultProps} open={true} />);

    // Should reset input
    const newInput = screen.getByLabelText('Payment Amount');
    expect(newInput).toHaveValue('');
  });

  it('handles non-USD currencies', () => {
    const euroDebt: DebtsIOweItem = {
      ...mockDebt,
      currency: 'EUR',
      outstandingMinor: 4500,
    };

    render(<SettleUpDialog {...defaultProps} debt={euroDebt} />);

    expect(screen.getByText('Outstanding: €45.00')).toBeInTheDocument();

    const inputContainer = screen.getByLabelText('Payment Amount').parentElement;
    expect(inputContainer).toHaveTextContent('EUR');
  });

  it('focuses input on mount', () => {
    render(<SettleUpDialog {...defaultProps} />);

    const input = screen.getByLabelText('Payment Amount');
    expect(input).toHaveFocus();
  });

  it('validates positive amounts only', async () => {
    const user = userEvent.setup();
    render(<SettleUpDialog {...defaultProps} />);

    const input = screen.getByLabelText('Payment Amount');
    const confirmButton = screen.getByText('Confirm Payment');

    // Try negative amount
    await user.type(input, '-10');
    expect(input).toHaveValue('10'); // Should strip negative sign

    // Try zero
    await user.clear(input);
    await user.type(input, '0');
    expect(confirmButton).toBeDisabled();
  });

  it('shows allocation details for multiple shares', async () => {
    const user = userEvent.setup();
    render(<SettleUpDialog {...defaultProps} />);

    const input = screen.getByLabelText('Payment Amount');
    await user.type(input, '40.00');

    await waitFor(() => {
      expect(screen.getByText('Debt #1')).toBeInTheDocument();
      expect(screen.getByText('Debt #2')).toBeInTheDocument();
    });
  });
});
