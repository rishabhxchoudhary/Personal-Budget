'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/shared/utils/money';
import { DebtsIOweItem } from '../services/debts-i-owe-service';
import { CalendarIcon, UserIcon } from 'lucide-react';

interface DebtsIOweCardProps {
  debt: DebtsIOweItem;
  onSettleClick: () => void;
}

export function DebtsIOweCard({ debt, onSettleClick }: DebtsIOweCardProps) {
  const percentagePaid = debt.totalOwedMinor > 0
    ? Math.round((debt.totalPaidMinor / debt.totalOwedMinor) * 100)
    : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-lg">{debt.personName}</h3>
          </div>
          <Badge variant={debt.outstandingMinor === 0 ? 'secondary' : 'default'}>
            {debt.debtShareIds.length} debt{debt.debtShareIds.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Outstanding Amount - Primary Focus */}
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground mb-1">Outstanding</p>
          <p className="text-3xl font-bold">
            {formatCurrency(debt.outstandingMinor, debt.currency)}
          </p>
        </div>

        {/* Progress Bar */}
        {debt.totalPaidMinor > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Paid: {formatCurrency(debt.totalPaidMinor, debt.currency)}</span>
              <span>{percentagePaid}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${percentagePaid}%` }}
              />
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-xs text-muted-foreground">Total Owed</p>
            <p className="font-medium">
              {formatCurrency(debt.totalOwedMinor, debt.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Activity</p>
            <p className="font-medium flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              {new Date(debt.lastActivityAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Button
          className="w-full"
          onClick={onSettleClick}
          disabled={debt.outstandingMinor === 0}
        >
          {debt.outstandingMinor === 0 ? 'Fully Settled' : 'Settle Up'}
        </Button>
      </CardContent>
    </Card>
  );
}
