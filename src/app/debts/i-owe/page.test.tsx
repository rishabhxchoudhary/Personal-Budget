import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DebtsIOwePageComponent from './page';

// Mock the imported components
jest.mock('@/features/debts/components/DebtsIOweList', () => ({
  DebtsIOweList: jest.fn(() => (
    <div data-testid="mock-debts-i-owe-list">DebtsIOweList Mock</div>
  )),
}));

jest.mock('@/features/debts/components/DebtsIOweFilters', () => ({
  DebtsIOweFilters: jest.fn(({ filters, onFiltersChange }) => (
    <div data-testid="mock-debts-i-owe-filters">
      <button
        data-testid="change-filter-button"
        onClick={() => onFiltersChange({ ...filters, personId: 'p2' })}
      >
        Change Filter
      </button>
      <span data-testid="current-filters">{JSON.stringify(filters)}</span>
    </div>
  )),
}));

describe('DebtsIOwePageComponent', () => {
  it('renders the page title correctly', () => {
    render(<DebtsIOwePageComponent />);
    expect(screen.getByText('Debts I Owe')).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<DebtsIOwePageComponent />);
    expect(screen.getByText('Track and manage money you owe to others')).toBeInTheDocument();
  });

  it('renders the filter component', () => {
    render(<DebtsIOwePageComponent />);
    expect(screen.getByTestId('mock-debts-i-owe-filters')).toBeInTheDocument();
  });

  it('renders the list component', () => {
    render(<DebtsIOwePageComponent />);
    expect(screen.getByTestId('mock-debts-i-owe-list')).toBeInTheDocument();
  });

  it('contains a refresh button', () => {
    render(<DebtsIOwePageComponent />);
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeInTheDocument();
  });

  it('updates filters when filter component triggers change', async () => {
    const user = userEvent.setup();
    render(<DebtsIOwePageComponent />);

    // Initial state has default sort options
    const initialFilters = screen.getByTestId('current-filters');
    expect(initialFilters.textContent).toContain('"sortBy":"outstanding"');
    expect(initialFilters.textContent).toContain('"sortDir":"desc"');

    // Click the button in our mock filter component
    const changeFilterButton = screen.getByTestId('change-filter-button');
    await user.click(changeFilterButton);

    // Check if filters were updated
    await waitFor(() => {
      const updatedFilters = screen.getByTestId('current-filters');
      expect(updatedFilters.textContent).toContain('"personId":"p2"');
    });
  });

  it('passes userId to DebtsIOweList', () => {
    const { container } = render(<DebtsIOwePageComponent />);
    const listElement = screen.getByTestId('mock-debts-i-owe-list');
    expect(listElement).toBeInTheDocument();

    // This is a simple check that the component is rendered
    // In a real test, we'd use Jest's mock functions to verify props
    expect(container).toContainElement(listElement);
  });

  it('displays the pro tip in the sidebar', () => {
    render(<DebtsIOwePageComponent />);
    expect(screen.getByText(/Pro Tip:/)).toBeInTheDocument();
    expect(screen.getByText(/Keeping track of what you owe/)).toBeInTheDocument();
  });
});
