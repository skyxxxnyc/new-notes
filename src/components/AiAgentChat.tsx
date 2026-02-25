import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, Sparkles, Terminal, Maximize2, Minimize2 } from 'lucide-react';
import { askAgent } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function AiAgentChat({ context }: { context?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await askAgent(userMessage, context || 'No context provided.');
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-full shadow-2xl hover:bg-black transition-all group border border-white/10"
            >
                <div className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </div>
                {isOpen ? <X size={24} /> : <Bot size={24} className="group-hover:scale-110 transition-transform" />}
            </button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            width: isMaximized ? 'calc(100vw - 48px)' : '400px',
                            height: isMaximized ? 'calc(100vh - 120px)' : '600px'
                        }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={`fixed bottom-24 right-6 z-50 bg-white border-2 border-slate-900 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden max-w-[calc(100vw-48px)]`}
                    >
                        {/* Header */}
                        <div className="bg-slate-900 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary rounded-lg">
                                    <Terminal size={18} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm tracking-tight uppercase">Workspace Agent</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                        <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">System Online</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsMaximized(!isMaximized)}
                                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                                >
                                    {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 font-mono text-sm leading-relaxed"
                        >
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-8">
                                    <Sparkles size={32} className="mb-4 opacity-20" />
                                    <p className="font-bold tracking-tight text-slate-900 mb-2">SWISS AGENT v2.0</p>
                                    <p className="text-xs leading-relaxed">Initialized with knowledge of: All Notes, Engineering Tasks, and Color Palettes.</p>
                                </div>
                            )}
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-lg border-2 ${m.role === 'user'
                                            ? 'bg-white border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                                            : 'bg-primary/5 border-primary shadow-[4px_4px_0px_0px_rgba(239,68,68,0.2)]'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-1.5 opacity-50">
                                            {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                                {m.role === 'user' ? 'Operator' : 'AI Assistant'}
                                            </span>
                                        </div>
                                        <p className="text-slate-800 break-words whitespace-pre-wrap">{m.content}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border-2 border-slate-200 p-3 rounded-lg flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t-2 border-slate-900">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="System command or question..."
                                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border-2 border-slate-200 focus:border-slate-900 outline-none transition-colors font-mono text-sm"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-400 tracking-tighter uppercase">
                                <span>Press Enter to dispatch</span>
                                <span>Context: Active Page</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
