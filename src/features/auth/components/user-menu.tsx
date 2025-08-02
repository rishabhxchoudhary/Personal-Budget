'use client';

import React, { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type UserMenuProps = {
  className?: string;
};

export function UserMenu({ className }: UserMenuProps) {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ callbackUrl: '/auth/signin' });
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className={className} aria-label="Loading user information">
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#e0e0e0',
            animation: 'pulse 1.5s infinite',
          }}
        />
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.user) {
    return null;
  }

  const { user } = session;

  return (
    <div className={cn('relative', className)} onKeyDown={handleKeyDown}>
      <button
        onClick={toggleMenu}
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        id="user-menu-button"
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={`${user.name || 'User'} avatar`}
            width={32}
            height={32}
            className="rounded-full"
            style={{ objectFit: 'cover' }}
            data-testid="user-avatar"
          />
        ) : (
          <div className="flex items-center justify-center w-8 h-8 text-sm font-semibold text-white bg-indigo-600 rounded-full">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
        <span className="hidden sm:inline-block">{user.name || 'User'}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close menu when clicking outside */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 40,
            }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown menu */}
          <div
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu-button"
            className="absolute right-0 z-50 w-64 mt-2 origin-top-right bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700"
          >
            {/* User info section */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</p>
            </div>

            {/* Menu items */}
            <div className="py-1" role="none">
              <button
                role="menuitem"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center w-full gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                aria-busy={isSigningOut}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
