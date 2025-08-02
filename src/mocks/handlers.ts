import { http, HttpResponse } from 'msw';

export const handlers = [
  // Example ping; unit tests can call fetch('/api/ping') without a real server.
  http.get('/api/ping', () => HttpResponse.json({ ok: true, message: 'pong' })),
];
