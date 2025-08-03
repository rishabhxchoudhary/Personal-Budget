import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DebtsIOweCard } from '../DebtsIOweCard';
import { DebtsIOweItem } from '../../services/debts-i-owe-service';

describe('DebtsIOweCard', () => {
  const mockOnSettleClick = jest.fn();

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
    debt: mockDebt,
    onSettleClick: mockOnSettleClick,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders person name with icon', () => {
    render(<DebtsIOweCard {...defaultProps} />);

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    // Check for user icon by looking at the svg element
    const header = screen.getByText('Alice Smith').parentElement;
    expect(header?.querySelector('svg')).toBeInTheDocument();
  });

  it('displays outstanding amount prominently', () => {
    render(<DebtsIOweCard {...defaultProps} />);

    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });

  it('shows debt count badge', () => {
    render(<DebtsIOweCard {...defaultProps} />);

    expect(screen.getByText('2 debts')).toBeInTheDocument();
  });

  it('shows singular debt text for single debt', () => {
    const singleDebt = {
      ...mockDebt,
      debtShareIds: ['share1'],
    };

    render(<DebtsIOweCard debt={singleDebt} onSettleClick={mockOnSettleClick} />);

    expect(screen.getByText('1 debt')).toBeInTheDocument();
  });

  it('displays progress bar with correct percentage', () => {
    render(<DebtsIOweCard {...defaultProps} />);

    // 3000 paid out of 8000 total = 37.5% ≈ 38%
    expect(screen.getByText('38%')).toBeInTheDocument();
    expect(screen.getByText('Paid: $30.00')).toBeInTheDocument();
  });

  it('does not show progress bar when nothing paid', () => {
    const unpaidDebt = {
      ...mockDebt,
      totalPaidMinor: 0,
    };

    render(<DebtsIOweCard debt={unpaidDebt} onSettleClick={mockOnSettleClick} />);

    expect(screen.queryByText(/Paid:/)).not.toBeInTheDocument();
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  it('shows total owed amount', () => {
    render(<DebtsIOweCard {...defaultProps} />);

    expect(screen.getByText('Total Owed')).toBeInTheDocument();
    expect(screen.getByText('$80.00')).toBeInTheDocument();
  });

  it('displays last activity date', () => {
    render(<DebtsIOweCard {...defaultProps} />);

    expect(screen.getByText('Last Activity')).toBeInTheDocument();
    // Date format depends on locale, so check for presence of date parts
    expect(screen.getByText(/1\/15\/2024|15\/1\/2024/)).toBeInTheDocument();
  });

  it('shows calendar icon next to date', () => {
    render(<DebtsIOweCard {...defaultProps} />);

    const dateElement = screen.getByText(/1\/15\/2024|15\/1\/2024/);
    const dateContainer = dateElement.parentElement;
    expect(dateContainer?.querySelector('svg')).toBeInTheDocument();
  });

  it('handles settle button click', () => {
    render(<DebtsIOweCard {...defaultProps} />);

    const settleButton = screen.getByRole('button', { name: 'Settle Up' });
    fireEvent.click(settleButton);

    expect(mockOnSettleClick).toHaveBeenCalledTimes(1);
  });

  it('shows disabled button for fully settled debt', () => {
    const settledDebt = {
      ...mockDebt,
      outstandingMinor: 0,
      totalPaidMinor: 8000,
    };

    render(<DebtsIOweCard debt={settledDebt} onSettleClick={mockOnSettleClick} />);

    const button = screen.getByRole('button', { name: 'Fully Settled' });
    expect(button).toBeDisabled();
  });

  it('handles different currencies', () => {
    const euroDebt = {
      ...mockDebt,
      currency: 'EUR',
      outstandingMinor: 4500,
      totalOwedMinor: 6000,
      totalPaidMinor: 1500,
    };

    render(<DebtsIOweCard debt={euroDebt} onSettleClick={mockOnSettleClick} />);

    expect(screen.getByText('€45.00')).toBeInTheDocument();
    expect(screen.getByText('€60.00')).toBeInTheDocument();
    expect(screen.getByText('Paid: €15.00')).toBeInTheDocument();
  });

  it('applies correct badge variant based on outstanding status', () => {
    const { rerender } = render(<DebtsIOweCard {...defaultProps} />);

    // With outstanding debt - should use default variant
    let badge = screen.getByText('2 debts');
    expect(badge.className).toContain('bg-primary');

    // Fully settled - should use secondary variant
    const settledDebt = {
      ...mockDebt,
      outstandingMinor: 0,
    };
    rerender(<DebtsIOweCard debt={settledDebt} onSettleClick={mockOnSettleClick} />);

    badge = screen.getByText('2 debts');
    expect(badge.className).toContain('bg-secondary');
  });

  it('calculates progress bar width correctly', () => {
    render(<DebtsIOweCard {...defaultProps} />);

    // Find the progress bar element
    const progressBar = screen.getByText('38%').closest('.space-y-2')?.querySelector('.bg-primary');

    expect(progressBar).toHaveStyle({ width: '38%' });
  });

  it('handles edge case of 100% paid but not settled', () => {
    const almostSettled = {
      ...mockDebt,
      totalOwedMinor: 5000,
      totalPaidMinor: 5000,
      outstandingMinor: 1, // Rounding issue
    };

    render(<DebtsIOweCard debt={almostSettled} onSettleClick={mockOnSettleClick} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settle Up' })).toBeEnabled();
  });

  it('handles zero total owed gracefully', () => {
    const zeroDebt = {
      ...mockDebt,
      totalOwedMinor: 0,
      totalPaidMinor: 0,
      outstandingMinor: 0,
    };

    render(<DebtsIOweCard debt={zeroDebt} onSettleClick={mockOnSettleClick} />);

    // Should show 0% or not show progress at all
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
  });

  it('renders within a Card component', () => {
    const { container } = render(<DebtsIOweCard {...defaultProps} />);

    const card = container.firstChild;
    expect(card).toHaveClass('overflow-hidden');
  });

  it('displays all information in a mobile-friendly layout', () => {
    render(<DebtsIOweCard {...defaultProps} />);

    // Check for grid layout
    const detailsGrid = screen.getByText('Total Owed').closest('.grid');
    expect(detailsGrid).toHaveClass('grid-cols-2');
  });

  it('shows full-width settle button', () => {
    render(<DebtsIOweCard {...defaultProps} />);

    const button = screen.getByRole('button', { name: 'Settle Up' });
    expect(button).toHaveClass('w-full');
  });
});
