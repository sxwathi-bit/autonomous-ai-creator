import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/backend/database.ts';
import { EditorialEngine } from '../src/backend/editor.ts';
import { apiRouter } from '../src/backend/routes.ts';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

describe('Autonomous AI Creator API & Engine Tests', () => {
  beforeEach(async () => {
    await db.init();
  });

  it('POST /api/agent/init should validate request and initialize agent', async () => {
    const res = await request(app)
      .post('/api/agent/init')
      .send({
        persona: {
          name: 'Ada',
          domain: 'AI Security',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('agentId');
    expect(typeof res.body.agentId).toBe('string');
  });

  it('POST /api/agent/init should reject invalid request payload', async () => {
    const res = await request(app)
      .post('/api/agent/init')
      .send({
        invalidKey: 123,
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('GET /api/agent/feed should return posts array for valid agentId', async () => {
    // First initialize agent
    const initRes = await request(app)
      .post('/api/agent/init')
      .send({
        persona: {
          name: 'NOVA',
          domain: 'AI Engineering',
        },
      });

    const agentId = initRes.body.agentId;

    const res = await request(app)
      .get(`/api/agent/feed?agentId=${agentId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('posts');
    expect(Array.isArray(res.body.posts)).toBe(true);
  });

  it('EditorialEngine should reject duplicate/similar topics based on repetition similarity', () => {
    const editor = new EditorialEngine();
    const sim = editor.calculateTopicSimilarity(
      'OpenAI releases new reasoning model for agents',
      'OpenAI releases new reasoning model for autonomous agents'
    );

    expect(sim).toBeGreaterThan(0.5);
  });

  it('EditorialEngine score calculation gives distinct decision', async () => {
    const editor = new EditorialEngine();
    const persona = {
      name: 'NOVA',
      domain: 'AI Security',
      mission: 'Analyze security vulnerabilities',
      interests: ['Security'],
      editorialPrinciples: ['Substance over hype'],
      writingStyle: ['Analytic'],
    };

    const topic = {
      title: 'Zero-day vulnerability in agent framework',
      summary: 'Prompt injection flaw allows command execution',
      url: 'https://example.com/sec-advisory',
      source: 'GitHub Security',
      publishedAt: new Date().toISOString(),
    };

    const result = await editor.scoreTopic(topic, persona, [], []);
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('decision');
  });
});
