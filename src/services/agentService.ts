import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { apiFetch } from "../lib/api";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  instructions: string;
  knowledge_sources: string[];
  tools: string[];
}

export interface AgentMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  created_at: string;
}

const readTool: FunctionDeclaration = {
  name: "read_page",
  description: "Read the content of a specific page",
  parameters: {
    type: Type.OBJECT,
    properties: {
      pageId: { type: Type.STRING, description: "The ID of the page to read" }
    },
    required: ["pageId"]
  }
};

const queryTool: FunctionDeclaration = {
  name: "query_database",
  description: "Query a database for pages",
  parameters: {
    type: Type.OBJECT,
    properties: {
      databaseId: { type: Type.STRING, description: "The ID of the database to query" },
      filter: { type: Type.STRING, description: "Optional filter string" }
    },
    required: ["databaseId"]
  }
};

const writeTool: FunctionDeclaration = {
  name: "update_page",
  description: "Update the content or title of a page",
  parameters: {
    type: Type.OBJECT,
    properties: {
      pageId: { type: Type.STRING, description: "The ID of the page to update" },
      title: { type: Type.STRING, description: "New title" },
      content: { type: Type.STRING, description: "New content in markdown" }
    },
    required: ["pageId"]
  }
};

const searchTool: FunctionDeclaration = {
  name: "search_workspace",
  description: "Search for pages, databases, and dashboards in the workspace",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The search query" }
    },
    required: ["query"]
  }
};

export class AgentService {
  private agent: Agent;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  async chat(threadId: string, message: string, history: AgentMessage[] = []) {
    const functionDeclarations = [];
    if (this.agent.tools?.includes('read')) functionDeclarations.push(readTool);
    if (this.agent.tools?.includes('query')) functionDeclarations.push(queryTool);
    if (this.agent.tools?.includes('write')) functionDeclarations.push(writeTool);
    if (this.agent.tools?.includes('search')) functionDeclarations.push(searchTool);

    const tools: any[] = [];
    if (functionDeclarations.length > 0) {
      tools.push({ functionDeclarations });
    }
    
    if (this.agent.tools?.includes('web_search')) {
      tools.push({ googleSearch: {} });
    }

    const contents = [
      ...history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents as any,
      config: {
        systemInstruction: `You are ${this.agent.name}, an AI agent. ${this.agent.description}. Instructions: ${this.agent.instructions}. You have access to the following knowledge sources: ${this.agent.knowledge_sources.join(', ')}.`,
        tools: tools.length > 0 ? tools : undefined,
        toolConfig: tools.length > 0 ? { includeServerSideToolInvocations: true } : undefined,
      },
    });

    // Handle function calls if any
    const functionCalls = response.functionCalls;
    if (functionCalls) {
      const toolResults = [];
      for (const call of functionCalls) {
        let result;
        if (call.name === 'read_page') {
          result = await apiFetch(`/api/pages/${call.args.pageId}`);
        } else if (call.name === 'query_database') {
          result = await apiFetch(`/api/pages?databaseId=${call.args.databaseId}`);
        } else if (call.name === 'update_page') {
          result = await apiFetch(`/api/pages/${call.args.pageId}`, {
            method: 'PUT',
            body: JSON.stringify(call.args)
          });
        } else if (call.name === 'search_workspace') {
          result = await apiFetch(`/api/search?q=${call.args.query}`);
        }
        toolResults.push({ name: call.name, response: result });
      }

      // Send tool results back to model
      const secondResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...contents,
          { role: 'model', parts: [{ functionCall: functionCalls[0] }] }, // Simplified for one call
          { role: 'user', parts: [{ functionResponse: toolResults[0] }] }
        ] as any,
        config: {
          tools: tools.length > 0 ? tools : undefined,
          toolConfig: tools.length > 0 ? { includeServerSideToolInvocations: true } : undefined,
        }
      });

      return secondResponse.text;
    }

    return response.text;
  }
}
