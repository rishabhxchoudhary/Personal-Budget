'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Filter, Download, Calendar } from 'lucide-react';

// In a real app, this would come from your API
const mockTransactions = [
  {
    id: 'tx1',
    date: new Date(2023, 10, 5),
    description: 'Grocery Shopping',
    amount: -8750, // -$87.50
    category: 'Food & Groceries',
    account: 'Checking Account'
  },
  {
    id: 'tx2',
    date: new Date(2023, 10, 3),
    description: 'Monthly Salary',
    amount: 350000, // $3,500.00
    category: 'Income',
    account: 'Checking Account'
  },
  {
    id: 'tx3',
    date: new Date(2023, 10, 1),
    description: 'Rent Payment',
    amount: -120000, // -$1,200.00
    category: 'Housing',
    account: 'Checking Account'
  },
  {
    id: 'tx4',
    date: new Date(2023, 9, 28),
    description: 'Internet Bill',
    amount: -7999, // -$79.99
    category: 'Utilities',
    account: 'Credit Card'
  },
  {
    id: 'tx5',
    date: new Date(2023, 9, 25),
    description: 'Coffee Shop',
    amount: -450, // -$4.50
    category: 'Dining Out',
    account: 'Cash'
  }
];

export default function TransactionsPage() {
  const [transactions] = useState(mockTransactions);

  // Format currency (simple implementation)
  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount) / 100;
    return `${amount < 0 ? '-' : ''}$${absAmount.toFixed(2)}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your financial transactions
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Date Range
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Description</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-left p-4">Account</th>
                  <th className="text-right p-4">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">{transaction.date.toLocaleDateString()}</td>
                    <td className="p-4 font-medium">{transaction.description}</td>
                    <td className="p-4">{transaction.category}</td>
                    <td className="p-4">{transaction.account}</td>
                    <td className={`p-4 text-right font-medium ${transaction.amount < 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-center">
            <Button variant="outline">
              Load More Transactions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
