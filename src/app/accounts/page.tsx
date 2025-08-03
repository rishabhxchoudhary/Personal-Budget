'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';

// In a real app, this would come from your API
const mockAccounts = [
  {
    id: 'acc1',
    name: 'Main Checking',
    type: 'checking',
    balance: 245678, // $2,456.78
    institution: 'Bank of America',
    lastFour: '4321'
  },
  {
    id: 'acc2',
    name: 'Savings',
    type: 'savings',
    balance: 1250000, // $12,500.00
    institution: 'Bank of America',
    lastFour: '8765'
  },
  {
    id: 'acc3',
    name: 'Credit Card',
    type: 'credit',
    balance: -358749, // -$3,587.49
    institution: 'Chase',
    lastFour: '1234'
  },
  {
    id: 'acc4',
    name: 'Cash Wallet',
    type: 'cash',
    balance: 12500, // $125.00
    institution: null,
    lastFour: null
  }
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState(mockAccounts);
  const [isLoading, setIsLoading] = useState(false);

  // Format currency (simple implementation)
  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount) / 100;
    return `${amount < 0 ? '-' : ''}$${absAmount.toFixed(2)}`;
  };

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setAccounts(mockAccounts);
      setIsLoading(false);
    }, 1000);
  };

  // Calculate total balance across all accounts
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  // Calculate stats
  const totalAssets = accounts
    .filter(acc => acc.balance > 0)
    .reduce((sum, acc) => sum + acc.balance, 0);

  const totalLiabilities = accounts
    .filter(acc => acc.balance < 0)
    .reduce((sum, acc) => sum + acc.balance, 0);

  const netWorth = totalAssets + totalLiabilities; // totalLiabilities is already negative

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your financial accounts and track balances
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Worth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(netWorth)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalAssets)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalLiabilities)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4">Account Name</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-left p-4">Institution</th>
                  <th className="text-right p-4">Balance</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-medium">{account.name}</td>
                    <td className="p-4 capitalize">{account.type}</td>
                    <td className="p-4">{account.institution || 'N/A'}</td>
                    <td className={`p-4 text-right font-medium ${account.balance < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                      {formatCurrency(account.balance)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/accounts/${account.id}`}>View</Link>
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50">
                  <td colSpan={3} className="p-4 font-medium">Total</td>
                  <td className="p-4 text-right font-bold">
                    {formatCurrency(totalBalance)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
