import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DebtsIOweList } from '../DebtsIOweList';
import { DebtsIOweServiceImpl } from '../../services/debts-i-owe-service';
import { DebtsIOweItem } from '../../services/debts-i-owe-service';

// Mock the service
jest.mock('../../services/debts-i-owe-service');

// Mock the dialog components
jest.mock('../SettleUpDialog', () => ({
  SettleUpDialog: ({
    open,
    onOpenChange,
    onComplete,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete: () => void;
  }) => (
    <div data-testid="settle-dialog">
      {open && (
        <>
          <div>Mock Settle Dialog</div>
          <button onClick={() => onComplete()}>Complete</button>
          <button onClick={() => onOpenChange(false)}>Close</button>
        </>
      )}
    </div>
  ),
}));

jest.mock('../DebtsIOweCard', () => ({
  DebtsIOweCard: ({ debt, onSettleClick }: { debt: DebtsIOweItem; onSettleClick: () => void }) => (
    <div data-testid={`debt-card-${debt.personId}`}>
      <div>{debt.personName}</div>
      <div>{debt.outstandingMinor}</div>
      <button onClick={onSettleClick}>Settle Up</button>
    </div>
  ),
}));

describe('DebtsIOweList', () => {
  const mockUserId = 'user123';
  const mockService = DebtsIOweServiceImpl as jest.MockedClass<typeof DebtsIOweServiceImpl>;

  const mockDebts: DebtsIOweItem[] = [
    {
      personId: 'person1',
      personName: 'Alice Smith',
      currency: 'USD',
      outstandingMinor: 5000,
      totalOwedMinor: 8000,
      totalPaidMinor: 3000,
      lastActivityAt: new Date('2024-01-15'),
      debtShareIds: ['share1', 'share2'],
    },
    {
      personId: 'person2',
      personName: 'Bob Jones',
      currency: 'USD',
      outstandingMinor: 3000,
      totalOwedMinor: 3000,
      totalPaidMinor: 0,
      lastActivityAt: new Date('2024-01-10'),
      debtShareIds: ['share3'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock implementation
    mockService.prototype.list = jest.fn().mockResolvedValue(mockDebts);
  });

  it('shows loading skeleton initially', async () => {
    render(<DebtsIOweList userId={mockUserId} />);

    // Should show skeleton
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no debts', async () => {
    mockService.prototype.list = jest.fn().mockResolvedValue([]);

    render(<DebtsIOweList userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/You're all settled up/)).toBeInTheDocument();
      expect(screen.getByText(/No outstanding debts/)).toBeInTheDocument();
    });
  });

  it('shows error state when loading fails', async () => {
    const errorMessage = 'Failed to load debts';
    mockService.prototype.list = jest.fn().mockRejectedValue(new Error(errorMessage));

    render(<DebtsIOweList userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('retries loading when retry button clicked', async () => {
    mockService.prototype.list = jest
      .fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce(mockDebts);

    render(<DebtsIOweList userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getAllByText('Alice Smith')[0]).toBeInTheDocument();
    });
  });

  it('renders debt list with summary', async () => {
    render(<DebtsIOweList userId={mockUserId} />);

    await waitFor(() => {
      // Check summary card
      expect(screen.getByText('Total Outstanding')).toBeInTheDocument();
      expect(screen.getAllByText('$80.00')[0]).toBeInTheDocument(); // 5000 + 3000 = 8000 minor units

      // Check individual debts are rendered (mobile view by default in tests)
      expect(screen.getByTestId('debt-card-person1')).toBeInTheDocument();
      expect(screen.getByTestId('debt-card-person2')).toBeInTheDocument();
    });
  });

  it('shows desktop table view on larger screens', async () => {
    // Mock window.matchMedia for desktop view
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query === '(min-width: 768px)',
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(<DebtsIOweList userId={mockUserId} />);

    await waitFor(() => {
      // Should render table headers
      expect(screen.getByText('Person')).toBeInTheDocument();
      expect(screen.getByText('Total Owed')).toBeInTheDocument();
      expect(screen.getByText('Paid')).toBeInTheDocument();
      expect(screen.getByText('Outstanding')).toBeInTheDocument();
      expect(screen.getByText('Last Activity')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  it('opens settle dialog when settle button clicked', async () => {
    render(<DebtsIOweList userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByTestId('debt-card-person1')).toBeInTheDocument();
    });

    // Click settle button on first debt
    const settleButtons = screen.getAllByText('Settle Up');
    fireEvent.click(settleButtons[0]);

    // Check dialog opened
    expect(screen.getByText('Mock Settle Dialog')).toBeInTheDocument();
  });

  it('refreshes list when settlement completes', async () => {
    const onSettleComplete = jest.fn();
    render(<DebtsIOweList userId={mockUserId} onSettleComplete={onSettleComplete} />);

    await waitFor(() => {
      expect(screen.getByTestId('debt-card-person1')).toBeInTheDocument();
    });

    // Open dialog
    const settleButtons = screen.getAllByText('Settle Up');
    fireEvent.click(settleButtons[0]);

    // Complete settlement
    fireEvent.click(screen.getByText('Complete'));

    await waitFor(() => {
      // Should close dialog
      expect(screen.queryByText('Mock Settle Dialog')).not.toBeInTheDocument();
      // Should call the callback
      expect(onSettleComplete).toHaveBeenCalled();
      // Should reload the list
      expect(mockService.prototype.list).toHaveBeenCalledTimes(2);
    });
  });

  it('applies filters when provided', async () => {
    const filters = {
      personId: 'person1',
      currency: 'USD',
      minOutstandingMinor: 1000,
    };

    render(<DebtsIOweList userId={mockUserId} filters={filters} />);

    await waitFor(() => {
      expect(mockService.prototype.list).toHaveBeenCalledWith(mockUserId, filters);
    });
  });

  it('handles multiple currencies in summary', async () => {
    const multiCurrencyDebts: DebtsIOweItem[] = [
      ...mockDebts,
      {
        personId: 'person3',
        personName: 'Charlie Brown',
        currency: 'EUR',
        outstandingMinor: 2000,
        totalOwedMinor: 2000,
        totalPaidMinor: 0,
        lastActivityAt: new Date('2024-01-20'),
        debtShareIds: ['share4'],
      },
    ];

    mockService.prototype.list = jest.fn().mockResolvedValue(multiCurrencyDebts);

    render(<DebtsIOweList userId={mockUserId} />);

    await waitFor(() => {
      // Should show both currency totals
      expect(screen.getByText('USD')).toBeInTheDocument();
      expect(screen.getByText('EUR')).toBeInTheDocument();
      expect(screen.getAllByText('$80.00')[0]).toBeInTheDocument();
      expect(screen.getAllByText('€20.00')[0]).toBeInTheDocument();
    });
  });

  it('disables settle button for fully paid debts', async () => {
    const debtsWithPaid: DebtsIOweItem[] = [
      {
        personId: 'person1',
        personName: 'Alice Smith',
        currency: 'USD',
        outstandingMinor: 0,
        totalOwedMinor: 5000,
        totalPaidMinor: 5000,
        lastActivityAt: new Date('2024-01-15'),
        debtShareIds: ['share1'],
      },
    ];

    mockService.prototype.list = jest.fn().mockResolvedValue(debtsWithPaid);

    render(<DebtsIOweList userId={mockUserId} />);

    await waitFor(() => {
      // Get the settle button from the table (desktop view)
      const settleButtons = screen.getAllByRole('button', { name: /settle/i });
      const tableSettleButton = settleButtons.find((btn) => btn.closest('table'));
      expect(tableSettleButton).toBeDisabled();
    });
  });

  it('formats dates correctly', async () => {
    render(<DebtsIOweList userId={mockUserId} />);

    await waitFor(() => {
      // Check date formatting (will depend on locale)
      expect(screen.getByText(/1\/15\/2024|15\/1\/2024/)).toBeInTheDocument();
    });
  });
});
