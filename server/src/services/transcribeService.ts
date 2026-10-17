import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import { getScenarioById, DEMO_SCENARIOS } from '../data/scenarios';

export interface TranscribeResult {
  transcript: string;
  source: 'ai' | 'mock';
  error?: string;
}

/**
 * Transcribe an audio buffer containing pre-hospital clinical speech.
 * If in demo mode or without GEMINI_API_KEY, returns a simulated realistic handoff transcript.
 * When GEMINI_API_KEY is available and live mode is active, calls Google GenAI audio model.
 */
export async function transcribeAudioBuffer(
  buffer: Buffer,
  mimeType: string = 'audio/webm',
  scenarioId?: string
): Promise<TranscribeResult> {
  // Demo mode: return deterministic handoff transcript
  if (config.demoMode || !config.geminiApiKey) {
    if (scenarioId) {
      const scenario = getScenarioById(scenarioId);
      if (scenario) {
        return {
          transcript: scenario.transcript,
          source: 'mock',
        };
      }
    }

    // Default realistic emergency handoff transcript for demo mode
    return {
      transcript:
        'Medic 4 inbound with an approx 62-year-old female presenting with acute retrosternal chest tightness radiating to her left jaw, onset 45 minutes ago. Vitals en route: heart rate 94 beats per minute, blood pressure 146 over 88, SpO2 96% on room air, respiratory rate 18, afebrile. Patient has history of hypertension and hyperlipidemia. Administered 324 mg chewable aspirin and one sublingual nitroglycerin with mild symptom relief. Denies known drug allergies. ETA 5 minutes.',
      source: 'mock',
    };
  }

  // Live AI Audio Transcription using Google GenAI
  try {
    const client = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const response = await Promise.race([
      client.models.generateContent({
        model: config.transcribeModel || 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'audio/webm',
                  data: buffer.toString('base64'),
                },
              },
              {
                text: 'You are an accurate clinical speech-to-text transcription engine. Transcribe the spoken audio of this emergency medical handoff verbatim. Output ONLY the transcribed clinical speech. Do NOT include markdown formatting, timestamps, preamble, commentary, or conversational disclaimers.',
              },
            ],
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Audio transcription timed out after 30s')), 30_000)
      ),
    ]);

    const transcript = (response as Awaited<ReturnType<typeof client.models.generateContent>>).text?.trim() ?? '';
    if (!transcript) {
      throw new Error('AI transcription returned an empty result');
    }

    return {
      transcript,
      source: 'ai',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[transcribeService] Audio transcription failed:', msg);
    throw new Error(`Speech transcription failed: ${msg}`);
  }
}
