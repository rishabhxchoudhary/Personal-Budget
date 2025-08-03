import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from 'next-themes';

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state when not mounted', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
      themes: ['light', 'dark'],
      systemTheme: 'light',
      resolvedTheme: 'light',
      forcedTheme: undefined,
    });

    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Toggle theme')).toBeInTheDocument();
  });

  test('renders light mode toggle when theme is light', async () => {
    const mockSetTheme = jest.fn();
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      themes: ['light', 'dark'],
      systemTheme: 'light',
      resolvedTheme: 'light',
      forcedTheme: undefined,
    });

    render(<ThemeToggle />);

    // Wait for component to mount
    await screen.findByText('Dark');

    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });

  test('renders dark mode toggle when theme is dark', async () => {
    const mockSetTheme = jest.fn();
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      themes: ['light', 'dark'],
      systemTheme: 'dark',
      resolvedTheme: 'dark',
      forcedTheme: undefined,
    });

    render(<ThemeToggle />);

    // Wait for component to mount
    await screen.findByText('Light');

    const button = screen.getByRole('button', { name: /switch to light mode/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(screen.getByText('Light')).toBeInTheDocument();
  });

  test('toggles from light to dark mode', async () => {
    const user = userEvent.setup();
    const mockSetTheme = jest.fn();
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      themes: ['light', 'dark'],
      systemTheme: 'light',
      resolvedTheme: 'light',
      forcedTheme: undefined,
    });

    render(<ThemeToggle />);

    // Wait for component to mount
    const button = await screen.findByRole('button', { name: /switch to dark mode/i });

    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  test('toggles from dark to light mode', async () => {
    const user = userEvent.setup();
    const mockSetTheme = jest.fn();
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      themes: ['light', 'dark'],
      systemTheme: 'dark',
      resolvedTheme: 'dark',
      forcedTheme: undefined,
    });

    render(<ThemeToggle />);

    // Wait for component to mount
    const button = await screen.findByRole('button', { name: /switch to light mode/i });

    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  test('has proper accessibility attributes', async () => {
    const mockSetTheme = jest.fn();
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      themes: ['light', 'dark'],
      systemTheme: 'light',
      resolvedTheme: 'light',
      forcedTheme: undefined,
    });

    render(<ThemeToggle />);

    // Wait for component to mount
    const button = await screen.findByRole('button', { name: /switch to dark mode/i });

    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    expect(screen.getByText('Toggle theme')).toHaveClass('sr-only');
  });

  test('shows text on larger screens', async () => {
    const mockSetTheme = jest.fn();
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      themes: ['light', 'dark'],
      systemTheme: 'light',
      resolvedTheme: 'light',
      forcedTheme: undefined,
    });

    render(<ThemeToggle />);

    // Wait for component to mount
    await screen.findByText('Dark');

    const text = screen.getByText('Dark');
    expect(text).toHaveClass('hidden', 'sm:inline-block');
  });
});
