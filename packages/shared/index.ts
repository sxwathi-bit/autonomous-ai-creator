import { z } from 'zod';

// Zod Validation Schemas
export const InitAgentSchema = z.object({
  persona: z.object({
    name: z.string().min(1, "Name is required"),
    domain: z.string().min(1, "Domain is required"),
    mission: z.string().optional(),
    interests: z.array(z.string()).optional(),
    editorialPrinciples: z.array(z.string()).optional(),
    writingStyle: z.array(z.string()).optional(),
  }),
});

export type InitAgentInput = z.infer<typeof InitAgentSchema>;

export const FeedQuerySchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
});

// Domain Interfaces
export interface AgentPersona {
  name: string;
  domain: string;
  mission: string;
  interests: string[];
  editorialPrinciples: string[];
  writingStyle: string[];
}

export interface DiscoveredTopic {
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt?: string;
}

export interface TopicScoreResult {
  score: number;
  decision: 'accepted' | 'rejected';
  rejectionReason?: string;
  editorialAngle?: string;
}

export interface GeneratedPostContent {
  text: string;
  rationale: string;
}

export interface PostFeedItem {
  id: string;
  createdAt: string;
  text: string;
  rationale: string;
  sources: string[];
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  database: 'connected' | 'disconnected' | 'mock_mode';
  scheduler: 'running' | 'stopped';
  activeAgentId?: string;
  lastRunAt?: string;
  nextRunAt?: string;
}

// Default NOVA Persona Builder
export function createPersonaProfile(name: string, domain: string, overrides?: Partial<AgentPersona>): AgentPersona {
  const isSecurity = domain.toLowerCase().includes('security');
  const isRobotics = domain.toLowerCase().includes('robotics');
  const isOpenSource = domain.toLowerCase().includes('open source');

  return {
    name: name || "NOVA",
    domain: domain || "AI Engineering",
    mission: overrides?.mission || `Explain meaningful changes in ${domain} and identify what actually matters beneath the market hype.`,
    interests: overrides?.interests || [
      `${domain} architectures`,
      "Production deployment patterns",
      "Model benchmarks & evaluations",
      "System reliability and safety",
      "Developer tools & developer experience"
    ],
    editorialPrinciples: overrides?.editorialPrinciples || [
      "Technical substance over marketing hype",
      "Prefer primary sources and official engineering blogs",
      "Explain practical engineering implications",
      "Challenge exaggerated performance claims",
      "Avoid repeating common superficial media narratives",
      "Focus on real architectural consequences for practitioners"
    ],
    writingStyle: overrides?.writingStyle || [
      "Concise and dense with technical insight",
      "Analytic, opinionated, and slightly skeptical",
      "No fluff, clickbait, or superficial summaries",
      "Never use generic AI tropes or say 'As an AI'",
      "Include clear rationale on why this matters now"
    ]
  };
}
