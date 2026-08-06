import { useState, useRef, useCallback } from 'react';
import { CreateMLCEngine, InitProgressReport, MLCEngine } from '@mlc-ai/web-llm';

export function useWebLLM() {
  const [engine, setEngine] = useState<MLCEngine | null>(null);
  const [progressText, setProgressText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const engineRef = useRef<MLCEngine | null>(null);

  const initEngine = useCallback(async () => {
    if (engineRef.current) return engineRef.current;
    
    const initProgressCallback = (report: InitProgressReport) => {
      setProgressText(report.text);
    };

    // We'll use Phi-3 as it's small, fast, and good for summarization
    const modelToUse = 'Phi-3-mini-4k-instruct-q4f16_1-MLC';
    
    try {
      setProgressText('Initializing WebGPU Engine...');
      const newEngine = await CreateMLCEngine(modelToUse, {
        initProgressCallback,
      });
      engineRef.current = newEngine;
      setEngine(newEngine);
      setProgressText('');
      return newEngine;
    } catch (e) {
      console.error(e);
      setProgressText('Failed to load model. Make sure your browser supports WebGPU.');
      return null;
    }
  }, []);

  const generateStory = useCallback(async (commits: any[], onUpdate: (text: string) => void) => {
    let activeEngine = engineRef.current;
    if (!activeEngine) {
      activeEngine = await initEngine();
      if (!activeEngine) {
        onUpdate('Failed to initialize WebGPU Engine.');
        return;
      }
    }

    setIsGenerating(true);
    try {
      const prompt = `You are a senior software architect analyzing the git history of a repository.
Below is a batch of commits. Summarize this era of development.
Provide a short, catchy title for this era, and a 2-3 sentence description of the major architectural changes or features added.

Commits:
${commits.map(c => `- ${c.hash.substring(0, 7)}: ${c.message}`).join('\n')}
`;

      const chunks = await activeEngine.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are an expert developer analyzing codebase evolution. Keep responses concise and focused on architecture and features.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        stream: true,
      });

      let fullText = '';
      for await (const chunk of chunks) {
        fullText += chunk.choices[0]?.delta.content || '';
        onUpdate(fullText);
      }
    } catch (e) {
      console.error(e);
      onUpdate('Error generating story.');
    } finally {
      setIsGenerating(false);
    }
  }, [initEngine]);

  return { engine, progressText, isGenerating, initEngine, generateStory };
}
