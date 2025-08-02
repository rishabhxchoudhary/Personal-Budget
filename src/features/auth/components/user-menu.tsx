'use client';

import React, { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

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
    <div className={className} style={{ position: 'relative' }} onKeyDown={handleKeyDown}>
      <button
        onClick={toggleMenu}
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem',
          backgroundColor: 'transparent',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f5f5f5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={`${user.name || 'User'} avatar`}
            width={32}
            height={32}
            style={{
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
            aria-hidden="true"
          >
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
        <span style={{ fontSize: '14px', fontWeight: '500' }}>{user.name || 'User'}</span>
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
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              width: '240px',
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              zIndex: 50,
              padding: '0.5rem',
            }}
          >
            {/* User info section */}
            <div
              style={{
                padding: '0.75rem',
                borderBottom: '1px solid #e0e0e0',
                marginBottom: '0.5rem',
              }}
            >
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0,
                }}
              >
                {user.name}
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: '0.25rem 0 0 0',
                }}
              >
                {user.email}
              </p>
            </div>

            {/* Menu items */}
            <div role="none">
              <button
                role="menuitem"
                onClick={handleSignOut}
                disabled={isSigningOut}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#374151',
                  cursor: isSigningOut ? 'not-allowed' : 'pointer',
                  opacity: isSigningOut ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isSigningOut) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
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
