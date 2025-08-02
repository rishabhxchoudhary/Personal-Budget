describe('MSW demo', () => {
  it('intercepts GET /api/ping', async () => {
    const res = await fetch('/api/ping');
    const json = await res.json();
    expect(json).toEqual({ ok: true, message: 'pong' });
  });
});
