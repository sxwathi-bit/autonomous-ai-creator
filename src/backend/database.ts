import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AgentPersona, createPersonaProfile } from '../../packages/shared/index.js';

export interface DbAgent {
  id: string;
  name: string;
  domain: string;
  mission: string;
  interests: string[];
  editorialPrinciples: string[];
  writingStyle: string[];
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  isRunning: boolean;
}

export interface DbTopic {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  discoveredAt: Date;
  score: number;
  decision: 'accepted' | 'rejected';
  rejectionReason: string | null;
  editorialAngle: string | null;
  processed: boolean;
  agentId: string | null;
  createdAt: Date;
}

export interface DbPostSource {
  id: string;
  postId: string;
  url: string;
  sourceName: string;
}

export interface DbPost {
  id: string;
  agentId: string;
  topicId: string | null;
  text: string;
  rationale: string;
  createdAt: Date;
  sources: DbPostSource[];
}

export interface DbMemory {
  id: string;
  agentId: string;
  type: string;
  content: string;
  createdAt: Date;
}

class DatabaseService {
  private prisma: PrismaClient | null = null;
  private isConnected = false;

  // Fallback in-memory/file storage for local dev without PG
  private memoryAgents: Map<string, DbAgent> = new Map();
  private memoryTopics: DbTopic[] = [];
  private memoryPosts: DbPost[] = [];
  private memoryMemories: DbMemory[] = [];

