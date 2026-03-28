import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateNoteSummary(content: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize the following note concisely:\n\n${content}`,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating summary:", error);
    return "Failed to generate summary.";
  }
}

export async function improveWriting(content: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Improve the writing of the following text, fixing grammar and making it more professional. Return ONLY the improved text:\n\n${content}`,
    });
    return response.text;
  } catch (error) {
    console.error("Error improving writing:", error);
    return content;
  }
}
