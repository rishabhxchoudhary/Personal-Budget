'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Transaction = {
  id: string;
  amount: string;
  date: string;
  category: string;
  type: 'income' | 'expense';
  note: string;
};

export type TransactionListProps = {
  transactions: Transaction[];
  itemsPerPage: number;
};

export function TransactionList({ transactions, itemsPerPage }: TransactionListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Filter transactions based on selected type
  const filteredTransactions = transactions.filter((transaction) => {
    if (filterType === 'all') return true;
    return transaction.type === filterType;
  });

  if (filteredTransactions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="filter-type" className="text-sm font-medium">
            Filter by type:
          </Label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as 'all' | 'income' | 'expense');
              setCurrentPage(1); // Reset to first page when filter changes
            }}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
          >
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-muted-foreground dark:text-slate-400">No transactions found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredTransactions.length);
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const formatAmount = (amount: string, type: 'income' | 'expense'): string => {
    const value = parseFloat(amount);
    const formatted = value.toFixed(2);
    return type === 'expense' ? `-$${formatted}` : `$${formatted}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="filter-type" className="text-sm font-medium">
          Filter by type:
        </Label>
        <select
          id="filter-type"
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value as 'all' | 'income' | 'expense');
            setCurrentPage(1); // Reset to first page when filter changes
          }}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
        >
          <option value="all">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      <Card className="overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50">
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[120px]">Category</TableHead>
              <TableHead className="w-[120px] text-right">Amount</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTransactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                data-transaction-type={transaction.type}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <TableCell className="font-medium">{transaction.date}</TableCell>
                <TableCell>
                  <Badge
                    variant={transaction.type === 'income' ? 'secondary' : 'outline'}
                    className={cn(
                      'font-medium',
                      transaction.type === 'income'
                        ? 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/30'
                        : 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/30',
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {transaction.type}
                    </span>
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="font-normal dark:border-slate-700 dark:text-slate-300"
                  >
                    {transaction.category}
                  </Badge>
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-semibold',
                    transaction.type === 'income'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400',
                  )}
                >
                  {formatAmount(transaction.amount, transaction.type)}
                </TableCell>
                <TableCell className="text-muted-foreground dark:text-slate-400">
                  {transaction.note}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground dark:text-slate-400">
          Showing {startIndex + 1}-{endIndex} of {filteredTransactions.length}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
