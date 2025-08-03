'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DebtService, DebtShareRepository, ExternalPersonRepository } from '@/shared/types/common';
import { DebtPaymentRepository } from '../model/debt-payment-repository';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/shared/utils/money';
import { DebtsIOweServiceImpl } from '../services/debts-i-owe-service';
import { DebtsIOweItem, DebtsIOweQuery } from '../services/debts-i-owe-service';
import { SettleUpDialog } from './SettleUpDialog';
import { DebtsIOweCard } from './DebtsIOweCard';

interface DebtsIOweListProps {
  userId: string;
  filters?: DebtsIOweQuery;
  onSettleComplete?: () => void;
}

export function DebtsIOweList({ userId, filters, onSettleComplete }: DebtsIOweListProps) {
  const [debts, setDebts] = useState<DebtsIOweItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<DebtsIOweItem | null>(null);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);

  useEffect(() => {
    loadDebts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, filters]);

  const loadDebts = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Get service instance from dependency injection
      const service = new DebtsIOweServiceImpl(
        {} as DebtService,
        {} as DebtShareRepository,
        {} as DebtPaymentRepository,
        {} as ExternalPersonRepository,
      );

      const items = await service.list(userId, filters);
      setDebts(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load debts');
    } finally {
      setLoading(false);
    }
  };

  const handleSettleClick = (debt: DebtsIOweItem) => {
    setSelectedDebt(debt);
    setSettleDialogOpen(true);
  };

  const handleSettleComplete = () => {
    setSettleDialogOpen(false);
    setSelectedDebt(null);
    loadDebts();
    onSettleComplete?.();
  };

  if (loading) {
    return <DebtsIOweListSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-center">{error}</p>
          <Button onClick={loadDebts} variant="outline" className="mt-4 mx-auto block">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (debts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground text-lg mb-2">
              You&apos;re all settled up. No outstanding debts.
            </p>
            <p className="text-muted-foreground text-sm">
              When you owe money to others, they&apos;ll appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const currencyGroups = debts.reduce(
    (groups, debt) => {
      if (!groups[debt.currency]) {
        groups[debt.currency] = 0;
      }
      groups[debt.currency] += debt.outstandingMinor;
      return groups;
    },
    {} as Record<string, number>,
  );

  return (
    <>
      <div className="space-y-4">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(currencyGroups).map(([currency, amount]) => (
                <div key={currency} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{currency}</span>
                  <span className="text-2xl font-bold">{formatCurrency(amount, currency)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Debts List */}
        <div className="grid gap-4 md:hidden">
          {/* Mobile view - Cards */}
          {debts.map((debt) => (
            <DebtsIOweCard
              key={debt.personId}
              debt={debt}
              onSettleClick={() => handleSettleClick(debt)}
            />
          ))}
        </div>

        {/* Desktop view - Table */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Person</th>
                    <th className="text-right p-4">Total Owed</th>
                    <th className="text-right p-4">Paid</th>
                    <th className="text-right p-4">Outstanding</th>
                    <th className="text-right p-4">Last Activity</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((debt) => (
                    <tr key={debt.personId} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{debt.personName}</p>
                          <p className="text-sm text-muted-foreground">
                            {debt.debtShareIds.length} debt
                            {debt.debtShareIds.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </td>
                      <td className="text-right p-4">
                        {formatCurrency(debt.totalOwedMinor, debt.currency)}
                      </td>
                      <td className="text-right p-4">
                        {formatCurrency(debt.totalPaidMinor, debt.currency)}
                      </td>
                      <td className="text-right p-4">
                        <span className="font-semibold">
                          {formatCurrency(debt.outstandingMinor, debt.currency)}
                        </span>
                      </td>
                      <td className="text-right p-4">
                        <span className="text-sm text-muted-foreground">
                          {new Date(debt.lastActivityAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="text-right p-4">
                        <Button
                          size="sm"
                          onClick={() => handleSettleClick(debt)}
                          disabled={debt.outstandingMinor === 0}
                        >
                          Settle Up
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settlement Dialog */}
      {selectedDebt && (
        <SettleUpDialog
          open={settleDialogOpen}
          onOpenChange={setSettleDialogOpen}
          userId={userId}
          debt={selectedDebt}
          onComplete={handleSettleComplete}
        />
      )}
    </>
  );
}

function DebtsIOweListSkeleton() {
  return (
    <div className="space-y-4" role="status">
      {/* Summary skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-40" />
        </CardContent>
      </Card>

      {/* List skeleton */}
      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-2 text-right">
                    <Skeleton className="h-5 w-20 ml-auto" />
                    <Skeleton className="h-8 w-24 ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
