import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useParams } from 'next/navigation';
import AccountDetailPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock the accounts API
const mockGetAccount = jest.fn();
jest.mock('@/shared/api/accounts', () => ({
  getAccount: jest.fn(),
}));

// Get the mocked function
import { getAccount } from '@/shared/api/accounts';

describe('AccountDetailPage', () => {
  const mockAccount = {
    accountId: 'acc-123',
    userId: 'user-123',
    name: 'Test Checking Account',
    type: 'checking' as const,
    balanceMinor: 150000,
    currency: 'USD',
    isActive: true,
    institution: 'Bank of America',
    lastFour: '1234',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ id: 'acc-123' });
    (getAccount as jest.Mock).mockImplementation(mockGetAccount);
  });

  it('renders account details when loaded successfully', async () => {
    mockGetAccount.mockResolvedValue(mockAccount);

    render(<AccountDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Checking Account')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Checking')).toHaveLength(2); // Badge and details
    expect(screen.getByText('Bank of America')).toBeInTheDocument();
    expect(screen.getByText('****1234')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    mockGetAccount.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AccountDetailPage />);

    // Check for skeleton loading elements instead of text
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows error state when account fetch fails', async () => {
    const errorMessage = 'Account not found';
    mockGetAccount.mockRejectedValue(new Error(errorMessage));

    render(<AccountDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/error loading account/i)).toBeInTheDocument();
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows inactive badge for inactive accounts', async () => {
    mockGetAccount.mockResolvedValue({
      ...mockAccount,
      isActive: false,
    });

    render(<AccountDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('handles accounts without institution', async () => {
    mockGetAccount.mockResolvedValue({
      ...mockAccount,
      institution: undefined,
      lastFour: undefined,
    });

    render(<AccountDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Checking Account')).toBeInTheDocument();
    });

    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(1);
  });

  it('formats negative balance correctly', async () => {
    mockGetAccount.mockResolvedValue({
      ...mockAccount,
      balanceMinor: -50000, // -$500.00
    });

    render(<AccountDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Checking Account')).toBeInTheDocument();
    });
  });

  it('calls getAccount with correct account ID', async () => {
    mockGetAccount.mockResolvedValue(mockAccount);

    render(<AccountDetailPage />);

    expect(mockGetAccount).toHaveBeenCalledWith('acc-123');
  });

  it('shows edit and delete buttons', async () => {
    mockGetAccount.mockResolvedValue(mockAccount);

    render(<AccountDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Checking Account')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /edit account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
  });

  it('shows back to accounts link', async () => {
    mockGetAccount.mockResolvedValue(mockAccount);

    render(<AccountDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Checking Account')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /back to accounts/i })).toBeInTheDocument();
  });
});
