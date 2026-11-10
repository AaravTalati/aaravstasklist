const headers = { 'Cache-Control': 'no-store' };
const json = (data, status = 200) => Response.json(data, { status, headers });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const owner = request.headers.get('oai-authenticated-user-id');
    if (!owner) return new Response('Sign-in required', { status: 401, headers });
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(html, { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (url.pathname !== '/api/tasks') return json({ error: 'Not found' }, 404);

    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, text, due, done FROM tasks WHERE owner = ? ORDER BY position'
      ).bind(owner).all();
      return json(results);
    }

    if (!['POST', 'PATCH', 'DELETE'].includes(request.method)) {
      return json({ error: 'Method not allowed' }, 405);
    }
    if (request.headers.get('Origin') !== url.origin ||
        request.headers.get('Content-Type') !== 'application/json') {
      return json({ error: 'Invalid request origin or format' }, 403);
    }
    const data = await request.json().catch(() => null);
    if (!data || typeof data.id !== 'string' || !/^[a-f0-9-]{36}$/.test(data.id)) {
      return json({ error: 'Invalid task ID' }, 400);
    }
    const { id, text, due, done } = data;
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM tasks WHERE owner = ? AND id = ?').bind(owner, id).run();
      return json({ ok: true });
    }
    if (request.method === 'PATCH' && typeof done === 'boolean') {
      await env.DB.prepare('UPDATE tasks SET done = ? WHERE owner = ? AND id = ?')
        .bind(Number(done), owner, id).run();
      return json({ ok: true });
    }
    if (typeof text !== 'string' || !text.trim() || text.length > 1000 ||
        (due !== null && (typeof due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(due)))) {
      return json({ error: 'Invalid task' }, 400);
    }
    if (request.method === 'POST') {
      await env.DB.prepare(
        'INSERT INTO tasks (owner, id, text, due) VALUES (?, ?, ?, ?) ON CONFLICT (owner, id) DO NOTHING'
      ).bind(owner, id, text.trim(), due).run();
    } else {
      await env.DB.prepare('UPDATE tasks SET text = ?, due = ? WHERE owner = ? AND id = ?')
        .bind(text.trim(), due, owner, id).run();
    }
    return json({ ok: true });
  }
};
