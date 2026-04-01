import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, X, Bot, User, Sparkles, Search, MessageSquare, 
  ChevronRight, Plus, Settings, Trash2, Loader2, Globe, Database, FileText,
  RotateCcw
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Agent, AgentMessage, AgentService } from '../services/agentService';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

interface AiAgentPanelProps {
  onClose: () => void;
  onOpenSettings: (tab: 'settings' | 'agents') => void;
}

export default function AiAgentPanel({ onClose, onOpenSettings }: AiAgentPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAgents, setIsFetchingAgents] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const currentAgentId = useRef<string | null>(null);
  const loadedMessagesRef = useRef<string>('');

  // Load messages from database when agent changes
  useEffect(() => {
    if (selectedAgent) {
      currentAgentId.current = selectedAgent.id;
      isInitialLoad.current = true;
      setIsLoading(true);
      apiFetch(`/api/agents/${selectedAgent.id}/chat`)
        .then(data => {
          if (currentAgentId.current === selectedAgent.id) {
            const msgs = data.messages || [];
            loadedMessagesRef.current = JSON.stringify(msgs);
            setMessages(msgs);
            isInitialLoad.current = false;
          }
        })
        .catch(err => {
          console.error("Failed to load stored messages", err);
          if (currentAgentId.current === selectedAgent.id) {
            loadedMessagesRef.current = JSON.stringify([]);
            setMessages([]);
            isInitialLoad.current = false;
          }
        })
        .finally(() => {
          if (currentAgentId.current === selectedAgent.id) {
            setIsLoading(false);
          }
        });
    } else {
      currentAgentId.current = null;
      loadedMessagesRef.current = JSON.stringify([]);
      setMessages([]);
    }
  }, [selectedAgent]);

  // Save messages to database whenever they change
  useEffect(() => {
    if (selectedAgent && !isInitialLoad.current) {
      const currentMessagesStr = JSON.stringify(messages);
      if (currentMessagesStr === loadedMessagesRef.current) {
        return; // Skip saving if it's identical to what was just loaded
      }

      if (messages.length > 0) {
        apiFetch(`/api/agents/${selectedAgent.id}/chat`, {
          method: 'POST',
          body: JSON.stringify({ messages })
        }).catch(err => console.error("Failed to save messages", err));
      } else {
        apiFetch(`/api/agents/${selectedAgent.id}/chat`, {
          method: 'DELETE'
        }).catch(err => console.error("Failed to delete messages", err));
      }
    }
  }, [messages, selectedAgent]);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAgents = async () => {
    setIsFetchingAgents(true);
    try {
      const data = await apiFetch('/api/agents').catch(() => []);
      
      // Parse JSON strings back to arrays if they come from DB as strings
      const parsedData = (data || []).map((a: any) => ({
        ...a,
        knowledge_sources: typeof a.knowledge_sources === 'string' ? JSON.parse(a.knowledge_sources) : (a.knowledge_sources || []),
        tools: typeof a.tools === 'string' ? JSON.parse(a.tools) : (a.tools || [])
      }));

      const defaultAgents = [
        {
          id: 'default-agent',
          name: 'Workspace Assistant',
          description: 'Helpful assistant for your workspace',
          icon: 'Bot',
          instructions: 'You are a workspace assistant. You can help users manage their pages and databases. You can create new databases and pages, read content, update pages, and search the workspace. When asked to create something, use your tools to do it.',
          knowledge_sources: [],
          tools: ['read', 'query', 'search', 'write']
        },
        {
          id: 'task-master',
          name: 'Task Master',
          description: 'Helps manage and organize tasks.',
          icon: 'Database',
          instructions: 'You are a task management assistant. You understand task titles, statuses, and deadlines. Help the user organize and manage their tasks effectively. You can create new task pages or update existing ones.',
          knowledge_sources: ['Tasks'],
          tools: ['read', 'write', 'query']
        }
      ];

      const allAgents = [...defaultAgents, ...parsedData];
      setAgents(allAgents);
      
      if (!selectedAgent && allAgents.length > 0) {
        const strategicPartner = allAgents.find(a => a.name === 'Strategic Partner');
        setSelectedAgent(strategicPartner || allAgents[0]);
      } else if (selectedAgent) {
        // Update selected agent if it was updated in management
        const updated = allAgents.find(a => a.id === selectedAgent.id);
        if (updated) setSelectedAgent(updated);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsFetchingAgents(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedAgent || isLoading) return;

    const userMessage: AgentMessage = {
      id: Date.now().toString(),
      thread_id: 'current-thread',
      role: 'user',
      content: input,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const agentService = new AgentService(selectedAgent);
      const response = await agentService.chat('current-thread', input, messages);
      
      const assistantMessage: AgentMessage = {
        id: (Date.now() + 1).toString(),
        thread_id: 'current-thread',
        role: 'assistant',
        content: response || 'Sorry, I encountered an error.',
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Agent chat failed:', error);
      const errorMessage: AgentMessage = {
        id: (Date.now() + 1).toString(),
        thread_id: 'current-thread',
        role: 'assistant',
        content: 'I encountered an error while processing your request. Please try again.',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (!selectedAgent) return;
    // @ts-ignore
    window.appConfirm?.('Are you sure you want to clear this chat history?').then(confirmed => {
      if (confirmed) {
        setMessages([]);
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-white animate-in zoom-in-95 duration-300">
      <>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
              <Sparkles size={18} />
            </div>
            <h2 className="font-bold text-slate-900 text-sm">AI Agents</h2>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={clearChat}
              disabled={messages.length === 0}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              title="Clear Chat"
            >
              <RotateCcw size={16} />
            </button>
            <button 
              onClick={() => onOpenSettings('agents')}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-all"
              title="Manage Agents"
            >
              <Settings size={18} />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Agent Selector */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {isFetchingAgents ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" />
                Loading agents...
              </div>
            ) : (
              agents.map(agent => {
                const ICON_OPTIONS = [
                  { id: 'Bot', icon: Bot },
                  { id: 'Globe', icon: Globe },
                  { id: 'Database', icon: Database },
                  { id: 'FileText', icon: FileText },
                  { id: 'Search', icon: Search },
                  { id: 'Sparkles', icon: Sparkles },
                  { id: 'MessageSquare', icon: MessageSquare }
                ];
                const AgentIcon = ICON_OPTIONS.find(i => i.id === agent.icon)?.icon || Bot;
                
                return (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                      selectedAgent?.id === agent.id 
                        ? "bg-primary text-white border-primary shadow-sm" 
                        : "bg-white text-slate-600 border-slate-200 hover:border-primary/50"
                    )}
                  >
                    <AgentIcon size={14} />
                    {agent.name}
                  </button>
                );
              })
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  {(() => {
                    const ICON_OPTIONS = [
                      { id: 'Bot', icon: Bot },
                      { id: 'Globe', icon: Globe },
                      { id: 'Database', icon: Database },
                      { id: 'FileText', icon: FileText },
                      { id: 'Search', icon: Search },
                      { id: 'Sparkles', icon: Sparkles },
                      { id: 'MessageSquare', icon: MessageSquare }
                    ];
                    const SelectedIcon = ICON_OPTIONS.find(i => i.id === selectedAgent?.icon)?.icon || Bot;
                    return <SelectedIcon size={48} className="text-primary" />;
                  })()}
                </div>
                <div className="max-w-[200px]">
                  <h3 className="font-bold text-slate-900 text-sm">Chat with {selectedAgent?.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedAgent?.description}</p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full max-w-[240px]">
                  <button 
                    onClick={() => {
                      setInput("Summarize my workspace");
                      // We need a slight delay to allow state to update before submitting
                      setTimeout(() => {
                        const form = document.getElementById('agent-chat-form') as HTMLFormElement;
                        if (form) form.requestSubmit();
                      }, 10);
                    }}
                    className="px-3 py-2 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-primary/50 transition-all text-left flex items-center gap-2"
                  >
                    <FileText size={12} className="text-primary" />
                    Summarize my workspace
                  </button>
                  <button 
                    onClick={() => {
                      setInput("Search for 'project'");
                      setTimeout(() => {
                        const form = document.getElementById('agent-chat-form') as HTMLFormElement;
                        if (form) form.requestSubmit();
                      }, 10);
                    }}
                    className="px-3 py-2 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-primary/50 transition-all text-left flex items-center gap-2"
                  >
                    <Search size={12} className="text-primary" />
                    Search for 'project'
                  </button>
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={m.id} className={cn(
                  "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  m.role === 'user' ? "flex-row-reverse" : ""
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
                    m.role === 'user' ? "bg-slate-900 text-white" : "bg-primary text-white"
                  )}>
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={cn(
                    "max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm border",
                    m.role === 'user' 
                      ? "bg-white border-slate-100 text-slate-900 rounded-tr-none" 
                      : "bg-white border-primary/10 text-slate-900 rounded-tl-none"
                  )}>
                    <div className="prose prose-slate prose-sm max-w-none">
                      <Markdown>{m.content}</Markdown>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-primary/40" />
                </div>
                <div className="bg-white border border-primary/5 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-100">
            <form 
              id="agent-chat-form"
              onSubmit={handleSendMessage}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${selectedAgent?.name}...`}
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "absolute right-2 p-2 rounded-lg transition-all",
                  input.trim() && !isLoading 
                    ? "bg-primary text-white shadow-md hover:bg-primary/90" 
                    : "text-slate-300"
                )}
              >
                <Send size={18} />
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-2 text-center font-medium">
              AI agents can read and write to your workspace. Use with care.
            </p>
          </div>
        </div>
      </>
    </div>
  );
}
