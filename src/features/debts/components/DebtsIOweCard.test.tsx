import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebtsIOweCard } from './DebtsIOweCard';
import { formatCurrency } from '@/shared/utils/money';
import { DebtsIOweItem } from '../services/debts-i-owe-service';

// Mock formatCurrency to return predictable values for tests
jest.mock('@/shared/utils/money', () => ({
  formatCurrency: jest.fn((amount, currency) => `${currency} ${amount / 100}`),
}));

describe('DebtsIOweCard', () => {
  const mockDebt: DebtsIOweItem = {
    personId: 'person123',
    personName: 'John Doe',
    currency: 'USD',
    outstandingMinor: 5000, // $50.00
    totalOwedMinor: 10000, // $100.00
    totalPaidMinor: 5000, // $50.00
    lastActivityAt: new Date('2023-04-15'),
    debtShareIds: ['share1', 'share2'],
  };

  const mockSettledDebt: DebtsIOweItem = {
    ...mockDebt,
    outstandingMinor: 0,
    totalPaidMinor: 10000, // $100.00
  };

  const mockOnSettleClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the person name correctly', () => {
    render(<DebtsIOweCard debt={mockDebt} onSettleClick={mockOnSettleClick} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays the correct outstanding amount', () => {
    render(<DebtsIOweCard debt={mockDebt} onSettleClick={mockOnSettleClick} />);

    // Based on our mock implementation
    expect(screen.getByText('USD 50')).toBeInTheDocument();
    expect(formatCurrency).toHaveBeenCalledWith(5000, 'USD');
  });

  it('shows the number of debts in the badge', () => {
    render(<DebtsIOweCard debt={mockDebt} onSettleClick={mockOnSettleClick} />);
    expect(screen.getByText('2 debts')).toBeInTheDocument();
  });

  it('shows singular "debt" text when there is only one debt', () => {
    const singleDebt = { ...mockDebt, debtShareIds: ['share1'] };
    render(<DebtsIOweCard debt={singleDebt} onSettleClick={mockOnSettleClick} />);
    expect(screen.getByText('1 debt')).toBeInTheDocument();
  });

  it('displays the progress bar for partially paid debts', () => {
    render(<DebtsIOweCard debt={mockDebt} onSettleClick={mockOnSettleClick} />);

    // Check percentage text
    expect(screen.getByText('50%')).toBeInTheDocument();

    // Check progress bar exists and is rendered correctly
    const progressBarContainer = document.querySelector('.bg-secondary');
    expect(progressBarContainer).toBeInTheDocument();

    const progressBar = document.querySelector('.bg-primary');
    expect(progressBar).toBeInTheDocument();

    // We'll check that a progress bar exists without checking exact styling
    // This makes the test more resilient to implementation changes
  });

  it('does not display progress bar when nothing has been paid', () => {
    const unpaidDebt = { ...mockDebt, totalPaidMinor: 0 };
    render(<DebtsIOweCard debt={unpaidDebt} onSettleClick={mockOnSettleClick} />);

    // No percentage should be shown
    expect(screen.queryByText('0%')).not.toBeInTheDocument();

    // No progress bar container should be shown
    expect(screen.queryByText(/Paid:/)).not.toBeInTheDocument();
  });

  it('displays the last activity date correctly', () => {
    render(<DebtsIOweCard debt={mockDebt} onSettleClick={mockOnSettleClick} />);

    // This test assumes the locale is consistent
    // In a real app, you might need to mock Date.prototype.toLocaleDateString
    const dateText = new Date('2023-04-15').toLocaleDateString();
    expect(screen.getByText(dateText)).toBeInTheDocument();
  });

  it('calls onSettleClick when Settle Up button is clicked', async () => {
    const user = userEvent.setup();
    render(<DebtsIOweCard debt={mockDebt} onSettleClick={mockOnSettleClick} />);

    const settleButton = screen.getByRole('button', { name: /settle up/i });
    await user.click(settleButton);

    expect(mockOnSettleClick).toHaveBeenCalledTimes(1);
  });

  it('disables the Settle Up button when outstanding amount is zero', () => {
    render(<DebtsIOweCard debt={mockSettledDebt} onSettleClick={mockOnSettleClick} />);

    const settleButton = screen.getByRole('button', { name: /fully settled/i });
    expect(settleButton).toBeDisabled();
  });

  it('changes button text to "Fully Settled" when outstanding amount is zero', () => {
    render(<DebtsIOweCard debt={mockSettledDebt} onSettleClick={mockOnSettleClick} />);

    expect(screen.getByRole('button', { name: /fully settled/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /settle up/i })).not.toBeInTheDocument();
  });
});
