import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/features/auth/components/auth-provider';
import { getSession } from '@/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Personal Budget Manager',
  description: 'Track your income and expenses with ease',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider session={session}>{children}</AuthProvider>
      </body>
    </html>
  );
}
