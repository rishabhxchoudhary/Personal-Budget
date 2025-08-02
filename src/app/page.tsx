'use client';

import React from 'react';
import { TransactionManager } from '@/features/budget/components/transaction-manager';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <TransactionManager itemsPerPage={10} />
    </main>
  );
}