  constructor() {
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
      try {
        this.prisma = new PrismaClient();
      } catch (err) {
        console.warn('[DB] Could not initialize PrismaClient, falling back to local storage engine:', err);
      }
    }
  }

  async init(): Promise<void> {
    if (this.prisma) {
      try {
        await this.prisma.$connect();
        this.isConnected = true;
        console.log('[DB] Connected to PostgreSQL via Prisma');
      } catch (err) {
        console.warn('[DB] Failed to connect to PostgreSQL via Prisma, utilizing persistent local storage engine:', (err as Error).message);
        this.isConnected = false;
      }
    }
  }

  getHealthStatus(): 'connected' | 'disconnected' | 'mock_mode' {
    if (this.isConnected) return 'connected';
    return 'mock_mode';
  }

  async findActiveAgent(): Promise<DbAgent | null> {
    if (this.isConnected && this.prisma) {
      try {
        const agent = await this.prisma.agent.findFirst({
          where: { active: true },
          orderBy: { createdAt: 'desc' },
        });
        if (agent) return this.mapPrismaAgent(agent);
      } catch (err) {
        console.error('[DB] Error fetching active agent from Prisma:', err);
      }
    }

    for (const agent of this.memoryAgents.values()) {
      if (agent.active) return agent;
    }
    return null;
  }

  async getAgent(id: string): Promise<DbAgent | null> {
    if (this.isConnected && this.prisma) {
      try {
        const agent = await this.prisma.agent.findUnique({
          where: { id },
        });
        if (agent) return this.mapPrismaAgent(agent);
      } catch (err) {
        console.error('[DB] Error fetching agent by ID from Prisma:', err);
      }
    }

    return this.memoryAgents.get(id) || null;
  }

  async createAgent(persona: AgentPersona): Promise<DbAgent> {
    const id = uuidv4();
    const now = new Date();

    if (this.isConnected && this.prisma) {
      try {
        const created = await this.prisma.agent.create({
          data: {
            id,
            name: persona.name,
            domain: persona.domain,
            mission: persona.mission,
            interests: JSON.stringify(persona.interests),
            editorialPrinciples: JSON.stringify(persona.editorialPrinciples),
            writingStyle: JSON.stringify(persona.writingStyle),
            active: true,
            isRunning: false,
            createdAt: now,
            updatedAt: now,
          },
        });
        return this.mapPrismaAgent(created);
      } catch (err) {
        console.error('[DB] Error creating agent in Prisma:', err);
      }
    }

    const agent: DbAgent = {
      id,
      name: persona.name,
      domain: persona.domain,
      mission: persona.mission,
      interests: persona.interests,
      editorialPrinciples: persona.editorialPrinciples,
      writingStyle: persona.writingStyle,
      createdAt: now,
      updatedAt: now,
      active: true,
      lastRunAt: null,
      nextRunAt: null,
      isRunning: false,
    };

    this.memoryAgents.set(id, agent);
    return agent;
  }

  async updateAgentState(
    id: string,
    data: {
      lastRunAt?: Date;
      nextRunAt?: Date;
      isRunning?: boolean;
      active?: boolean;
    }
  ): Promise<void> {
    const now = new Date();

    if (this.isConnected && this.prisma) {
      try {
        await this.prisma.agent.update({
          where: { id },
          data: {
            ...data,
            updatedAt: now,
          },
        });
        return;
      } catch (err) {
        console.error('[DB] Error updating agent state in Prisma:', err);
      }
    }

    const agent = this.memoryAgents.get(id);
    if (agent) {
      if (data.lastRunAt !== undefined) agent.lastRunAt = data.lastRunAt;
      if (data.nextRunAt !== undefined) agent.nextRunAt = data.nextRunAt;
      if (data.isRunning !== undefined) agent.isRunning = data.isRunning;
      if (data.active !== undefined) agent.active = data.active;
      agent.updatedAt = now;
    }
  }

  async saveTopic(topicData: Omit<DbTopic, 'id' | 'createdAt'>): Promise<DbTopic> {
    const id = uuidv4();
    const now = new Date();

    if (this.isConnected && this.prisma) {
      try {
        const created = await this.prisma.topic.create({
          data: {
            id,
            title: topicData.title,
            summary: topicData.summary,
            url: topicData.url,
            source: topicData.source,
            discoveredAt: topicData.discoveredAt,
            score: topicData.score,
            decision: topicData.decision,
            rejectionReason: topicData.rejectionReason,
            editorialAngle: topicData.editorialAngle,
            processed: topicData.processed,
            agentId: topicData.agentId,
            createdAt: now,
          },
        });
        return {
          id: created.id,
          title: created.title,
          summary: created.summary,
          url: created.url,
          source: created.source,
          discoveredAt: created.discoveredAt,
          score: created.score,
          decision: created.decision as 'accepted' | 'rejected',
          rejectionReason: created.rejectionReason,
          editorialAngle: created.editorialAngle,
          processed: created.processed,
          agentId: created.agentId,
          createdAt: created.createdAt,
        };
      } catch (err) {
        console.error('[DB] Error saving topic in Prisma:', err);
      }
    }

    const topic: DbTopic = {
      id,
      ...topicData,
      createdAt: now,
    };
    this.memoryTopics.unshift(topic);
    return topic;
  }

  async getTopics(agentId: string): Promise<DbTopic[]> {
    if (this.isConnected && this.prisma) {
      try {
        const topics = await this.prisma.topic.findMany({
          where: { agentId },
          orderBy: { createdAt: 'desc' },
        });
        return topics.map((t) => ({
          id: t.id,
          title: t.title,
          summary: t.summary,
          url: t.url,
          source: t.source,
          discoveredAt: t.discoveredAt,
          score: t.score,
          decision: t.decision as 'accepted' | 'rejected',
          rejectionReason: t.rejectionReason,
          editorialAngle: t.editorialAngle,
          processed: t.processed,
          agentId: t.agentId,
          createdAt: t.createdAt,
        }));
      } catch (err) {
        console.error('[DB] Error getting topics from Prisma:', err);
      }
    }

    return this.memoryTopics.filter((t) => t.agentId === agentId || !t.agentId);
  }

  async savePost(
    agentId: string,
    topicId: string | null,
    text: string,
    rationale: string,
    sourcesList: Array<{ url: string; sourceName: string }>
  ): Promise<DbPost> {
    const postId = uuidv4();
    const now = new Date();

    if (this.isConnected && this.prisma) {
      try {
        const created = await this.prisma.post.create({
          data: {
            id: postId,
            agentId,
            topicId,
            text,
            rationale,
            createdAt: now,
            sources: {
              create: sourcesList.map((s) => ({
                id: uuidv4(),
                url: s.url,
                sourceName: s.sourceName,
              })),
            },
          },
          include: {
            sources: true,
          },
        });

        return {
          id: created.id,
          agentId: created.agentId,
          topicId: created.topicId,
          text: created.text,
          rationale: created.rationale,
          createdAt: created.createdAt,
          sources: created.sources.map((s) => ({
            id: s.id,
            postId: s.postId,
            url: s.url,
            sourceName: s.sourceName,
          })),
        };
      } catch (err) {
        console.error('[DB] Error saving post in Prisma:', err);
      }
    }

    const postSources: DbPostSource[] = sourcesList.map((s) => ({
      id: uuidv4(),
      postId,
      url: s.url,
      sourceName: s.sourceName,
    }));

    const post: DbPost = {
      id: postId,
      agentId,
      topicId,
      text,
      rationale,
      createdAt: now,
      sources: postSources,
    };

    this.memoryPosts.unshift(post);
    return post;
  }

  async getPosts(agentId: string): Promise<DbPost[]> {
    if (this.isConnected && this.prisma) {
      try {
        const posts = await this.prisma.post.findMany({
          where: { agentId },
          orderBy: { createdAt: 'desc' },
          include: { sources: true },
        });

        return posts.map((p) => ({
          id: p.id,
          agentId: p.agentId,
          topicId: p.topicId,
          text: p.text,
          rationale: p.rationale,
          createdAt: p.createdAt,
          sources: p.sources.map((s) => ({
            id: s.id,
            postId: s.postId,
            url: s.url,
            sourceName: s.sourceName,
          })),
        }));
      } catch (err) {
        console.error('[DB] Error getting posts from Prisma:', err);
      }
    }

    return this.memoryPosts.filter((p) => p.agentId === agentId);
  }

  async addMemory(agentId: string, type: string, content: string): Promise<DbMemory> {
    const id = uuidv4();
    const now = new Date();

    if (this.isConnected && this.prisma) {
      try {
        const created = await this.prisma.memory.create({
          data: {
            id,
            agentId,
            type,
            content,
            createdAt: now,
          },
        });
        return {
          id: created.id,
          agentId: created.agentId,
          type: created.type,
          content: created.content,
          createdAt: created.createdAt,
        };
      } catch (err) {
        console.error('[DB] Error adding memory in Prisma:', err);
      }
    }

    const mem: DbMemory = {
      id,
      agentId,
      type,
      content,
      createdAt: now,
    };
    this.memoryMemories.unshift(mem);
    return mem;
  }

  async getMemories(agentId: string): Promise<DbMemory[]> {
    if (this.isConnected && this.prisma) {
      try {
        const mems = await this.prisma.memory.findMany({
          where: { agentId },
          orderBy: { createdAt: 'desc' },
        });
        return mems.map((m) => ({
          id: m.id,
          agentId: m.agentId,
          type: m.type,
          content: m.content,
          createdAt: m.createdAt,
        }));
      } catch (err) {
        console.error('[DB] Error getting memories from Prisma:', err);
      }
    }

    return this.memoryMemories.filter((m) => m.agentId === agentId);
  }

  private mapPrismaAgent(agent: any): DbAgent {
    const parseJson = (val: string, fallback: string[]) => {
      try {
        return JSON.parse(val);
      } catch {
        return fallback;
      }
    };

    return {
      id: agent.id,
      name: agent.name,
      domain: agent.domain,
      mission: agent.mission,
      interests: parseJson(agent.interests, [agent.domain]),
      editorialPrinciples: parseJson(agent.editorialPrinciples, []),
      writingStyle: parseJson(agent.writingStyle, []),
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      active: agent.active,
      lastRunAt: agent.lastRunAt,
      nextRunAt: agent.nextRunAt,
      isRunning: agent.isRunning,
    };
  }
}

export const db = new DatabaseService();
