'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { DebtsIOweQuery } from '../services/debts-i-owe-service';
import { ExternalPerson } from '@/shared/types/common';
import { FilterIcon, XIcon } from 'lucide-react';

interface DebtsIOweFiltersProps {
  filters: DebtsIOweQuery;
  onFiltersChange: (filters: DebtsIOweQuery) => void;
  people?: ExternalPerson[];
  currencies?: string[];
}

export function DebtsIOweFilters({
  filters,
  onFiltersChange,
  people = [],
  currencies = ['USD', 'EUR', 'GBP']
}: DebtsIOweFiltersProps) {
  const handlePersonChange = (value: string) => {
    onFiltersChange({
      ...filters,
      personId: value === 'all' ? undefined : value
    });
  };

  const handleCurrencyChange = (value: string) => {
    onFiltersChange({
      ...filters,
      currency: value === 'all' ? undefined : value
    });
  };

  const handleMinOutstandingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = value ? parseFloat(value) : undefined;

    onFiltersChange({
      ...filters,
      minOutstandingMinor: numValue !== undefined ? Math.round(numValue * 100) : undefined
    });
  };

  const handleIncludeZeroChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      includeZero: checked
    });
  };

  const handleSortByChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sortBy: value as 'outstanding' | 'person' | 'recent'
    });
  };

  const handleSortDirChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sortDir: value as 'asc' | 'desc'
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.personId !== undefined ||
    filters.currency !== undefined ||
    filters.minOutstandingMinor !== undefined ||
    filters.includeZero === true ||
    filters.sortBy !== undefined;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground"
            >
              <XIcon className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Person Filter */}
        <div className="space-y-2">
          <Label htmlFor="person-filter">Person</Label>
          <Select
            value={filters.personId || 'all'}
            onValueChange={handlePersonChange}
          >
            <SelectTrigger id="person-filter">
              <SelectValue placeholder="All people" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All people</SelectItem>
              {people.map((person) => (
                <SelectItem key={person.personId} value={person.personId}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Currency Filter */}
        <div className="space-y-2">
          <Label htmlFor="currency-filter">Currency</Label>
          <Select
            value={filters.currency || 'all'}
            onValueChange={handleCurrencyChange}
          >
            <SelectTrigger id="currency-filter">
              <SelectValue placeholder="All currencies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All currencies</SelectItem>
              {currencies.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Min Outstanding Filter */}
        <div className="space-y-2">
          <Label htmlFor="min-outstanding">Minimum Outstanding</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="min-outstanding"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={filters.minOutstandingMinor ? (filters.minOutstandingMinor / 100).toFixed(2) : ''}
              onChange={handleMinOutstandingChange}
              className="pl-8"
            />
          </div>
        </div>

        {/* Include Zero Toggle */}
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="include-zero" className="text-base">
              Include Settled Debts
            </Label>
            <p className="text-sm text-muted-foreground">
              Show debts with zero outstanding balance
            </p>
          </div>
          <Switch
            id="include-zero"
            checked={filters.includeZero || false}
            onCheckedChange={handleIncludeZeroChange}
          />
        </div>

        {/* Sort Controls */}
        <div className="space-y-2">
          <Label>Sort By</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={filters.sortBy || 'outstanding'}
              onValueChange={handleSortByChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outstanding">Outstanding Amount</SelectItem>
                <SelectItem value="person">Person Name</SelectItem>
                <SelectItem value="recent">Recent Activity</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.sortDir || 'desc'}
              onValueChange={handleSortDirChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Active filters: {
                [
                  filters.personId && 'Person',
                  filters.currency && 'Currency',
                  filters.minOutstandingMinor && 'Min amount',
                  filters.includeZero && 'Include settled',
                  filters.sortBy && 'Custom sort'
                ].filter(Boolean).join(', ')
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
