import { http, HttpResponse } from 'msw';

// Mock database to store transactions
let mockTransactions: Array<{
  id: string;
  amount: string;
  date: string;
  category: string;
  type: 'income' | 'expense';
  note?: string;
  createdAt: string;
}> = [
  {
    id: '1',
    amount: '1000',
    date: '2025-01-01',
    category: 'general',
    type: 'income',
    note: 'January salary',
    createdAt: '2025-01-01T10:00:00.000Z',
  },
  {
    id: '2',
    amount: '250',
    date: '2025-01-02',
    category: 'general',
    type: 'expense',
    note: 'Groceries',
    createdAt: '2025-01-02T14:30:00.000Z',
  },
  {
    id: '3',
    amount: '500',
    date: '2025-01-05',
    category: 'general',
    type: 'income',
    note: 'Freelance project',
    createdAt: '2025-01-05T09:00:00.000Z',
  },
  {
    id: '4',
    amount: '75',
    date: '2025-01-07',
    category: 'general',
    type: 'expense',
    note: 'Utilities',
    createdAt: '2025-01-07T16:45:00.000Z',
  },
  {
    id: '5',
    amount: '150',
    date: '2025-01-10',
    category: 'general',
    type: 'expense',
    note: 'Restaurant',
    createdAt: '2025-01-10T19:00:00.000Z',
  },
];

export const handlers = [
  // Example ping; unit tests can call fetch('/api/ping') without a real server.
  http.get('/api/ping', () => HttpResponse.json({ ok: true, message: 'pong' })),

  // GET transactions with filtering and pagination
  http.get('/api/transactions', ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    // Filter transactions by type
    let filteredTransactions = [...mockTransactions];
    if (type && type !== 'all') {
      filteredTransactions = filteredTransactions.filter((t) => t.type === type);
    }

    // Sort by date descending (newest first)
    filteredTransactions.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

    return HttpResponse.json({
      transactions: paginatedTransactions,
      totalCount: filteredTransactions.length,
      page,
      limit,
      totalPages: Math.ceil(filteredTransactions.length / limit),
    });
  }),

  // POST transaction API endpoint
  http.post('/api/transactions', async ({ request }) => {
    const data = (await request.json()) as Record<string, unknown>;

    // Simulate server-side validation
    if (
      !data ||
      typeof data !== 'object' ||
      !data.amount ||
      !data.date ||
      !data.category ||
      !data.type
    ) {
      return HttpResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create new transaction
    const newTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      createdAt: new Date().toISOString(),
    } as (typeof mockTransactions)[0];

    // Add to mock database
    mockTransactions.unshift(newTransaction);

    // Return successful response
    return HttpResponse.json(newTransaction, { status: 201 });
  }),
];

// Helper function to reset mock data (useful for tests)
export const resetMockTransactions = () => {
  mockTransactions = [
    {
      id: '1',
      amount: '1000',
      date: '2025-01-01',
      category: 'general',
      type: 'income',
      note: 'January salary',
      createdAt: '2025-01-01T10:00:00.000Z',
    },
    {
      id: '2',
      amount: '250',
      date: '2025-01-02',
      category: 'general',
      type: 'expense',
      note: 'Groceries',
      createdAt: '2025-01-02T14:30:00.000Z',
    },
    {
      id: '3',
      amount: '500',
      date: '2025-01-05',
      category: 'general',
      type: 'income',
      note: 'Freelance project',
      createdAt: '2025-01-05T09:00:00.000Z',
    },
    {
      id: '4',
      amount: '75',
      date: '2025-01-07',
      category: 'general',
      type: 'expense',
      note: 'Utilities',
      createdAt: '2025-01-07T16:45:00.000Z',
    },
    {
      id: '5',
      amount: '150',
      date: '2025-01-10',
      category: 'general',
      type: 'expense',
      note: 'Restaurant',
      createdAt: '2025-01-10T19:00:00.000Z',
    },
  ];
};
