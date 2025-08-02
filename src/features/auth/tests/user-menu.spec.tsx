import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { UserMenu } from '@/features/auth/components/user-menu';
import { useSession, signOut } from 'next-auth/react';
import { mockSession } from './auth-test-utils';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    width,
    height,
    style,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    style?: React.CSSProperties;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={style}
      data-testid="user-avatar"
    />
  ),
}));

describe('UserMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state when session is loading', () => {
    const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn(),
    });

    render(<UserMenu />);

    const loadingElement = screen.getByLabelText('Loading user information');
    expect(loadingElement).toBeInTheDocument();

    // Check for loading animation
    const loadingDiv = loadingElement.querySelector('div');
    expect(loadingDiv).toHaveStyle({
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#e0e0e0',
    });
  });

  test('returns null when unauthenticated', () => {
    const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    const { container } = render(<UserMenu />);
    expect(container.firstChild).toBeNull();
  });

  test('renders user information when authenticated', () => {
    const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    render(<UserMenu />);

    // Check main button
    const button = screen.getByRole('button', { name: /user menu/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();

    // Check avatar
    const avatar = screen.getByTestId('user-avatar');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(avatar).toHaveAttribute('alt', 'Test User avatar');
  });

  test('shows user initial when no avatar image', () => {
    const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
    const sessionWithoutImage = {
      ...mockSession,
      user: { ...mockSession.user, image: null },
    };

    mockUseSession.mockReturnValue({
      data: sessionWithoutImage,
      status: 'authenticated',
      update: jest.fn(),
    });

    render(<UserMenu />);

    // Should show initial instead of image
    expect(screen.queryByTestId('user-avatar')).not.toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument(); // First letter of "Test User"
  });

  test('toggles dropdown menu when clicked', async () => {
    const user = userEvent.setup();
    const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    render(<UserMenu />);

    const button = screen.getByRole('button', { name: /user menu/i });

    // Menu should be closed initially
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');

    // Click to open
    await user.click(button);

    // Menu should be open
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('test@example.com')).toBeInTheDocument();

    // Click to close
    await user.click(button);

    // Menu should be closed
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('closes menu when clicking outside', async () => {
    const user = userEvent.setup();
    const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    render(<UserMenu />);

    const button = screen.getByRole('button', { name: /user menu/i });

    // Open menu
    await user.click(button);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Click outside (on the backdrop)
    const backdrop = document.querySelector('[style*="position: fixed"]');
    if (backdrop) {
      await user.click(backdrop);
    }

    // Menu should be closed
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('closes menu when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    render(<UserMenu />);

    const button = screen.getByRole('button', { name: /user menu/i });

    // Open menu
    await user.click(button);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Press Escape
    await user.keyboard('{Escape}');

    // Menu should be closed
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('handles sign out action', async () => {
    const user = userEvent.setup();
    const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
    const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    render(<UserMenu />);

    // Open menu
    await user.click(screen.getByRole('button', { name: /user menu/i }));

    // Click sign out
    const signOutButton = screen.getByRole('menuitem', { name: /sign out/i });
    await user.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/auth/signin' });
  });

  test('shows loading state while signing out', async () => {
    const user = userEvent.setup();
    const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
    const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    // Make signOut return a promise that doesn't resolve immediately
    mockSignOut.mockImplementation(() => new Promise(() => {}));

    render(<UserMenu />);

    // Open menu
    await user.click(screen.getByRole('button', { name: /user menu/i }));

    // Click sign out
    const signOutButton = screen.getByRole('menuitem', { name: /sign out/i });
    await user.click(signOutButton);

    // Should show loading state
    expect(screen.getByText('Signing out...')).toBeInTheDocument();
    expect(signOutButton).toBeDisabled();
    expect(signOutButton).toHaveAttribute('aria-busy', 'true');
  });

  test('dropdown menu has proper accessibility attributes', async () => {
    const user = userEvent.setup();
    const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    render(<UserMenu />);

    const button = screen.getByRole('button', { name: /user menu/i });

    // Check button attributes
    expect(button).toHaveAttribute('aria-haspopup', 'true');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    // Open menu
    await user.click(button);

    // Check menu attributes
    const menu = screen.getByRole('menu');
    expect(menu).toHaveAttribute('aria-orientation', 'vertical');
    expect(menu).toHaveAttribute('aria-labelledby', 'user-menu-button');
  });

  test('applies custom className when provided', () => {
    const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    render(<UserMenu className="custom-class" />);

    const container = screen.getByRole('button', { name: /user menu/i }).parentElement;
    expect(container).toHaveClass('custom-class');
  });

  test('chevron icon rotates when menu is toggled', async () => {
    const user = userEvent.setup();
    const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    render(<UserMenu />);

    const button = screen.getByRole('button', { name: /user menu/i });
    const chevron = button.querySelector('svg[aria-hidden="true"]');

    // Initial state
    expect(chevron).toHaveStyle({ transform: 'rotate(0deg)' });

    // Open menu
    await user.click(button);
    expect(chevron).toHaveStyle({ transform: 'rotate(180deg)' });

    // Close menu
    await user.click(button);
    expect(chevron).toHaveStyle({ transform: 'rotate(0deg)' });
  });
});
