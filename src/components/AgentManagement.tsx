import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, Bot, Save, X, ChevronLeft, 
  Check, Globe, Database, FileText, Search, Info,
  Sparkles, MessageSquare
} from 'lucide-react';
import { Agent } from '../services/agentService';
import { apiFetch } from '../lib/api';
import { cn } from '../lib/utils';

interface AgentManagementProps {
  onClose: () => void;
  onAgentsUpdated: () => void;
}

export default function AgentManagement({ onClose, onAgentsUpdated }: AgentManagementProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Partial<Agent> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newKnowledgeSource, setNewKnowledgeSource] = useState('');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/agents');
      // Parse JSON strings back to arrays if they come from DB as strings
      const parsedData = (data || []).map((a: any) => ({
        ...a,
        knowledge_sources: typeof a.knowledge_sources === 'string' ? JSON.parse(a.knowledge_sources) : (a.knowledge_sources || []),
        tools: typeof a.tools === 'string' ? JSON.parse(a.tools) : (a.tools || [])
      }));
      setAgents(parsedData);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingAgent({
      name: '',
      description: '',
      icon: 'Bot',
      instructions: '',
      knowledge_sources: [],
      tools: ['read', 'search']
    });
    setIsEditing(true);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent({ ...agent });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    // @ts-ignore
    const confirmed = await window.appConfirm?.('Are you sure you want to delete this agent?');
    if (!confirmed) return;

    try {
      await apiFetch(`/api/agents/${id}`, { method: 'DELETE' });
      setAgents(prev => prev.filter(a => a.id !== id));
      setIsEditing(false);
      setEditingAgent(null);
      onAgentsUpdated();
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const handleSave = async () => {
    if (!editingAgent?.name) {
      // @ts-ignore
      window.appAlert?.('Agent name is required');
      return;
    }

    setIsSaving(true);
    try {
      const method = editingAgent.id ? 'PUT' : 'POST';
      const url = editingAgent.id ? `/api/agents/${editingAgent.id}` : '/api/agents';
      
      const savedAgent = await apiFetch(url, {
        method,
        body: JSON.stringify(editingAgent)
      });

      // Parse response
      const parsedAgent = {
        ...savedAgent,
        knowledge_sources: typeof savedAgent.knowledge_sources === 'string' ? JSON.parse(savedAgent.knowledge_sources) : (savedAgent.knowledge_sources || []),
        tools: typeof savedAgent.tools === 'string' ? JSON.parse(savedAgent.tools) : (savedAgent.tools || [])
      };

      if (editingAgent.id) {
        setAgents(prev => prev.map(a => a.id === parsedAgent.id ? parsedAgent : a));
      } else {
        setAgents(prev => [...prev, parsedAgent]);
      }
      
      setIsEditing(false);
      setEditingAgent(null);
      onAgentsUpdated();
    } catch (error) {
      console.error('Failed to save agent:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTool = (tool: string) => {
    if (!editingAgent) return;
    const currentTools = editingAgent.tools || [];
    const newTools = currentTools.includes(tool)
      ? currentTools.filter(t => t !== tool)
      : [...currentTools, tool];
    setEditingAgent({ ...editingAgent, tools: newTools });
  };

  const addKnowledgeSource = () => {
    if (!newKnowledgeSource.trim() || !editingAgent) return;
    const currentSources = editingAgent.knowledge_sources || [];
    setEditingAgent({ 
      ...editingAgent, 
      knowledge_sources: [...currentSources, newKnowledgeSource.trim()] 
    });
    setNewKnowledgeSource('');
  };

  const removeKnowledgeSource = (index: number) => {
    if (!editingAgent) return;
    const currentSources = editingAgent.knowledge_sources || [];
    setEditingAgent({ 
      ...editingAgent, 
      knowledge_sources: currentSources.filter((_, i) => i !== index) 
    });
  };

  const ICON_OPTIONS = [
    { id: 'Bot', icon: Bot },
    { id: 'Globe', icon: Globe },
    { id: 'Database', icon: Database },
    { id: 'FileText', icon: FileText },
    { id: 'Search', icon: Search },
    { id: 'Sparkles', icon: Sparkles },
    { id: 'MessageSquare', icon: MessageSquare }
  ];

  if (isEditing && editingAgent) {
    const SelectedIcon = ICON_OPTIONS.find(i => i.id === editingAgent.icon)?.icon || Bot;

    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <button 
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 transition-all"
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <h2 className="font-bold text-slate-900 text-sm">
            {editingAgent.id ? 'Edit Agent' : 'New Agent'}
          </h2>
          <div className="flex items-center gap-2">
            {editingAgent.id && (
              <button 
                onClick={() => handleDelete(editingAgent.id!)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Delete Agent"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
            >
              {isSaving ? <Check size={14} className="animate-pulse" /> : <Save size={14} />}
              Save
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Icon
                </label>
                <div className="relative group">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-primary">
                    <SelectedIcon size={24} />
                  </div>
                  <div className="absolute top-0 left-0 w-full h-full opacity-0 group-hover:opacity-100 transition-all">
                    <div className="absolute top-14 left-0 bg-white border border-slate-200 rounded-xl shadow-xl p-2 grid grid-cols-4 gap-1 z-10 w-40">
                      {ICON_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setEditingAgent({ ...editingAgent, icon: opt.id })}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            editingAgent.icon === opt.id ? "bg-primary/10 text-primary" : "hover:bg-slate-50 text-slate-400"
                          )}
                        >
                          <opt.icon size={16} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Agent Name
                </label>
                <input 
                  type="text"
                  value={editingAgent.name || ''}
                  onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })}
                  placeholder="e.g. Data Analyst"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea 
                value={editingAgent.description || ''}
                onChange={e => setEditingAgent({ ...editingAgent, description: e.target.value })}
                placeholder="What does this agent do?"
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                System Instructions
              </label>
              <textarea 
                value={editingAgent.instructions || ''}
                onChange={e => setEditingAgent({ ...editingAgent, instructions: e.target.value })}
                placeholder="You are an expert at..."
                rows={6}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all resize-none"
              />
              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                <Info size={10} />
                Be specific about the agent's persona and behavior.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Knowledge Sources
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newKnowledgeSource}
                    onChange={e => setNewKnowledgeSource(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addKnowledgeSource()}
                    placeholder="Add a page or database name..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  <button 
                    onClick={addKnowledgeSource}
                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editingAgent.knowledge_sources?.map((source, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200"
                    >
                      {source}
                      <button 
                        onClick={() => removeKnowledgeSource(idx)}
                        className="text-slate-400 hover:text-red-500 transition-all"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Capabilities (Tools)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'read', name: 'Read Pages', icon: FileText, desc: 'Read page content' },
                  { id: 'write', name: 'Update Pages', icon: Edit2, desc: 'Modify page content' },
                  { id: 'query', name: 'Query DBs', icon: Database, desc: 'Search databases' },
                  { id: 'search', name: 'Global Search', icon: Search, desc: 'Search workspace' },
                  { id: 'web_search', name: 'Web Search', icon: Globe, desc: 'Search the internet' }
                ].map(tool => {
                  const isSelected = editingAgent.tools?.includes(tool.id);
                  return (
                    <button
                      key={tool.id}
                      onClick={() => toggleTool(tool.id)}
                      className={cn(
                        "relative flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                        isSelected
                          ? "bg-primary/5 border-primary/20 ring-1 ring-primary/20"
                          : "bg-white border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className={cn(
                          "p-1.5 rounded-lg",
                          isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                        )}>
                          <tool.icon size={14} />
                        </div>
                        {isSelected && (
                          <div className="text-primary">
                            <Check size={16} />
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-900">{tool.name}</span>
                      <span className="text-[10px] text-slate-500">{tool.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-white p-1.5 rounded-lg">
            <Bot size={18} />
          </div>
          <h2 className="font-bold text-slate-900 text-sm">Manage Agents</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-all"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Agents</h3>
          <button 
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
          >
            <Plus size={14} />
            Create New
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Plus size={24} className="animate-spin mb-2" />
            <span className="text-xs font-medium">Loading agents...</span>
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <Bot size={32} className="text-slate-200 mb-3" />
            <h4 className="text-sm font-bold text-slate-900">No custom agents yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px]">Create specialized agents for different tasks in your workspace.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map(agent => {
              const AgentIcon = ICON_OPTIONS.find(i => i.id === agent.icon)?.icon || Bot;
              return (
                <div 
                  key={agent.id}
                  className="group p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/20 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="bg-primary/10 p-2 rounded-xl text-primary">
                        <AgentIcon size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{agent.name}</h4>
                        <p className="text-xs text-slate-500 line-clamp-1">{agent.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleEdit(agent)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(agent.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {agent.tools?.map(tool => (
                      <span 
                        key={tool}
                        className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-md border border-slate-100"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
