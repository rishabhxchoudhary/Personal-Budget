'use client';

import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DebtsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentTab = pathname.includes('/i-owe') ? 'i-owe' : 'owed-to-me';

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Debt Tracking</h1>
        <p className="text-muted-foreground mb-8">
          Track money you owe to others and money owed to you
        </p>

        <Tabs value={currentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="i-owe" asChild>
              <Link href="/debts/i-owe">Debts I Owe</Link>
            </TabsTrigger>
            <TabsTrigger value="owed-to-me" asChild>
              <Link href="/debts/owed-to-me">Money Owed to Me</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {children}
    </div>
  );
}
