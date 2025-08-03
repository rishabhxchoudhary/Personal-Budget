import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DebtsIOweFilters } from '../DebtsIOweFilters';
import { DebtsIOweQuery } from '../../services/debts-i-owe-service';
import { ExternalPerson } from '@/shared/types/common';

describe('DebtsIOweFilters', () => {
  const mockOnFiltersChange = jest.fn();

  const mockPeople: ExternalPerson[] = [
    {
      personId: 'person1',
      userId: 'user1',
      name: 'Alice Smith',
      email: 'alice@example.com',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      personId: 'person2',
      userId: 'user1',
      name: 'Bob Jones',
      email: 'bob@example.com',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];

  const defaultProps = {
    filters: {},
    onFiltersChange: mockOnFiltersChange,
    people: mockPeople,
    currencies: mockCurrencies,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all filter controls', () => {
    render(<DebtsIOweFilters {...defaultProps} />);

    expect(screen.getByLabelText('Person')).toBeInTheDocument();
    expect(screen.getByLabelText('Currency')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum Outstanding')).toBeInTheDocument();
    expect(screen.getByLabelText('Include Settled Debts')).toBeInTheDocument();
    expect(screen.getByText('Sort By')).toBeInTheDocument();
  });

  it('shows filter icon in header', () => {
    render(<DebtsIOweFilters {...defaultProps} />);

    expect(screen.getByText('Filters')).toBeInTheDocument();
    // Check for filter icon by its parent element
    const header = screen.getByText('Filters').parentElement;
    expect(header?.querySelector('svg')).toBeInTheDocument();
  });

  it('handles person filter change', async () => {
    const user = userEvent.setup();
    render(<DebtsIOweFilters {...defaultProps} />);

    const personSelect = screen.getByLabelText('Person');
    await user.click(personSelect);

    // Select Alice Smith
    await user.click(screen.getByText('Alice Smith'));

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      personId: 'person1',
    });
  });

  it('handles currency filter change', async () => {
    const user = userEvent.setup();
    render(<DebtsIOweFilters {...defaultProps} />);

    const currencySelect = screen.getByLabelText('Currency');
    await user.click(currencySelect);

    // Select EUR
    await user.click(screen.getByText('EUR'));

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      currency: 'EUR',
    });
  });

  it('handles minimum outstanding input', async () => {
    render(<DebtsIOweFilters {...defaultProps} />);

    const minInput = screen.getByLabelText('Minimum Outstanding');

    // Use fireEvent.change for more predictable behavior with controlled inputs
    fireEvent.change(minInput, { target: { value: '25.50' } });

    // Should convert to minor units
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      minOutstandingMinor: 2550,
    });
  });

  it('handles include zero toggle', async () => {
    const user = userEvent.setup();
    render(<DebtsIOweFilters {...defaultProps} />);

    const toggle = screen.getByLabelText('Include Settled Debts');
    await user.click(toggle);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      includeZero: true,
    });
  });

  it('handles sort by change', async () => {
    const user = userEvent.setup();
    render(<DebtsIOweFilters {...defaultProps} />);

    const sortSelects = screen.getAllByRole('combobox');
    const sortBySelect = sortSelects[2]; // Third select is sort by

    await user.click(sortBySelect);
    await user.click(screen.getByText('Person Name'));

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      sortBy: 'person',
    });
  });

  it('handles sort direction change', async () => {
    const user = userEvent.setup();
    render(<DebtsIOweFilters {...defaultProps} />);

    const sortSelects = screen.getAllByRole('combobox');
    const sortDirSelect = sortSelects[3]; // Fourth select is sort direction

    await user.click(sortDirSelect);
    await user.click(screen.getByText('Ascending'));

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      sortDir: 'asc',
    });
  });

  it('clears all person filter when "All people" selected', async () => {
    const user = userEvent.setup();
    const filters: DebtsIOweQuery = { personId: 'person1' };

    render(<DebtsIOweFilters {...defaultProps} filters={filters} />);

    const personSelect = screen.getByLabelText('Person');
    await user.click(personSelect);
    await user.click(screen.getByText('All people'));

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      personId: undefined,
    });
  });

  it('shows clear button when filters are active', () => {
    const filters: DebtsIOweQuery = {
      personId: 'person1',
      currency: 'EUR',
      minOutstandingMinor: 1000,
    };

    render(<DebtsIOweFilters {...defaultProps} filters={filters} />);

    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('hides clear button when no filters active', () => {
    render(<DebtsIOweFilters {...defaultProps} />);

    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });

  it('clears all filters when clear button clicked', async () => {
    const user = userEvent.setup();
    const filters: DebtsIOweQuery = {
      personId: 'person1',
      currency: 'EUR',
      minOutstandingMinor: 1000,
      includeZero: true,
      sortBy: 'person',
      sortDir: 'asc',
    };

    render(<DebtsIOweFilters {...defaultProps} filters={filters} />);

    await user.click(screen.getByText('Clear'));

    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });

  it('shows active filters summary', () => {
    const filters: DebtsIOweQuery = {
      personId: 'person1',
      currency: 'EUR',
      minOutstandingMinor: 1000,
      includeZero: true,
      sortBy: 'recent',
    };

    render(<DebtsIOweFilters {...defaultProps} filters={filters} />);

    const summary = screen.getByText(/Active filters:/);
    expect(summary).toHaveTextContent('Person');
    expect(summary).toHaveTextContent('Currency');
    expect(summary).toHaveTextContent('Min amount');
    expect(summary).toHaveTextContent('Include settled');
    expect(summary).toHaveTextContent('Custom sort');
  });

  it('displays selected values correctly', () => {
    const filters: DebtsIOweQuery = {
      personId: 'person1',
      currency: 'EUR',
      minOutstandingMinor: 2550,
      includeZero: true,
      sortBy: 'person',
      sortDir: 'asc',
    };

    render(<DebtsIOweFilters {...defaultProps} filters={filters} />);

    // Check selected values are displayed
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('EUR')).toBeInTheDocument();
    expect(screen.getByDisplayValue('25.50')).toBeInTheDocument();
    expect(screen.getByLabelText('Include Settled Debts')).toBeChecked();
    expect(screen.getByText('Person Name')).toBeInTheDocument();
    expect(screen.getByText('Ascending')).toBeInTheDocument();
  });

  it('handles invalid number input gracefully', async () => {
    const user = userEvent.setup();
    render(<DebtsIOweFilters {...defaultProps} />);

    const minInput = screen.getByLabelText('Minimum Outstanding');
    await user.clear(minInput);
    await user.type(minInput, 'abc');

    // Should not call onChange with NaN
    expect(mockOnFiltersChange).not.toHaveBeenCalledWith({
      minOutstandingMinor: NaN,
    });
  });

  it('clears minimum outstanding when input is empty', async () => {
    const user = userEvent.setup();
    const filters: DebtsIOweQuery = { minOutstandingMinor: 1000 };

    render(<DebtsIOweFilters {...defaultProps} filters={filters} />);

    const minInput = screen.getByLabelText('Minimum Outstanding');
    await user.clear(minInput);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      minOutstandingMinor: undefined,
    });
  });

  it('uses default currencies when none provided', () => {
    render(
      <DebtsIOweFilters filters={{}} onFiltersChange={mockOnFiltersChange} people={mockPeople} />,
    );

    fireEvent.click(screen.getByLabelText('Currency'));

    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('EUR')).toBeInTheDocument();
    expect(screen.getByText('GBP')).toBeInTheDocument();
  });

  it('handles empty people list', () => {
    render(
      <DebtsIOweFilters
        filters={{}}
        onFiltersChange={mockOnFiltersChange}
        people={[]}
        currencies={mockCurrencies}
      />,
    );

    fireEvent.click(screen.getByLabelText('Person'));

    // Should still show "All people" option - use more specific query to avoid duplicates
    const allPeopleOptions = screen.getAllByText('All people');
    expect(allPeopleOptions.length).toBeGreaterThan(0);
    // But no other people
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
  });

  it('shows dollar sign for currency input', () => {
    render(<DebtsIOweFilters {...defaultProps} />);

    const inputContainer = screen.getByLabelText('Minimum Outstanding').parentElement;
    expect(inputContainer).toHaveTextContent('$');
  });

  it('preserves other filters when changing one filter', async () => {
    const user = userEvent.setup();
    const existingFilters: DebtsIOweQuery = {
      personId: 'person1',
      currency: 'USD',
      sortBy: 'outstanding',
    };

    render(<DebtsIOweFilters {...defaultProps} filters={existingFilters} />);

    const toggle = screen.getByLabelText('Include Settled Debts');
    await user.click(toggle);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      personId: 'person1',
      currency: 'USD',
      sortBy: 'outstanding',
      includeZero: true,
    });
  });
});
