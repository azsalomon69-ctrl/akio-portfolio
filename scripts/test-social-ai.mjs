import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dataDir = mkdtempSync(path.join(tmpdir(), 'loopline-ai-test-'));
process.env.SOCIAL_DATA_DIR = dataDir;
process.env.SOCIAL_AI_ENABLED = 'true';
process.env.SOCIAL_AI_PROACTIVE = 'false';
process.env.NODE_ENV = 'test';
for (let index = 1; index <= 5; index += 1) process.env[`NVIDIA_API_KEY_${index}`] = '';

try {
  const socialModule = await import(`../api/social.mjs?test=${Date.now()}`);
  const social = socialModule.default;
  const db = new DatabaseSync(path.join(dataDir, 'social.sqlite'));

  assert.equal(db.prepare('SELECT count(*) count FROM users WHERE is_ai=1').get().count, 15);
  assert.equal(db.prepare('SELECT count(*) count FROM ai_profiles').get().count, 15);
  assert.equal(db.prepare('SELECT count(*) count FROM posts p JOIN ai_profiles a ON a.seed_post_id=p.id').get().count, 15);
  assert.equal(db.prepare('SELECT count(DISTINCT content) count FROM posts p JOIN ai_profiles a ON a.seed_post_id=p.id').get().count, 15);

  const call = async (route, { method = 'GET', token = '', payload } = {}) => {
    const request = new Request(`http://localhost/api/social${route}`, {
      method,
      headers: {
        Origin: 'http://localhost:4173',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Type': 'application/json' } : {})
      },
      body: payload ? JSON.stringify(payload) : undefined
    });
    const response = await social.fetch(request);
    const body = await response.json();
    assert.ok(response.ok, `${method} ${route}: ${body.error || response.status}`);
    return body;
  };

  const registration = await call('/register', {
    method: 'POST',
    payload: { username: 'real_tester', email: 'tester@example.com', displayName: 'Real Tester', password: 'test-password-123', avatar: 'preset:6' }
  });
  const token = registration.token;
  const ai = db.prepare('SELECT u.id,a.seed_post_id seedPostId FROM users u JOIN ai_profiles a ON a.user_id=u.id ORDER BY u.id LIMIT 1').get();

  const firstComment = await call(`/posts/${ai.seedPostId}/comments`, { method: 'POST', token, payload: { content: 'This is a real stored comment.' } });
  assert.equal(db.prepare("SELECT count(*) count FROM ai_queue WHERE event_type='comment'").get().count, 1);

  const reply = await call(`/posts/${ai.seedPostId}/comments`, {
    method: 'POST', token, payload: { content: 'This is a nested reply.', parentCommentId: firstComment.comment.id }
  });
  assert.equal(reply.comment.parentCommentId, firstComment.comment.id);

  const conversation = await call('/conversations', { method: 'POST', token, payload: { userId: ai.id } });
  await call(`/conversations/${conversation.conversation.id}/messages`, { method: 'POST', token, payload: { content: 'Hello from a real user.' } });
  assert.equal(db.prepare("SELECT count(*) count FROM ai_queue WHERE event_type='message'").get().count, 1);

  const feed = await call('/feed', { token });
  assert.equal(feed.posts.filter(post => post.isAi).length, 15);

  db.close();
  socialModule.closeSocialDatabaseForTests();
  console.log('Loopline AI seed, replies, and interaction queues verified.');
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
