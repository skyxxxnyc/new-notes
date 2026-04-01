import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export async function generateAutofillValue(prompt: string, context: Record<string, any>) {
  // Replace prop(Name) with actual values
  let finalPrompt = prompt;
  for (const [key, value] of Object.entries(context)) {
    const regex = new RegExp(`prop\\(['"]?${key}['"]?\\)`, 'g');
    finalPrompt = finalPrompt.replace(regex, String(value));
  }

  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: finalPrompt,
      config: {
        systemInstruction: "You are an AI autofill assistant for a database. Provide a concise value based on the prompt and context provided.",
      },
    });

    return response.text;
  } catch (error) {
    console.error("Backend AI Generation Error:", error);
    return null;
  }
}
