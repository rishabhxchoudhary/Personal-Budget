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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createAccount, CreateAccountRequest } from '@/shared/api/accounts';
import { Account, AccountType } from '@/shared/types/common';

interface AccountCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountCreated: (account: Account) => void;
}

interface FormData {
  name: string;
  type: AccountType;
  balanceMinor: string;
  currency: string;
  institution: string;
  lastFour: string;
}

interface FormErrors {
  name?: string;
  type?: string;
  balanceMinor?: string;
  currency?: string;
  institution?: string;
  lastFour?: string;
  general?: string;
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit' },
  { value: 'cash', label: 'Cash' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'CAD', label: 'CAD' },
];

export function AccountCreateModal({
  open,
  onOpenChange,
  onAccountCreated,
}: AccountCreateModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'checking',
    balanceMinor: '',
    currency: 'USD',
    institution: '',
    lastFour: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        type: 'checking',
        balanceMinor: '',
        currency: 'USD',
        institution: '',
        lastFour: '',
      });
      setErrors({});
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required';
    }

    if (!formData.balanceMinor.trim()) {
      newErrors.balanceMinor = 'Initial balance is required';
    } else {
      const balance = parseFloat(formData.balanceMinor);
      if (isNaN(balance)) {
        newErrors.balanceMinor = 'Must be a valid number';
      }
    }

    if (formData.lastFour && !/^\d{4}$/.test(formData.lastFour)) {
      newErrors.lastFour = 'Must be exactly 4 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const balance = parseFloat(formData.balanceMinor);
      const balanceMinor = Math.round(balance * 100); // Convert to minor units

      const requestData: CreateAccountRequest = {
        name: formData.name.trim(),
        type: formData.type,
        balanceMinor,
        currency: formData.currency,
        isActive: true,
      };

      if (formData.institution.trim()) {
        requestData.institution = formData.institution.trim();
      }

      if (formData.lastFour.trim()) {
        requestData.lastFour = formData.lastFour.trim();
      }

      const account = await createAccount(requestData);
      onAccountCreated(account);
      onOpenChange(false);
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Account creation failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
          <DialogDescription>Add a new financial account to track your money.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && <div className="text-sm text-destructive">{errors.general}</div>}

          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Checking Account"
            />
            {errors.name && <div className="text-sm text-destructive">{errors.name}</div>}
          </div>

          <div className="space-y-2">
            <Label>Account Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: AccountType) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <div className="text-sm text-destructive">{errors.type}</div>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Initial Balance</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={formData.balanceMinor}
              onChange={(e) => setFormData({ ...formData, balanceMinor: e.target.value })}
              placeholder="0.00"
            />
            {errors.balanceMinor && (
              <div className="text-sm text-destructive">{errors.balanceMinor}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution">Institution (Optional)</Label>
            <Input
              id="institution"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              placeholder="Bank of America"
            />
            {errors.institution && (
              <div className="text-sm text-destructive">{errors.institution}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastFour">Last Four Digits (Optional)</Label>
            <Input
              id="lastFour"
              value={formData.lastFour}
              onChange={(e) => setFormData({ ...formData, lastFour: e.target.value })}
              placeholder="1234"
              maxLength={4}
            />
            {errors.lastFour && <div className="text-sm text-destructive">{errors.lastFour}</div>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
