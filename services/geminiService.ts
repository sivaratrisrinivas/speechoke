import { GoogleGenAI, Type } from "@google/genai";
import { CritiqueResult } from "../types";

const isPlaceholderKey = (key?: string | null): boolean => {
  if (!key) return true;
  const normalized = key.trim().toLowerCase();
  return normalized.includes("placeholder") || normalized.includes("appi_key");
};

export class GeminiService {
  
  // We no longer instantiate in constructor to allow dynamic key usage per request
  constructor() {}

  async analyzePerformance(speechTitle: string, speechText: string, audioBase64: string, userApiKey?: string): Promise<CritiqueResult> {
    
    const envApiKey = process.env.API_KEY;
    const envGeminiKey = process.env.GEMINI_API_KEY;
    const userKey = userApiKey?.trim();
    const apiKey =
      (!isPlaceholderKey(userKey) ? userKey : undefined) ||
      (!isPlaceholderKey(envApiKey) ? envApiKey : undefined) ||
      (!isPlaceholderKey(envGeminiKey) ? envGeminiKey : undefined);

    const keySource =
      !isPlaceholderKey(userKey) ? "userApiKey" :
      !isPlaceholderKey(envApiKey) ? "process.env.API_KEY" :
      !isPlaceholderKey(envGeminiKey) ? "process.env.GEMINI_API_KEY" :
      "none";

    console.info("[Speechoke][Gemini] key-resolution", {
      keySource,
      userKeyLen: userKey?.length ?? 0,
      envApiKeyLen: envApiKey?.length ?? 0,
      envGeminiKeyLen: envGeminiKey?.length ?? 0,
      envApiPlaceholder: isPlaceholderKey(envApiKey),
      envGeminiPlaceholder: isPlaceholderKey(envGeminiKey),
    });

    if (!apiKey) {
        throw new Error("No valid API Key available.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const prompt = `
      You are a world-class speech coach and theater critic.
      The user has just recorded a performance of the famous speech: "${speechTitle}".
      
      Here is the original text they were supposed to read:
      "${speechText}"

      Please analyze the attached audio recording of their performance.
      Evaluate them on Clarity (enunciation), Emotion (tone, gravity), and Pacing (speed, pauses).
      
      Provide a constructive but slightly witty critique. If they were terrible, say it nicely. If they were great, praise them.
      
      Return the result as a strict JSON object.
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              text: prompt,
            },
            {
              inlineData: {
                mimeType: "audio/webm", // Assuming MediaRecorder provides webm or compatible
                data: audioBase64,
              },
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallScore: { type: Type.INTEGER, description: "Score from 0 to 100" },
              clarityScore: { type: Type.INTEGER, description: "Score from 0 to 100" },
              emotionScore: { type: Type.INTEGER, description: "Score from 0 to 100" },
              pacingScore: { type: Type.INTEGER, description: "Score from 0 to 100" },
              feedback: { type: Type.STRING, description: "A paragraph of critique." },
              bestLine: { type: Type.STRING, description: "The specific line they delivered best." },
              improvementTip: { type: Type.STRING, description: "One actionable tip for next time." },
            },
            required: ["overallScore", "clarityScore", "emotionScore", "pacingScore", "feedback", "bestLine", "improvementTip"],
          },
        },
      });

      if (response.text) {
        return JSON.parse(response.text) as CritiqueResult;
      }
      throw new Error("No response text from Gemini");
    } catch (error) {
      console.error("Gemini analysis failed:", error);
      // Fallback mock if API fails (graceful degradation)
      return {
        overallScore: 75,
        clarityScore: 80,
        emotionScore: 70,
        pacingScore: 75,
        feedback: "We couldn't reach the judges (API Error), but you sounded passionate! Keep practicing your pauses to let the weight of the words sink in.",
        bestLine: "N/A",
        improvementTip: "Check your internet connection (or API Key) and try again.",
      };
    }
  }
}

export const geminiService = new GeminiService();