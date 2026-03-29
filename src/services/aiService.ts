import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateAIResponse(prompt: string, systemInstruction?: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "You are a helpful AI assistant integrated into a Notion-like workspace.",
      },
    });

    return response.text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}

export async function processBlocksWithAI(content: string, action: string) {
  const systemInstructions: Record<string, string> = {
    summarize: "Summarize the following text concisely.",
    translate: "Translate the following text to the requested language (default to English if not specified).",
    rewrite: "Rewrite the following text to be more professional and clear.",
    expand: "Expand on the following text with more details and context.",
    explain: "Explain the following text in simple terms.",
    fix_grammar: "Fix any grammar and spelling mistakes in the following text.",
    change_tone: "Change the tone of the following text to be more friendly and approachable.",
  };

  const instruction = systemInstructions[action] || "Process the following text.";
  
  return generateAIResponse(content, instruction);
}

export async function generateAutofillValue(prompt: string, context: Record<string, any>) {
  // Replace prop(Name) with actual values
  let finalPrompt = prompt;
  for (const [key, value] of Object.entries(context)) {
    const regex = new RegExp(`prop\\(['"]?${key}['"]?\\)`, 'g');
    finalPrompt = finalPrompt.replace(regex, String(value));
  }

  return generateAIResponse(finalPrompt, "You are an AI autofill assistant for a database. Provide a concise value based on the prompt and context provided.");
}
