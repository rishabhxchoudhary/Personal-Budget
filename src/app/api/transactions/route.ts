import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';

// Mock database for transactions (in production, this would be DynamoDB)
let transactions: Array<{
  id: string;
  amount: string;
  date: string;
  category: string;
  type: 'income' | 'expense';
  note?: string;
  userId: string;
  createdAt: string;
}> = [];

// Transaction validation schema
const createTransactionSchema = z.object({
  amount: z.string().min(1),
  date: z.string().min(1),
  category: z.string().min(1),
  type: z.enum(['income', 'expense']),
  note: z.string().optional(),
  userId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Please sign in to view your transactions' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const userId = searchParams.get('userId') || session.user.id;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Ensure user can only access their own transactions
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Filter transactions by userId and type
    let filteredTransactions = transactions.filter((t) => t.userId === userId);

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

    return NextResponse.json({
      transactions: paginatedTransactions,
      totalCount: filteredTransactions.length,
      page,
      limit,
      totalPages: Math.ceil(filteredTransactions.length / limit),
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Please sign in to add transactions' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate request data
    const validationResult = createTransactionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Ensure userId matches authenticated user
    if (data.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Create new transaction
    const newTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      amount: data.amount,
      date: data.date,
      category: data.category,
      type: data.type,
      note: data.note,
      userId: data.userId,
      createdAt: new Date().toISOString(),
    };

    // Add to mock database (in production, save to DynamoDB)
    transactions.unshift(newTransaction);

    // Return successful response
    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to reset transactions (for testing)
export function resetTransactions() {
  transactions = [];
}

// Initialize with some sample data for development
if (process.env.NODE_ENV === 'development') {
  transactions = [
    {
      id: '1',
      amount: '1000',
      date: '2025-01-01',
      category: 'general',
      type: 'income',
      note: 'January salary',
      userId: 'dev-user-id',
      createdAt: '2025-01-01T10:00:00.000Z',
    },
    {
      id: '2',
      amount: '250',
      date: '2025-01-02',
      category: 'general',
      type: 'expense',
      note: 'Groceries',
      userId: 'dev-user-id',
      createdAt: '2025-01-02T14:30:00.000Z',
    },
  ];
}
