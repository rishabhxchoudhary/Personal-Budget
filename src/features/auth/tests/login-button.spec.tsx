import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { LoginButton } from '@/features/auth/components/login-button';
import { signIn } from 'next-auth/react';

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

describe('LoginButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with correct text and Google icon', () => {
    render(<LoginButton />);

    const button = screen.getByRole('button', { name: /sign in with google/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();

    // Check for Google icon SVG
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '18');
    expect(svg).toHaveAttribute('height', '18');
  });

  test('calls signIn with Google provider when clicked', async () => {
    const user = userEvent.setup();
    const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;

    render(<LoginButton />);

    const button = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(button);

    expect(mockSignIn).toHaveBeenCalledWith('google', {
      callbackUrl: '/',
      redirect: true,
    });
  });

  test('uses custom callbackUrl when provided', async () => {
    const user = userEvent.setup();
    const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;

    render(<LoginButton callbackUrl="/dashboard" />);

    const button = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(button);

    expect(mockSignIn).toHaveBeenCalledWith('google', {
      callbackUrl: '/dashboard',
      redirect: true,
    });
  });

  test('shows loading state while signing in', async () => {
    const user = userEvent.setup();
    const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;

    // Make signIn return a promise that doesn't resolve immediately
    mockSignIn.mockImplementation(() => new Promise(() => {}));

    render(<LoginButton />);

    const button = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(button);

    // Button should show loading state
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  test('shows error message when sign in fails', async () => {
    const user = userEvent.setup();
    const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;

    // Make signIn reject
    mockSignIn.mockRejectedValue(new Error('Auth error'));

    render(<LoginButton />);

    const button = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to sign in. Please try again.');
    });

    // Button should be enabled again after error
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'false');
  });

  test('applies custom className when provided', () => {
    render(<LoginButton className="custom-class" />);

    const button = screen.getByRole('button', { name: /sign in with google/i });
    expect(button).toHaveClass('custom-class');
  });

  test('button has proper accessibility attributes', () => {
    render(<LoginButton />);

    const button = screen.getByRole('button', { name: /sign in with google/i });
    expect(button).toHaveAttribute('aria-label', 'Sign in with Google');
    expect(button).toHaveAttribute('aria-busy', 'false');
  });

  test('error message is announced to screen readers', async () => {
    const user = userEvent.setup();
    const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
    mockSignIn.mockRejectedValue(new Error('Auth error'));

    render(<LoginButton />);

    const button = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(button);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
      expect(alert).toHaveTextContent('Failed to sign in. Please try again.');
    });
  });

  test('button hover state changes background color', async () => {
    const user = userEvent.setup();
    render(<LoginButton />);

    const button = screen.getByRole('button', { name: /sign in with google/i });

    // Initial background
    expect(button).toHaveStyle({ backgroundColor: '#fff' });

    // Hover
    await user.hover(button);
    expect(button).toHaveStyle({ backgroundColor: '#f8f9fa' });

    // Unhover
    await user.unhover(button);
    expect(button).toHaveStyle({ backgroundColor: '#fff' });
  });

  test('prevents multiple simultaneous sign in attempts', async () => {
    const user = userEvent.setup();
    const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;

    // Make signIn return a promise that resolves after a delay
    mockSignIn.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<LoginButton />);

    const button = screen.getByRole('button', { name: /sign in with google/i });

    // Click multiple times quickly
    await user.click(button);
    await user.click(button);
    await user.click(button);

    // Should only call signIn once
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });
});
