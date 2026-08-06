import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { Commit } from './gitAnalyzer';

// The user can override the OpenAI Base URL to use their AegisProxy (http://localhost:8080/v1)
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-if-using-proxy',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

export interface EraSummary {
  startCommit: string;
  endCommit: string;
  title: string;
  description: string;
}

export async function summarizeCommits(commits: Commit[]): Promise<EraSummary> {
  const prompt = `
You are a senior software architect analyzing the git history of a repository.
Below is a batch of commits. Summarize this era of development.
Provide a short, catchy title for this era, and a 2-3 sentence description of the major architectural changes or features added.

Commits:
${commits.map(c => `- ${c.hash.substring(0, 7)}: ${c.message}`).join('\n')}
`;

  try {
    const { text } = await generateText({
      model: openai('gpt-4o'),
      prompt,
      system: 'You are an expert developer analyzing codebase evolution. Keep responses concise and focused on architecture and features.',
    });

    return {
      startCommit: commits[0].hash,
      endCommit: commits[commits.length - 1].hash,
      title: 'Development Era', // We could parse this from LLM output if we used structured output
      description: text,
    };
  } catch (error) {
    console.error('AI generation failed, fallback to generic summary.', error);
    return {
      startCommit: commits[0].hash,
      endCommit: commits[commits.length - 1].hash,
      title: 'Development Iteration',
      description: `A batch of ${commits.length} commits were made during this period.`,
    };
  }
}
