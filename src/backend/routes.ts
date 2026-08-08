import { Router } from 'express';
import { createPersonaProfile, FeedQuerySchema, InitAgentSchema } from '../../packages/shared/index.js';
import { autonomousWorker } from './autonomous.ts';
import { db } from './database.ts';

export const apiRouter = Router();

// 1. EVALUATOR ENDPOINT: POST /api/agent/init
apiRouter.post('/agent/init', async (req, res) => {
  try {
    const parseResult = InitAgentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid initialization request',
        details: parseResult.error.flatten(),
      });
    }

    const { persona } = parseResult.data;
    const profile = createPersonaProfile(persona.name, persona.domain, {
      mission: persona.mission,
      interests: persona.interests,
      editorialPrinciples: persona.editorialPrinciples,
      writingStyle: persona.writingStyle,
    });

    // Check duplicate initialization protection
    let existingAgent = await db.findActiveAgent();

    let agentId: string;

    if (existingAgent) {
      console.log(`[API] Re-using active agent ${existingAgent.id} for init request (${persona.name} / ${persona.domain})`);
      agentId = existingAgent.id;
    } else {
      console.log(`[API] Creating new autonomous agent for ${profile.name} (${profile.domain})`);
      const newAgent = await db.createAgent(profile);
      agentId = newAgent.id;
    }

    // Immediately trigger asynchronous autonomous research cycle in background
    setImmediate(() => {
      autonomousWorker.runAutonomousCycle(agentId).catch((err) => {
        console.error('[API] Background autonomous cycle error:', err);
      });
    });

    // Return agentId immediately with 201 Created
    return res.status(201).json({ agentId });
  } catch (err) {
    console.error('[API] Error in /api/agent/init:', err);
    return res.status(500).json({ error: 'Failed to initialize agent' });
  }
});

// 2. EVALUATOR ENDPOINT: GET /api/agent/feed
apiRouter.get('/agent/feed', async (req, res) => {
  try {
    const parseResult = FeedQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Missing or invalid agentId query parameter',
        details: parseResult.error.flatten(),
      });
    }

    const { agentId } = parseResult.data;
    const posts = await db.getPosts(agentId);

    const formattedPosts = posts.map((post) => ({
      id: post.id,
      createdAt: post.createdAt.toISOString(),
      text: post.text,
      rationale: post.rationale,
      sources: post.sources.map((s) => s.url),
    }));

    return res.status(200).json({ posts: formattedPosts });
  } catch (err) {
    console.error('[API] Error in /api/agent/feed:', err);
    return res.status(500).json({ posts: [] });
  }
});

// 3. DASHBOARD METRICS & STATUS ENDPOINT
apiRouter.get('/agent/status', async (req, res) => {
  try {
    const agentId = (req.query.agentId as string) || '';
    let agent = agentId ? await db.getAgent(agentId) : await db.findActiveAgent();

    if (!agent) {
      // Auto-bootstrap default NOVA agent if none exists yet
      const profile = createPersonaProfile('NOVA', 'AI Engineering');
      agent = await db.createAgent(profile);
    }

    const posts = await db.getPosts(agent.id);
    const topics = await db.getTopics(agent.id);
    const memories = await db.getMemories(agent.id);

    const acceptedTopics = topics.filter((t) => t.decision === 'accepted');
    const rejectedTopics = topics.filter((t) => t.decision === 'rejected');

    return res.status(200).json({
      agent: {
        id: agent.id,
        name: agent.name,
        domain: agent.domain,
        mission: agent.mission,
        interests: agent.interests,
        editorialPrinciples: agent.editorialPrinciples,
        writingStyle: agent.writingStyle,
        active: agent.active,
        lastRunAt: agent.lastRunAt ? agent.lastRunAt.toISOString() : null,
        nextRunAt: agent.nextRunAt ? agent.nextRunAt.toISOString() : null,
        isRunning: agent.isRunning,
      },
      stats: {
        totalPosts: posts.length,
        totalTopicsDiscovered: topics.length,
        acceptedTopics: acceptedTopics.length,
        rejectedTopics: rejectedTopics.length,
        totalMemories: memories.length,
      },
    });
  } catch (err) {
    console.error('[API] Error in /api/agent/status:', err);
    return res.status(500).json({ error: 'Failed to fetch agent status' });
  }
});

// 4. EDITORIAL ACTIVITY ENDPOINT FOR DASHBOARD
apiRouter.get('/agent/editorial', async (req, res) => {
  try {
    const agentId = (req.query.agentId as string) || '';
    const agent = agentId ? await db.getAgent(agentId) : await db.findActiveAgent();

    if (!agent) return res.status(200).json({ topics: [] });

    const topics = await db.getTopics(agent.id);
    return res.status(200).json({
      topics: topics.map((t) => ({
        id: t.id,
        title: t.title,
        summary: t.summary,
        url: t.url,
        source: t.source,
        score: t.score,
        decision: t.decision,
        rejectionReason: t.rejectionReason,
        editorialAngle: t.editorialAngle,
        discoveredAt: t.discoveredAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[API] Error in /api/agent/editorial:', err);
    return res.status(500).json({ topics: [] });
  }
});

// 5. MEMORY ENDPOINT FOR DASHBOARD
apiRouter.get('/agent/memory', async (req, res) => {
  try {
    const agentId = (req.query.agentId as string) || '';
    const agent = agentId ? await db.getAgent(agentId) : await db.findActiveAgent();

    if (!agent) return res.status(200).json({ memories: [] });

    const memories = await db.getMemories(agent.id);
    return res.status(200).json({
      memories: memories.map((m) => ({
        id: m.id,
        type: m.type,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[API] Error in /api/agent/memory:', err);
    return res.status(500).json({ memories: [] });
  }
});

// 6. MANUAL TRIGGER ENDPOINT FOR DEBUGGING
apiRouter.post('/agent/trigger', async (req, res) => {
  try {
    const agent = await db.findActiveAgent();
    if (!agent) {
      return res.status(404).json({ error: 'No active agent found' });
    }

    autonomousWorker.runAutonomousCycle(agent.id).catch((err) => {
      console.error('[API] Trigger error:', err);
    });

    return res.status(200).json({ message: 'Autonomous research cycle triggered successfully', agentId: agent.id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to trigger cycle' });
  }
});
