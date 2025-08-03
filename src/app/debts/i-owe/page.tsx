'use client';

import React, { useState, useEffect } from 'react';
import { DebtsIOweList } from '@/features/debts/components/DebtsIOweList';
import { DebtsIOweFilters } from '@/features/debts/components/DebtsIOweFilters';
import { DebtsIOweQuery } from '@/features/debts/services/debts-i-owe-service';
import { ExternalPerson } from '@/shared/types/common';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';

// Mock data for development
const MOCK_PEOPLE: ExternalPerson[] = [
  {
    personId: 'p1',
    userId: 'u1',
    name: 'John Smith',
    email: 'john@example.com',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    personId: 'p2',
    userId: 'u1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    personId: 'p3',
    userId: 'u1',
    name: 'Robert Johnson',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const MOCK_CURRENCIES = ['USD', 'EUR', 'GBP'];

export default function DebtsIOwePageComponent() {
  const [filters, setFilters] = useState<DebtsIOweQuery>({
    sortBy: 'outstanding',
    sortDir: 'desc',
  });
  const [people, setPeople] = useState<ExternalPerson[]>(MOCK_PEOPLE);
  const [currencies, setCurrencies] = useState<string[]>(MOCK_CURRENCIES);
  const [isLoading, setIsLoading] = useState(false);

  // Mock user ID for development
  const userId = 'u1';

  useEffect(() => {
    // In a real application, you would fetch people and currencies from your API
    loadPeopleAndCurrencies();
  }, [userId]);

  const loadPeopleAndCurrencies = async () => {
    try {
      setIsLoading(true);
      // In a real application, replace with API calls
      // const fetchedPeople = await peopleService.getByUserId(userId);
      // const fetchedCurrencies = await settingsService.getSupportedCurrencies();

      // For now, using mock data
      setPeople(MOCK_PEOPLE);
      setCurrencies(MOCK_CURRENCIES);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadPeopleAndCurrencies();
  };

  return (
    <div className="container px-4 py-8 mx-auto max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Debts I Owe</h1>
          <p className="text-muted-foreground mt-1">Track and manage money you owe to others</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isLoading}
          className="mt-4 md:mt-0"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar with filters */}
        <div className="md:col-span-1 space-y-6">
          <DebtsIOweFilters
            filters={filters}
            onFiltersChange={setFilters}
            people={people}
            currencies={currencies}
          />

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Pro Tip:</strong> Keeping track of what you owe helps maintain good
                relationships.
              </p>
              <p className="text-sm text-muted-foreground">
                Always settle up promptly to avoid awkward conversations.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          <DebtsIOweList userId={userId} filters={filters} onSettleComplete={handleRefresh} />
        </div>
      </div>
    </div>
  );
}
