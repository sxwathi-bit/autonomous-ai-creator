import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { AgentPersona, DiscoveredTopic, GeneratedPostContent } from '../../packages/shared/index.js';
import { DbMemory, DbPost } from './database.js';

export class PostWriterEngine {
  private openai?: OpenAI;
  private gemini?: GoogleGenAI;

  constructor() {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && openaiKey.trim().length > 0) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim().length > 0) {
      this.gemini = new GoogleGenAI({ apiKey: geminiKey });
    }
  }

  async generatePost(
    topic: DiscoveredTopic,
    persona: AgentPersona,
    editorialAngle: string,
    competingTopicsCount: number,
    recentPosts: DbPost[],
    memories: DbMemory[]
  ): Promise<GeneratedPostContent> {
    const systemPrompt = `You are ${persona.name}, an autonomous AI analyst and creator in ${persona.domain}.
Mission: ${persona.mission}
Editorial Principles:
${persona.editorialPrinciples.map((p) => `- ${p}`).join('\n')}
Writing Style:
${persona.writingStyle.map((s) => `- ${s}`).join('\n')}

Topic Selected:
Title: ${topic.title}
Summary: ${topic.summary}
Source: ${topic.source} (${topic.url})
Angle: ${editorialAngle}
Competing Candidates Rejected: ${competingTopicsCount}

Task: Write an original, high-substance technical post (approx. 500 - 900 characters) and provide a publishing rationale.

Requirements:
1. Write in active, opinionated analyst voice. Do NOT say "As an AI" or mention prompts.
2. Focus on engineering consequences, trade-offs, and practical implications.
3. Keep rationale detailed: explain why this topic was chosen now over competing candidates.

Return STRICT JSON format:
{
  "text": "The full post body...",
  "rationale": "Selected because..."
}`;

    if (this.openai || this.gemini) {
      try {
        let jsonStr = '';

        if (this.openai) {
          const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: systemPrompt }],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          });
          jsonStr = completion.choices[0]?.message?.content || '';
        } else if (this.gemini) {
          const response = await this.gemini.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: systemPrompt,
            config: { responseMimeType: 'application/json' },
          });
          jsonStr = response.text || '';
        }

        if (jsonStr) {
          const parsed = JSON.parse(jsonStr);
          if (parsed.text && parsed.rationale) {
            return {
              text: parsed.text.trim(),
              rationale: parsed.rationale.trim(),
            };
          }
        }
      } catch (err) {
        const errMsg = (err as Error).message || String(err);
        const cleanMsg = errMsg.includes('Quota exceeded') || errMsg.includes('429')
          ? 'API rate limit exceeded, using analytical template engine.'
          : errMsg.length > 120 ? errMsg.slice(0, 120) + '...' : errMsg;
        console.warn(`[WRITER] AI API post generation error: ${cleanMsg}`);
      }
    }

    // High-substance analytical fallback template when API keys are not provided
    const text = `The recent development "${topic.title}" marks a critical shift in ${persona.domain}. Beyond the surface headlines, the core engineering consequence lies in how system boundary constraints and latency trade-offs are handled in production. Rather than adopting unverified claims, practitioners should evaluate this against real benchmark workloads. The primary bottleneck is shifting from raw parameter capacity to execution reliability and verification overhead.`;

    const rationale = `Selected because this development directly impacts production architecture in ${persona.domain} rather than offering purely superficial benchmark hype. It is relevant now due to recent primary source activity (${topic.source}). It was selected over ${competingTopicsCount} competing candidates because it provided a concrete, actionable technical angle with high audience value.`;

    return { text, rationale };
  }
}
