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
  userId: string;
}> = [
  {
    id: '1',
    amount: '1000',
    date: '2025-01-01',
    category: 'general',
    type: 'income',
    note: 'January salary',
    createdAt: '2025-01-01T10:00:00.000Z',
    userId: 'test-user-id',
  },
  {
    id: '2',
    amount: '250',
    date: '2025-01-02',
    category: 'general',
    type: 'expense',
    note: 'Groceries',
    createdAt: '2025-01-02T14:30:00.000Z',
    userId: 'test-user-id',
  },
  {
    id: '3',
    amount: '500',
    date: '2025-01-05',
    category: 'general',
    type: 'income',
    note: 'Freelance project',
    createdAt: '2025-01-05T09:00:00.000Z',
    userId: 'test-user-id',
  },
  {
    id: '4',
    amount: '75',
    date: '2025-01-07',
    category: 'general',
    type: 'expense',
    note: 'Utilities',
    createdAt: '2025-01-07T16:45:00.000Z',
    userId: 'test-user-id',
  },
  {
    id: '5',
    amount: '150',
    date: '2025-01-10',
    category: 'general',
    type: 'expense',
    note: 'Restaurant',
    createdAt: '2025-01-10T19:00:00.000Z',
    userId: 'test-user-id',
  },
];

// Mock auth session for testing
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
  },
};

// Helper to check if request is authenticated (mock implementation)
function isAuthenticated(request: Request): boolean {
  // In tests, we'll consider all requests authenticated unless explicitly testing auth
  // You can modify this to check for specific headers or cookies if needed
  const authHeader = request.headers.get('authorization');
  const cookie = request.headers.get('cookie');

  // For testing purposes, we'll consider requests authenticated if they have credentials
  return request.credentials === 'include' || !!authHeader || !!cookie;
}

export const handlers = [
  // Example ping; unit tests can call fetch('/api/ping') without a real server.
  http.get('/api/ping', () => HttpResponse.json({ ok: true, message: 'pong' })),

  // GET transactions with filtering, pagination, and auth
  http.get('/api/transactions', ({ request }) => {
    // Check authentication
    if (!isAuthenticated(request)) {
      return HttpResponse.json(
        { error: 'Please sign in to view your transactions' },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || mockSession.user.id;
    const type = url.searchParams.get('type');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    // Filter transactions by userId and type
    let filteredTransactions = mockTransactions.filter((t) => t.userId === userId);

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

  // POST transaction API endpoint with auth
  http.post('/api/transactions', async ({ request }) => {
    // Check authentication
    if (!isAuthenticated(request)) {
      return HttpResponse.json({ error: 'Please sign in to add transactions' }, { status: 401 });
    }

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

    // Extract userId from request body or use mock session
    const userId = (data.userId as string) || mockSession.user.id;

    // Create new transaction
    const newTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      amount: data.amount as string,
      date: data.date as string,
      category: data.category as string,
      type: data.type as 'income' | 'expense',
      note: (data.note as string) || undefined,
      userId,
      createdAt: new Date().toISOString(),
    };

    // Add to mock database
    mockTransactions.unshift(newTransaction);

    // Return successful response
    return HttpResponse.json(newTransaction, { status: 201 });
  }),

  // Mock auth endpoints for testing
  http.get('/api/auth/session', ({ request }) => {
    if (isAuthenticated(request)) {
      return HttpResponse.json(mockSession);
    }
    return HttpResponse.json(null);
  }),

  http.post('/api/auth/signout', () => {
    return HttpResponse.json({ success: true });
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
      userId: 'test-user-id',
    },
    {
      id: '2',
      amount: '250',
      date: '2025-01-02',
      category: 'general',
      type: 'expense',
      note: 'Groceries',
      createdAt: '2025-01-02T14:30:00.000Z',
      userId: 'test-user-id',
    },
    {
      id: '3',
      amount: '500',
      date: '2025-01-05',
      category: 'general',
      type: 'income',
      note: 'Freelance project',
      createdAt: '2025-01-05T09:00:00.000Z',
      userId: 'test-user-id',
    },
    {
      id: '4',
      amount: '75',
      date: '2025-01-07',
      category: 'general',
      type: 'expense',
      note: 'Utilities',
      createdAt: '2025-01-07T16:45:00.000Z',
      userId: 'test-user-id',
    },
    {
      id: '5',
      amount: '150',
      date: '2025-01-10',
      category: 'general',
      type: 'expense',
      note: 'Restaurant',
      createdAt: '2025-01-10T19:00:00.000Z',
      userId: 'test-user-id',
    },
  ];
};
