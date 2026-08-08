import { createPersonaProfile } from '../../packages/shared/index.js';
import { db, DbAgent } from './database.js';
import { TopicDiscoveryService } from './discovery.js';
import { EditorialEngine } from './editor.ts';
import { PostWriterEngine } from './writer.ts';

export class AutonomousWorker {
  private discoveryService: TopicDiscoveryService;
  private editorialEngine: EditorialEngine;
  private writerEngine: PostWriterEngine;

  constructor() {
    this.discoveryService = new TopicDiscoveryService();
    this.editorialEngine = new EditorialEngine();
    this.writerEngine = new PostWriterEngine();
  }

  // Calculate next run time based on DEV_MODE or Production Settings
  public calculateNextRunTime(): Date {
    const isDev = process.env.DEV_MODE === 'true' || process.env.NODE_ENV !== 'production';

    let minMs: number;
    let maxMs: number;

    if (isDev) {
      const minSec = parseInt(process.env.DEV_MIN_INTERVAL_SECONDS || '30', 10);
      const maxSec = parseInt(process.env.DEV_MAX_INTERVAL_SECONDS || '90', 10);
      minMs = minSec * 1000;
      maxMs = maxSec * 1000;
    } else {
      const minMin = parseInt(process.env.MIN_PUBLISH_INTERVAL_MINUTES || '180', 10);
      const maxMin = parseInt(process.env.MAX_PUBLISH_INTERVAL_MINUTES || '420', 10);
      minMs = minMin * 60 * 1000;
      maxMs = maxMin * 60 * 1000;
    }

    const randomMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    const nextDate = new Date(Date.now() + randomMs);

    console.log(`[SCHEDULER] Calculated next run time: ${nextDate.toISOString()} (${Math.round(randomMs / 1000)}s from now)`);
    return nextDate;
  }

  // Core Autonomous Research & Publishing Cycle
  public async runAutonomousCycle(agentId: string): Promise<void> {
    console.log(`[AUTONOMOUS] Starting cycle for agent: ${agentId}`);

    const agent = await db.getAgent(agentId);
    if (!agent) {
      console.error(`[AUTONOMOUS] Agent ${agentId} not found in DB`);
      return;
    }

    if (!agent.active) {
      console.log(`[AUTONOMOUS] Agent ${agentId} is not active. Skipping.`);
      return;
    }

    if (agent.isRunning) {
      console.log(`[AUTONOMOUS] Agent ${agentId} is already running another cycle. Skipping lock.`);
      return;
    }

    // Acquire lock
    await db.updateAgentState(agentId, { isRunning: true });

    try {
      const persona = createPersonaProfile(agent.name, agent.domain, {
        mission: agent.mission,
        interests: agent.interests,
        editorialPrinciples: agent.editorialPrinciples,
        writingStyle: agent.writingStyle,
      });

      // 1. Load Agent Memory and Previous Posts
      const previousPosts = await db.getPosts(agentId);
      const memories = await db.getMemories(agentId);

      // 2. Discover Live Topics
      console.log(`[DISCOVERY] Searching live sources for domain "${agent.domain}"...`);
      const candidates = await this.discoveryService.fetchTopics(agent.domain);
      console.log(`[DISCOVERY] Found ${candidates.length} candidates`);

      if (candidates.length === 0) {
        console.warn('[AUTONOMOUS] No candidate topics discovered in this cycle.');
        await this.finishCycle(agentId);
        return;
      }

      // 3. Editorial Scoring & Rejection Filtering
      let bestCandidate: { topic: any; scoreResult: any } | null = null;
      let highestScore = -1;
      let rejectedCount = 0;

      for (const candidate of candidates) {
        const scoreResult = await this.editorialEngine.scoreTopic(
          candidate,
          persona,
          previousPosts,
          memories
        );

        // Save topic scoring decision to persistent DB
        await db.saveTopic({
          title: candidate.title,
          summary: candidate.summary,
          url: candidate.url,
          source: candidate.source,
          discoveredAt: new Date(candidate.publishedAt || Date.now()),
          score: scoreResult.score,
          decision: scoreResult.decision,
          rejectionReason: scoreResult.rejectionReason || null,
          editorialAngle: scoreResult.editorialAngle || null,
          processed: true,
          agentId,
        });

        if (scoreResult.decision === 'rejected') {
          rejectedCount++;
          console.log(`[EDITOR] Topic "${candidate.title.slice(0, 40)}..." Score: ${scoreResult.score} -> REJECT (${scoreResult.rejectionReason})`);
          await db.addMemory(
            agentId,
            'rejected_topic',
            `Rejected "${candidate.title}" (Score ${scoreResult.score}): ${scoreResult.rejectionReason}`
          );
        } else {
          console.log(`[EDITOR] Topic "${candidate.title.slice(0, 40)}..." Score: ${scoreResult.score} -> ACCEPT (${scoreResult.editorialAngle})`);
          if (scoreResult.score > highestScore) {
            highestScore = scoreResult.score;
            bestCandidate = { topic: candidate, scoreResult };
          }
        }
      }

      // 4. Handle Case where no topic passed threshold
      if (!bestCandidate) {
        console.log(`[EDITOR] All ${candidates.length} discovered candidates were rejected. Skipping post generation.`);
        await this.finishCycle(agentId);
        return;
      }

      // 5. Generate Post for Top Scoring Candidate
      const selected = bestCandidate.topic;
      const editorialAngle = bestCandidate.scoreResult.editorialAngle || 'Technical analysis';

      console.log(`[WRITER] Generating post for top candidate: "${selected.title}"`);
      const generated = await this.writerEngine.generatePost(
        selected,
        persona,
        editorialAngle,
        rejectedCount,
        previousPosts,
        memories
      );

      // 6. Save Published Post & Sources to DB
      const post = await db.savePost(
        agentId,
        null,
        generated.text,
        generated.rationale,
        [{ url: selected.url, sourceName: selected.source }]
      );

      // 7. Update Agent Memories
      await db.addMemory(agentId, 'published_topic', selected.title);
      await db.addMemory(agentId, 'published_angle', editorialAngle);

      console.log(`[PUBLISH] Successfully published post ${post.id}`);
    } catch (err) {
      console.error('[AUTONOMOUS] Error during cycle execution:', err);
    } finally {
      await this.finishCycle(agentId);
    }
  }

