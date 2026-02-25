import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

// Lazy initialization of the model to avoid crash if API key is invalid/missing at module load
let model: any = null;

const getModel = () => {
  if (model) return model;
  if (!apiKey || apiKey.includes('PLACEHOLDER')) {
    console.warn("Valid GEMINI_API_KEY is not set. AI features will return mock data.");
    return {
      generateContent: async (prompt: string) => ({
        response: { text: () => `[MOCK AI RESPONSE for: ${prompt.substring(0, 50)}...]` }
      })
    };
  }
  const genAI = new GoogleGenAI({ apiKey });
  // @ts-ignore
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  return model;
};

export async function generateNoteSummary(content: string) {
  try {
    const aiModel = getModel();
    const result = await aiModel.generateContent(`Summarize the following note concisely, using a Swiss Design aesthetic in your language (objective, clear, minimalist):\n\n${content}`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating summary:", error);
    return "Failed to generate summary.";
  }
}

export async function improveWriting(content: string) {
  try {
    const aiModel = getModel();
    const result = await aiModel.generateContent(`Improve the writing of the following text, fixing grammar and making it more professional. Return ONLY the improved text:\n\n${content}`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error improving writing:", error);
    return content;
  }
}

export async function runAiAction(action: string, content: string, context?: string) {
  const prompts: Record<string, string> = {
    summarize: `Summarize the following text concisely:`,
    translate: `Translate the following text to English (if it is not English) or to another major language if requested. Return ONLY the translation:`,
    expand: `Expand the following text with more detail and depth while maintaining the tone:`,
    explain: `Explain the key concepts in the following text simply:`,
    shorten: `Rewrite the following text to be much shorter and more direct:`,
    professional: `Rewrite the following text in a professional business tone:`,
    casual: `Rewrite the following text in a casual, friendly tone:`,
    swiss: `Rewrite the following text in a Swiss modernist style (objective, minimalist, sans-serif logic):`
  };

  const prompt = prompts[action] || `Perform the following action on the text: ${action}. Return ONLY the result.`;

  try {
    const aiModel = getModel();
    const result = await aiModel.generateContent(`${prompt}\n\n${context ? `Context: ${context}\n\n` : ''}Text: ${content}`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error(`Error running AI action ${action}:`, error);
    return content;
  }
}

export async function askAgent(query: string, context: string) {
  try {
    const aiModel = getModel();
    const result = await aiModel.generateContent(`You are an intelligent workspace agent for a Notion-clone called "New Notes" (Swiss Edition). 
    Your goal is to help the user manage their knowledge, notes, and databases.
    
    Context about the current workspace/page:
    ${context}
    
    User Query: ${query}
    
    Respond in a helpful, objective, and clear manner. If you don't know the answer based on the context, say so.`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error asking agent:", error);
    return "I encountered an error while processing your request.";
  }
}
