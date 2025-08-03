'use client';

import React from 'react';
import { TransactionManager } from '@/features/budget/components/transaction-manager';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, DollarSign, PiggyBank, Wallet } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Personal Budget Manager</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Track, budget, and manage your personal finances with ease.
          </p>
        </div>

        {/* Quick Actions Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <PiggyBank className="h-5 w-5 mr-2" />
                Budgets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Plan and track your monthly spending</p>
              <Button asChild className="w-full mt-2">
                <Link href="/budgets">
                  Manage Budgets <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Wallet className="h-5 w-5 mr-2" />
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">View and categorize your transactions</p>
              <Button asChild className="w-full mt-2">
                <Link href="/transactions">
                  View Transactions <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Debts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Track money you owe and money owed to you
              </p>
              <Button asChild className="w-full mt-2">
                <Link href="/debts/i-owe">
                  Manage Debts <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold tracking-tight">Recent Transactions</h2>
            <Button variant="outline" asChild>
              <Link href="/transactions">View All</Link>
            </Button>
          </div>
          <TransactionManager itemsPerPage={5} />
        </div>
      </div>
    </main>
  );
}