  private async finishCycle(agentId: string): Promise<void> {
    const nextRunAt = this.calculateNextRunTime();
    await db.updateAgentState(agentId, {
      lastRunAt: new Date(),
      nextRunAt,
      isRunning: false,
    });
    console.log(`[AUTONOMOUS] Cycle completed for agent ${agentId}. Next run scheduled for ${nextRunAt.toISOString()}`);
  }
}

// Global Singleton Worker and Persistent Scheduler Manager
export const autonomousWorker = new AutonomousWorker();

let schedulerIntervalHandle: NodeJS.Timeout | null = null;

export function startAutonomousScheduler(): void {
  if (schedulerIntervalHandle) return;

  console.log('[SCHEDULER] Initializing persistent autonomous background scheduler loop...');

  // Periodic Scheduler Loop: checks DB every 10 seconds for agents due for run
  schedulerIntervalHandle = setInterval(async () => {
    try {
      const activeAgent = await db.findActiveAgent();
      if (!activeAgent || !activeAgent.active) return;

      const now = new Date();
      if (!activeAgent.isRunning) {
        if (!activeAgent.nextRunAt || activeAgent.nextRunAt <= now) {
          console.log(`[SCHEDULER] Agent ${activeAgent.id} is due for autonomous run (nextRunAt: ${activeAgent.nextRunAt?.toISOString() || 'immediate'})`);
          // Trigger run asynchronously
          autonomousWorker.runAutonomousCycle(activeAgent.id).catch((err) => {
            console.error('[SCHEDULER] Unhandled error in cycle:', err);
          });
        }
      }
    } catch (err) {
      console.error('[SCHEDULER] Scheduler loop error:', err);
    }
  }, 10000);

  // Trigger initial immediate check on process boot for restart recovery
  setTimeout(async () => {
    try {
      const activeAgent = await db.findActiveAgent();
      if (activeAgent && activeAgent.active && !activeAgent.isRunning) {
        console.log(`[SCHEDULER] Process start recovery check for agent ${activeAgent.id}`);
        const now = new Date();
        if (!activeAgent.nextRunAt || activeAgent.nextRunAt <= now) {
          autonomousWorker.runAutonomousCycle(activeAgent.id).catch((err) => {
            console.error('[SCHEDULER] Error in startup recovery cycle:', err);
          });
        }
      }
    } catch (err) {
      console.error('[SCHEDULER] Startup check error:', err);
    }
  }, 1500);
}
