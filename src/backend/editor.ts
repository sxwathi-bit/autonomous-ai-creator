import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { AgentPersona, DiscoveredTopic, TopicScoreResult } from '../../packages/shared/index.js';
import { DbMemory, DbPost } from './database.js';

export class EditorialEngine {
  private openai?: OpenAI;
  private gemini?: GoogleGenAI;
  private threshold: number;

  constructor() {
    this.threshold = parseInt(process.env.EDITORIAL_THRESHOLD || '65', 10);

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && openaiKey.trim().length > 0) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim().length > 0) {
      this.gemini = new GoogleGenAI({ apiKey: geminiKey });
    }
  }

  // Calculate similarity between 0.0 and 1.0 using Jaccard token overlap
  public calculateTopicSimilarity(text1: string, text2: string): number {
    const tokenize = (str: string) => {
      return new Set(
        str
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter((word) => word.length > 3)
      );
    };

    const set1 = tokenize(text1);
    const set2 = tokenize(text2);

    if (set1.size === 0 || set2.size === 0) return 0;

    let intersectionCount = 0;
    for (const item of set1) {
      if (set2.has(item)) intersectionCount++;
    }

    const unionSize = new Set([...set1, ...set2]).size;
    return unionSize === 0 ? 0 : intersectionCount / unionSize;
  }

  // Evaluate candidate topic against persona principles, history, and similarity
  async scoreTopic(
    topic: DiscoveredTopic,
    persona: AgentPersona,
    previousPosts: DbPost[],
    memories: DbMemory[]
  ): Promise<TopicScoreResult> {
    const titleLower = topic.title.toLowerCase();
    const summaryLower = topic.summary.toLowerCase();
    const domainLower = persona.domain.toLowerCase();

    // 1. Repetition Check against previous posts & memories
    for (const post of previousPosts.slice(0, 15)) {
      const sim = this.calculateTopicSimilarity(topic.title + ' ' + topic.summary, post.text);
      if (sim > 0.45) {
        return {
          score: Math.floor(sim * 100),
          decision: 'rejected',
          rejectionReason: 'Too similar to a previously published post in agent memory.',
          editorialAngle: 'Duplicate perspective',
        };
      }
    }

    for (const mem of memories.filter((m) => m.type === 'published_topic').slice(0, 15)) {
      const sim = this.calculateTopicSimilarity(topic.title, mem.content);
      if (sim > 0.5) {
        return {
          score: Math.floor(sim * 100),
          decision: 'rejected',
          rejectionReason: 'Topic already covered in recent publishing cycle.',
          editorialAngle: 'Redundant news story',
        };
      }
    }

    // 2. Rule-Based Base Heuristic Scoring
    let score = 0;
    const feedback: string[] = [];

    // Relevance (0-20)
    const domainWords = domainLower.split(' ').filter((w) => w.length > 2);
    const isDomainMatch = domainWords.some((w) => titleLower.includes(w) || summaryLower.includes(w));
    if (isDomainMatch) {
      score += 20;
    } else if (titleLower.includes('ai') || titleLower.includes('model') || summaryLower.includes('agent')) {
      score += 14;
    } else {
      score += 5;
      feedback.push('Low direct alignment with agent domain.');
    }

    // Technical Significance (0-20)
    const techKeywords = ['architecture', 'benchmark', 'framework', 'vulnerability', 'latency', 'inference', 'security', 'paper', 'eval', 'scale', 'compiler', 'gpu', 'memory'];
    const techHits = techKeywords.filter((k) => titleLower.includes(k) || summaryLower.includes(k)).length;
    score += Math.min(20, techHits * 6 + 6);

    // Recency (0-15)
    score += 15; // fresh discovery cycle

    // Source Credibility (0-10)
    const highCredSources = ['arxiv', 'github', 'openai', 'anthropic', 'google', 'mit', 'huggingface', 'engineering'];
    if (highCredSources.some((s) => topic.source.toLowerCase().includes(s) || topic.url.toLowerCase().includes(s))) {
      score += 10;
    } else {
      score += 6;
    }

    // Audience Value & Originality (0-25)
    if (titleLower.includes('announcing') || titleLower.includes('introducing') || titleLower.includes('vulnerability') || titleLower.includes('release') || titleLower.includes('guide')) {
      score += 20;
    } else {
      score += 12;
    }

    // Hype / Low Quality Penalty (-15)
    const hypeKeywords = ['revolutionize', 'game changer', 'blow your mind', 'will replace all', 'secret trick', 'shocking'];
    if (hypeKeywords.some((h) => titleLower.includes(h) || summaryLower.includes(h))) {
      score -= 15;
      feedback.push('Contains sensational hype phrases violating editorial principles.');
    }

    // If LLM available and topic passes basic heuristic threshold (score >= 30), enhance score using structured reasoning
    if ((this.openai || this.gemini) && score >= 30) {
      try {
        const prompt = `You are the chief editor for "${persona.name}", an AI creator covering "${persona.domain}".
Mission: ${persona.mission}
Editorial Principles: ${persona.editorialPrinciples.join(', ')}

Evaluate this candidate topic for an original post:
Title: ${topic.title}
Summary: ${topic.summary}
Source: ${topic.source}

Base Heuristic Score: ${score}/100. Threshold needed: ${this.threshold}.

Respond in strict JSON:
{
  "score": number (0 to 100),
  "decision": "accepted" or "rejected",
  "rejectionReason": string or null,
  "editorialAngle": string (proposed angle if accepted, or flaw if rejected)
}`;

        let jsonText = '';
        if (this.openai) {
          const res = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          });
          jsonText = res.choices[0]?.message?.content || '';
        } else if (this.gemini) {
          const res = await this.gemini.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' },
          });
          jsonText = res.text || '';
        }

        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          const finalScore = typeof parsed.score === 'number' ? parsed.score : score;
          const decision = finalScore >= this.threshold ? 'accepted' : 'rejected';
          return {
            score: finalScore,
            decision,
            rejectionReason: decision === 'rejected' ? parsed.rejectionReason || feedback.join(' ') || 'Insufficient technical depth or alignment.' : undefined,
            editorialAngle: parsed.editorialAngle || 'Technical analysis',
          };
        }
      } catch (aiErr) {
        const errMsg = (aiErr as Error).message || String(aiErr);
        const cleanMsg = errMsg.includes('Quota exceeded') || errMsg.includes('429')
          ? 'API rate limit exceeded, using heuristic score.'
          : errMsg.length > 120 ? errMsg.slice(0, 120) + '...' : errMsg;
        console.warn(`[EDITOR] LLM scoring fallback to heuristic scoring: ${cleanMsg}`);
      }
    }

    // Default Heuristic Threshold Evaluation
    const decision = score >= this.threshold ? 'accepted' : 'rejected';
    return {
      score,
      decision,
      rejectionReason: decision === 'rejected' ? feedback.join(' ') || 'Topic score fell below editorial threshold.' : undefined,
      editorialAngle: decision === 'accepted' ? 'Analytical technical breakdown' : undefined,
    };
  }
}
