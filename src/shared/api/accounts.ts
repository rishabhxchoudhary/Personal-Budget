import { Account, AccountType } from '@/shared/types/common';

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  balanceMinor: number;
  currency: string;
  isActive?: boolean;
  institution?: string;
  lastFour?: string;
}

export interface UpdateAccountRequest {
  name?: string;
  type?: AccountType;
  balanceMinor?: number;
  currency?: string;
  isActive?: boolean;
  institution?: string;
  lastFour?: string;
}

class AccountsApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'AccountsApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new AccountsApiError(
      errorData.error || `Request failed with status ${response.status}`,
      response.status
    );
  }
  return response.json();
}

export async function createAccount(data: CreateAccountRequest): Promise<Account> {
  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Account>(response);
}

export async function getAccounts(): Promise<Account[]> {
  const response = await fetch('/api/accounts', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result = await handleResponse<{ data: Account[] }>(response);
  return result.data;
}

export async function getAccount(accountId: string): Promise<Account> {
  const response = await fetch(`/api/accounts/${accountId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return handleResponse<Account>(response);
}

export async function updateAccount(accountId: string, data: UpdateAccountRequest): Promise<Account> {
  const response = await fetch(`/api/accounts/${accountId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Account>(response);
}

export async function deleteAccount(accountId: string): Promise<void> {
  const response = await fetch(`/api/accounts/${accountId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new AccountsApiError(
      errorData.error || `Request failed with status ${response.status}`,
      response.status
    );
  }
}
