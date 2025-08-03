'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, PlusCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/shared/utils/money';

// This would come from your API in a real implementation
interface DebtOwedToMe {
  id: string;
  personName: string;
  amountOwed: number;
  currency: string;
  dueDate: Date | null;
  lastActivity: Date;
}

export default function MoneyOwedToMePage() {
  const [debts, setDebts] = useState<DebtOwedToMe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data - in a real app this would come from your API
  const mockDebts = React.useMemo<DebtOwedToMe[]>(
    () => [
      {
        id: '1',
        personName: 'Alex Johnson',
        amountOwed: 7500, // $75.00
        currency: 'USD',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        id: '2',
        personName: 'Maya Williams',
        amountOwed: 12000, // $120.00
        currency: 'USD',
        dueDate: null,
        lastActivity: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      },
      {
        id: '3',
        personName: 'Sam Taylor',
        amountOwed: 2500, // $25.00
        currency: 'USD',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (overdue)
        lastActivity: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      },
    ],
    [],
  );

  useEffect(() => {
    // Simulate API fetch with a delay
    const fetchDebts = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setDebts(mockDebts);
        setError(null);
      } catch {
        setError('Failed to load debts owed to you');
        setDebts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDebts();
  }, [mockDebts]);

  const handleRefresh = () => {
    // Re-fetch data
    setLoading(true);
    setTimeout(() => {
      setDebts(mockDebts);
      setLoading(false);
    }, 1000);
  };

  // Calculate the total amount owed
  const totalOwed = debts.reduce((sum, debt) => sum + debt.amountOwed, 0);

  return (
    <div className="container px-4 py-8 mx-auto max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Money Owed To Me</h1>
          <p className="text-muted-foreground mt-1">Track and manage money others owe to you</p>
        </div>
        <div className="space-x-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-14 w-48" />
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Total Owed to You</h3>
                <span className="text-3xl font-bold">{formatCurrency(totalOwed, 'USD')}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">Total Debts</p>
                  <p className="text-2xl font-bold">{debts.length}</p>
                </div>
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold">
                    {debts.filter((d) => d.dueDate && d.dueDate < new Date()).length}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">No Due Date</p>
                  <p className="text-2xl font-bold">
                    {debts.filter((d) => d.dueDate === null).length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List of Debts */}
      <Card>
        <CardHeader>
          <CardTitle>All Debts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : error ? (
            <div className="text-center p-6">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={handleRefresh}>
                Retry
              </Button>
            </div>
          ) : debts.length === 0 ? (
            <div className="text-center p-10">
              <p className="text-xl font-medium mb-2">No one owes you money</p>
              <p className="text-muted-foreground mb-6">
                When someone owes you money, it will appear here.
              </p>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Debt
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4">Person</th>
                    <th className="text-right p-4">Amount</th>
                    <th className="text-right p-4">Due Date</th>
                    <th className="text-right p-4">Last Activity</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((debt) => (
                    <tr key={debt.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <p className="font-medium">{debt.personName}</p>
                      </td>
                      <td className="text-right p-4 font-medium">
                        {formatCurrency(debt.amountOwed, debt.currency)}
                      </td>
                      <td className="text-right p-4">
                        {debt.dueDate ? (
                          <span
                            className={
                              debt.dueDate < new Date() ? 'text-destructive font-medium' : ''
                            }
                          >
                            {debt.dueDate.toLocaleDateString()}
                            {debt.dueDate < new Date() && ' (Overdue)'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not set</span>
                        )}
                      </td>
                      <td className="text-right p-4 text-muted-foreground">
                        {debt.lastActivity.toLocaleDateString()}
                      </td>
                      <td className="text-right p-4">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/debts/owed-to-me/${debt.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
