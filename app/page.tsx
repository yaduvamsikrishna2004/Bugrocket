"use client";

import { useState, useEffect, useRef, ChangeEvent, ClipboardEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import Split from 'react-split';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Rocket, Bug, MessageSquare, Copy, Check, Trash2, Plus, 
  Menu, Paperclip, Zap, FileCode, X 
} from 'lucide-react';

// --- TYPES ---
type AppMode = 'chat' | 'debug';

type SavedChat = {
  id: string;
  title: string;
  date: string;
  mode: AppMode;
  messages: any[];
  code: string;
};

// --- COMPONENT: CODE BLOCK (Robust) ---
const CodeBlock = ({ language, value }: { language: string, value: string }) => {
  const [isCopied, setIsCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 bg-[#0d0d0d] shadow-lg">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-mono text-zinc-400 lowercase">{language || 'text'}</span>
        </div>
        <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition-colors">
          {isCopied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
          {isCopied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter 
          language={language || 'text'} 
          style={vscDarkPlus} 
          customStyle={{ margin: 0, padding: '1rem', fontSize: '12px', background: 'transparent' }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default function BugRocketLite() {
  // --- STATE ---
  const [chatId, setChatId] = useState<string>('');
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<AppMode>('chat');
  const [activeCode, setActiveCode] = useState("// Waiting for code...");
  const [activeLang, setActiveLang] = useState("typescript");
  const [isCopied, setIsCopied] = useState(false);

  // Initialize ID on mount to prevent Hydration Mismatch
  useEffect(() => {
    setChatId(Date.now().toString());
  }, []);

  // --- AGENTS ---
  // Note: Ensure your /api/chat endpoint handles the 'body: { mode }' property!
  const chatAgent = useChat({ 
    api: '/api/chat', 
    id: `chat-${chatId}`, 
    body: { mode: 'chat' } 
  });
  
  const debugAgent = useChat({ 
    api: '/api/chat', 
    id: `debug-${chatId}`, 
    body: { mode: 'debug' } 
  });

  // Active Brain Selector
  const activeAgent = mode === 'chat' ? chatAgent : debugAgent;

  // --- EFFECTS ---
  useEffect(() => {
    const saved = localStorage.getItem('bugrocket-lite-history');
    if (saved) setSavedChats(JSON.parse(saved));
  }, []);

  // Auto-Save Strategy
  useEffect(() => {
    if (!chatId) return;
    if (activeAgent.messages.length > 0) {
      const newHistory = [...savedChats];
      const existingIndex = newHistory.findIndex(c => c.id === chatId);
      const title = activeAgent.messages[0].role === 'user' 
        ? activeAgent.messages[0].content.substring(0, 25) + "..." 
        : "New Mission";
      
      const sessionData = { 
        id: chatId, title, date: new Date().toLocaleDateString(), 
        messages: activeAgent.messages, code: activeCode, mode
      };

      if (existingIndex > -1) newHistory[existingIndex] = sessionData;
      else newHistory.unshift(sessionData);

      setSavedChats(newHistory);
      localStorage.setItem('bugrocket-lite-history', JSON.stringify(newHistory));
    }
  }, [activeAgent.messages, activeCode, mode, chatId]); // Added chatId dependency

  // Improved Code Extractor (Handles multiple blocks, grabs the largest/last)
  useEffect(() => {
    const lastMessage = activeAgent.messages[activeAgent.messages.length - 1];
    if (lastMessage?.role === 'assistant') {
      // Find all code blocks
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      let match;
      let lastMatch = null;
      
      while ((match = codeBlockRegex.exec(lastMessage.content)) !== null) {
        lastMatch = match;
      }

      if (lastMatch) {
        setActiveLang(lastMatch[1] || 'text');
        setActiveCode(lastMatch[2].trim());
      }
    }
  }, [activeAgent.messages]);

  // --- ACTIONS ---
  const handleNewChat = () => {
    const newId = Date.now().toString();
    setChatId(newId);
    setFiles([]);
    chatAgent.setMessages([]);
    debugAgent.setMessages([]);
    setActiveCode("// Ready...");
    setMode('chat');
  };

  const loadChat = (chat: SavedChat) => {
    setChatId(chat.id);
    setActiveCode(chat.code);
    setFiles([]);
    setMode(chat.mode);
    if (chat.mode === 'chat') {
        chatAgent.setMessages(chat.messages);
        // Clear the other agent to prevent confusion
        debugAgent.setMessages([]); 
    } else {
        debugAgent.setMessages(chat.messages);
        chatAgent.setMessages([]);
    }
    if (window.innerWidth < 768) setShowSidebar(false);
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeAgent.input && files.length === 0) return;

    const attachments = await Promise.all(
      files.map(async (file) => ({
        name: file.name, contentType: file.type, url: await convertToBase64(file)
      }))
    );
    
    // AI SDK 3.3+ Experimental Attachments
    activeAgent.handleSubmit(e, { experimental_attachments: attachments });
    setFiles([]); 
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleQuickAction = (action: string) => {
    activeAgent.append({ role: 'user', content: action });
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => { 
      if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files || [])]); 
  };
  
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (items) {
      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) { 
          e.preventDefault(); 
          setFiles(prev => [...prev, ...pastedFiles]); 
      }
    }
  };

  // --- THEME ENGINE ---
  const theme = mode === 'chat' 
    ? { bg: 'bg-blue-600', text: 'text-blue-500', border: 'border-blue-500/30', softBg: 'bg-blue-600/10', gradient: 'from-blue-600 to-indigo-600', shadow: 'shadow-blue-500/20' }
    : { bg: 'bg-red-600', text: 'text-red-500', border: 'border-red-500/30', softBg: 'bg-red-600/10', gradient: 'from-red-600 to-orange-600', shadow: 'shadow-red-500/20' };

  if (!chatId) return null; // Prevent hydration errors

  return (
    <div className="h-screen bg-[#050505] text-white font-sans flex overflow-hidden selection:bg-white/20">
      
      {/* GLOBAL STYLES FOR SCROLLBAR & SPLIT */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        .gutter { background-color: rgba(255,255,255,0.05); background-repeat: no-repeat; background-position: 50%; transition: background-color 0.2s; }
        .gutter:hover { background-color: rgba(60, 130, 246, 0.5); cursor: col-resize; }
      `}</style>

      {/* 1. SIDEBAR */}
      <div className={`${showSidebar ? 'w-64' : 'w-0'} bg-black/40 backdrop-blur-xl border-r border-white/5 transition-all duration-300 flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Missions</span>
            <button onClick={() => { if(confirm("Clear history?")) { setSavedChats([]); localStorage.removeItem('bugrocket-lite-history'); }}} className="hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {savedChats.map(chat => (
                <button key={chat.id} onClick={() => loadChat(chat)} className={`w-full text-left p-3 rounded-lg text-xs transition-all border border-transparent ${chat.id === chatId ? 'bg-white/5 border-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${chat.mode === 'chat' ? 'bg-blue-500' : 'bg-red-500'}`}></span>
                        <span className="font-bold truncate opacity-80 uppercase">{chat.mode}</span>
                    </div>
                    <div className="font-medium truncate pl-3.5">{chat.title}</div>
                    <div className="text-[10px] opacity-50 mt-1 pl-3.5">{chat.date}</div>
                </button>
            ))}
        </div>
      </div>

      {/* 2. MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-[#0a0a0a] to-black">
        {/* HEADER */}
        <header className="h-14 border-b border-white/5 bg-black/20 backdrop-blur-md flex items-center justify-between px-4 z-20">
            <div className="flex items-center gap-4">
                <button onClick={() => setShowSidebar(!showSidebar)} className="text-zinc-400 hover:text-white transition-colors"><Menu size={20} /></button>
                <div className="flex items-center gap-2 group cursor-pointer" onClick={handleNewChat}>
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${theme.gradient} shadow-lg ${theme.shadow} transition-all duration-500`}>
                        <Rocket className="text-white fill-white/20" size={18} />
                    </div>
                    <span className="font-bold text-lg tracking-tight">BugRocket <span className="text-[10px] text-zinc-500 font-mono align-top ml-1">v3.0</span></span>
                </div>
            </div>
            
            <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/5">
                <button onClick={() => setMode('chat')} className={`px-6 py-1.5 text-xs font-bold rounded-md transition-all uppercase flex items-center gap-2 ${mode === 'chat' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <MessageSquare size={14} /> Chat
                </button>
                <button onClick={() => setMode('debug')} className={`px-6 py-1.5 text-xs font-bold rounded-md transition-all uppercase flex items-center gap-2 ${mode === 'debug' ? 'bg-red-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <Bug size={14} /> Debug
                </button>
            </div>
            <button onClick={handleNewChat} className="bg-white text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2"><Plus size={14} /> <span className="hidden sm:inline">New</span></button>
        </header>

        {/* SPLIT VIEW */}
        <Split 
            className="flex-1 flex overflow-hidden" 
            sizes={[45, 55]} 
            minSize={300} 
            gutterSize={4} 
            gutterAlign="center" 
            direction="horizontal"
        >
            
            {/* LEFT: CHAT */}
            <div className="flex flex-col h-full relative min-w-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {/* Welcome Message */}
                    {activeAgent.messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 opacity-50">
                            <div className={`p-4 rounded-2xl ${theme.softBg} border ${theme.border}`}>
                                {mode === 'chat' ? <MessageSquare size={32} className={theme.text} /> : <Bug size={32} className={theme.text} />}
                            </div>
                            <p className="text-sm font-medium">
                                {mode === 'chat' ? "How can I help you code?" : "Paste error logs or broken code."}
                            </p>
                        </div>
                    )}

                    {activeAgent.messages.map(m => (
                        <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] rounded-2xl p-4 text-sm border backdrop-blur-sm shadow-sm 
                                ${m.role === 'user' 
                                    ? `${theme.softBg} ${theme.border} text-white rounded-tr-sm` 
                                    : 'bg-zinc-900/50 border-white/10 text-zinc-300 rounded-tl-sm'}`}>
                                
                                {m.experimental_attachments?.length ? (
                                    <div className="flex gap-2 mb-3 overflow-x-auto">
                                        {m.experimental_attachments.map((att, i) => (
                                            <img key={i} src={att.url} className="h-20 rounded-md border border-white/10" alt="attachment"/>
                                        ))}
                                    </div>
                                ) : null}
                                
                                <div className="prose prose-invert max-w-none text-sm break-words leading-relaxed">
                                    <ReactMarkdown components={{
                                        code: (props: any) => {
                                            const { children, className, node, ...rest } = props;
                                            const match = /language-(\w+)/.exec(className || '');
                                            return match ? (
                                                <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                                            ) : (
                                                <code className="bg-white/10 rounded px-1 py-0.5 text-zinc-200 font-mono text-xs break-all" {...rest}>
                                                    {children}
                                                </code>
                                            );
                                        }
                                    }}>
                                        {m.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* INPUT AREA */}
                <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
                    {/* DEBUG QUICK ACTIONS */}
                    {mode === 'debug' && activeAgent.messages.length > 0 && (
                        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 custom-scrollbar">
                            {["Find Bugs", "Optimize Code", "Add Comments", "Explain Logic"].map(action => (
                                <button key={action} onClick={() => handleQuickAction(action)} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 hover:bg-red-500/20 hover:text-white transition-all whitespace-nowrap"><Zap size={10} /> {action}</button>
                            ))}
                        </div>
                    )}

                    {files.length > 0 && (
                        <div className="flex gap-2 mb-2 overflow-x-auto py-2">
                            {files.map((file, index) => (
                                <div key={index} className="relative group shrink-0">
                                    <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden border border-white/10">
                                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover opacity-70" alt="preview" />
                                    </div>
                                    <button onClick={() => setFiles(f => f.filter((_, i) => i !== index))} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white shadow-lg"><X size={8} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <form onSubmit={onFormSubmit} className="relative flex items-center gap-2">
                        <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" multiple />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><Paperclip size={20} /></button>
                        <div className="relative flex-1">
                            <input 
                                className="w-full bg-black/50 text-white pl-4 pr-12 py-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-white/30 transition-all placeholder:text-zinc-600 font-medium" 
                                value={activeAgent.input} 
                                onChange={activeAgent.handleInputChange} 
                                onPaste={handlePaste} 
                                placeholder={mode === 'chat' ? "Ask BugRocket anything..." : "Paste broken code or error logs..."} 
                            />
                            <button 
                                type="submit" 
                                disabled={activeAgent.isLoading} 
                                className={`absolute right-2 top-2 p-1.5 rounded-lg text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${theme.bg}`}
                            >
                                <Rocket size={18} className="fill-white/20" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* RIGHT: WORKSPACE */}
            <div className="flex flex-col h-full bg-[#09090b] relative min-w-0">
                <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-black/20 shrink-0">
                    <div className="flex items-center gap-2 text-zinc-400">
                        <FileCode size={14} className={theme.text}/>
                        <span className="text-xs font-mono uppercase font-bold">Active Code</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] text-zinc-600 font-mono hidden md:inline-block">{activeCode.length} chars</span>
                        <button onClick={() => { navigator.clipboard.writeText(activeCode); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors">
                            {isCopied ? <Check size={12} className="text-green-500"/> : <Copy size={12}/>} {isCopied ? "Copied" : "Copy"}
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar relative bg-[#09090b]">
                    <SyntaxHighlighter 
                        language={activeLang || 'typescript'} 
                        style={vscDarkPlus} 
                        customStyle={{ margin: 0, padding: '1.5rem', minHeight: '100%', fontSize: '13px', lineHeight: '1.6', backgroundColor: 'transparent' }} 
                        showLineNumbers={true} 
                        wrapLines={true}
                    >
                        {activeCode}
                    </SyntaxHighlighter>
                </div>
                
                {/* FOOTER */}
                <div className="h-6 bg-[#050505] border-t border-white/5 flex items-center px-4 justify-between text-[10px] text-zinc-600 font-mono select-none shrink-0">
                    <div className="flex gap-4">
                        <span>Ln {activeCode.split('\n').length}</span>
                        <span>UTF-8</span>
                        <span>{(activeLang || 'TEXT').toUpperCase()}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${mode === 'chat' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                        <span>{mode.toUpperCase()} MODE</span>
                    </div>
                </div>
            </div>

        </Split>
      </div>
    </div>
  );
}
