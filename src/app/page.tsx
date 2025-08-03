'use client';

import React from 'react';
import { TransactionManager } from '@/features/budget/components/transaction-manager';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <TransactionManager itemsPerPage={10} />
    </main>
  );
}
