import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';

// Mock next-themes
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">
      {children}
    </div>
  ),
}));

describe('ThemeProvider', () => {
  test('renders children with theme provider wrapper', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div>Test content</div>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });
});
