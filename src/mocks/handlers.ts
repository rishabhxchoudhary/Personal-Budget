import { http, HttpResponse } from 'msw';

export const handlers = [
  // Example ping; unit tests can call fetch('/api/ping') without a real server.
  http.get('/api/ping', () => HttpResponse.json({ ok: true, message: 'pong' })),

  // Transaction API endpoint
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

    // Return successful response with generated ID and timestamp
    return HttpResponse.json(
      {
        id: Math.random().toString(36).substr(2, 9),
        ...data,
        createdAt: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),
];
