'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, parseCurrencyInput } from '@/shared/utils/money';
import { DebtsIOweItem, DebtsIOweServiceImpl } from '../services/debts-i-owe-service';
import { DebtService, DebtShareRepository, ExternalPersonRepository } from '@/shared/types/common';
import { DebtPaymentRepository } from '../model/debt-payment-repository';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SettleUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  debt: DebtsIOweItem;
  onComplete: () => void;
}

interface AllocationPreview {
  shareId: string;
  originalAmount: number;
  alreadyPaid: number;
  willPay: number;
  remaining: number;
}

export function SettleUpDialog({
  open,
  onOpenChange,
  userId,
  debt,
  onComplete,
}: SettleUpDialogProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [allocations, setAllocations] = useState<AllocationPreview[]>([]);

  const amountMinor = parseCurrencyInput(amount) * 100;
  const isValidAmount = amountMinor > 0 && amountMinor <= debt.outstandingMinor;

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setAmount('');
      setError(null);
      setSuccess(false);
      setAllocations([]);
    }
  }, [open]);

  useEffect(() => {
    // Calculate allocation preview when amount changes
    if (amountMinor > 0 && amountMinor <= debt.outstandingMinor) {
      calculateAllocationPreview();
    } else {
      setAllocations([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountMinor, debt.outstandingMinor]);

  const calculateAllocationPreview = async () => {
    try {
      // TODO: Fetch actual debt shares and calculate FIFO allocation
      // For now, create a simple preview
      const preview: AllocationPreview[] = [];
      let remainingToPay = amountMinor;

      // Simulate FIFO allocation across shares
      debt.debtShareIds.forEach((shareId) => {
        if (remainingToPay <= 0) return;

        // Mock data - in real implementation, fetch actual share data
        const mockShareAmount = Math.floor(debt.totalOwedMinor / debt.debtShareIds.length);
        const mockAlreadyPaid = Math.floor(debt.totalPaidMinor / debt.debtShareIds.length);
        const outstanding = mockShareAmount - mockAlreadyPaid;

        const toPay = Math.min(remainingToPay, outstanding);

        preview.push({
          shareId,
          originalAmount: mockShareAmount,
          alreadyPaid: mockAlreadyPaid,
          willPay: toPay,
          remaining: outstanding - toPay,
        });

        remainingToPay -= toPay;
      });

      setAllocations(preview.filter((a) => a.willPay > 0));
    } catch (err) {
      console.error('Failed to calculate allocation preview:', err);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only valid currency input
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setAmount(value);
      setError(null);
    }
  };

  const handleSettle = async () => {
    if (!isValidAmount) {
      setError('Please enter a valid amount');
      return;
    }

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

      await service.settleUp(
        userId,
        debt.personId,
        amountMinor,
        `Settlement payment to ${debt.personName}`,
      );

      setSuccess(true);

      // Close dialog and refresh after short delay
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settle Up with {debt.personName}</DialogTitle>
          <DialogDescription>
            Outstanding: {formatCurrency(debt.outstandingMinor, debt.currency)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="settle-amount">Payment Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {debt.currency === 'USD' ? '$' : debt.currency}
              </span>
              <Input
                id="settle-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                disabled={loading || success}
                className="pl-12 text-lg"
                autoFocus
              />
            </div>
            {amount && !isValidAmount && (
              <p className="text-sm text-destructive">
                Amount must be between {formatCurrency(1, debt.currency)} and{' '}
                {formatCurrency(debt.outstandingMinor, debt.currency)}
              </p>
            )}
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAmount((debt.outstandingMinor / 100 / 2).toFixed(2))}
              disabled={loading || success}
            >
              50%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAmount((debt.outstandingMinor / 100).toFixed(2))}
              disabled={loading || success}
            >
              Full Amount
            </Button>
          </div>

          {/* Allocation Preview */}
          {allocations.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="text-sm font-medium mb-3">Payment Allocation (FIFO)</h4>
                <div className="space-y-2">
                  {allocations.map((allocation, index) => (
                    <div key={allocation.shareId} className="text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Debt #{index + 1}</span>
                        <span className="font-medium">
                          {formatCurrency(allocation.willPay, debt.currency)}
                        </span>
                      </div>
                      {allocation.remaining === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Will be fully settled</p>
                      )}
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between items-center font-medium">
                  <span>Total Payment</span>
                  <span>{formatCurrency(amountMinor, debt.currency)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Payment recorded successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSettle} disabled={!isValidAmount || loading || success}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Success
              </>
            ) : (
              'Confirm Payment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
