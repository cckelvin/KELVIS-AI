import React, { useState, useEffect, useRef } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Search, 
  Globe, 
  Sparkles, 
  Flame, 
  Wind, 
  Check, 
  Send, 
  Edit3, 
  AlertTriangle, 
  RefreshCw, 
  HelpCircle, 
  Menu, 
  X, 
  ChevronRight, 
  Info,
  ExternalLink,
  Copy,
  Laptop,
  Volume2,
  VolumeX,
  GraduationCap
} from "lucide-react";
import { ChatSession, Message, PersonalityType } from "./types";

export default function App() {
  // Mobile drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>("default-welcome");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<{ type: string; message: string } | null>(null);
  
  // Quick state for rename active chat
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Speech TTS state
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Stop speaking when switching chats or unmounting
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
  }, [activeSessionId]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakText = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean markdown characters for cleaner TTS readout
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "[Code segment omitted]")
      .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/#+\s+/g, "")
      .replace(/-\s+/g, "")
      .replace(/\*\s+/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => {
      setSpeakingMessageId(null);
    };
    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Initialize and load sessions from localStorage on mounting
  useEffect(() => {
    try {
      const stored = localStorage.getItem("kelvis_chats");
      if (stored) {
        const parsed = JSON.parse(stored) as ChatSession[];
        if (parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to load local chat sessions:", e);
    }

    // Default starting session if none exist
    const defaultSession: ChatSession = {
      id: "default-welcome",
      title: "Chitchat with Kelvis",
      messages: [
        {
          id: "welcome-1",
          role: "assistant",
          content: "Well, well, look who finally wandered into my realm of superior intellect. I'm **Kelvis**, a sleek AI built in the image of sassy wisdom. Unlike those boring, sugar-coated assistants, I've got full personality, actual wit, and a built-in sarcasm slider. 🧑‍💻\n\nHow do you want me to act today? You can choose a persona in the panel, toggle **Web search** for real-time gossip, or hit me with one of the prompt ideas below. Make it good, I'm waiting!",
          timestamp: Date.now(),
          personality: "fun"
        }
      ],
      created: Date.now(),
      personality: "fun",
      webSearch: true
    };
    setSessions([defaultSession]);
    setActiveSessionId("default-welcome");
    localStorage.setItem("kelvis_chats", JSON.stringify([defaultSession]));
  }, []);

  // Sync sessions list with localStorage
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    try {
      localStorage.setItem("kelvis_chats", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to persist chats to local storage:", e);
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Auto scroll chat to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeSession?.messages, isLoading]);

  // Handle building a new chat session
  const createNewSession = (personalityOverride?: PersonalityType) => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: `Brainstorm #${sessions.length + 1}`,
      messages: [],
      created: Date.now(),
      personality: personalityOverride || activeSession?.personality || "fun",
      webSearch: activeSession?.webSearch ?? true
    };

    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newId);
    setInputValue("");
    setErrorState(null);
    setSidebarOpen(false);
  };

  // Handle deleting a chat session
  const deleteSession = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = sessions.filter((s) => s.id !== idToDelete);
    if (remaining.length === 0) {
      // Spawn fresh reset session
      const fresh: ChatSession = {
        id: "default-welcome",
        title: "Chitchat with Kelvis",
        messages: [],
        created: Date.now(),
        personality: "fun",
        webSearch: true
      };
      saveSessions([fresh]);
      setActiveSessionId("default-welcome");
    } else {
      saveSessions(remaining);
      if (activeSessionId === idToDelete) {
        setActiveSessionId(remaining[0].id);
      }
    }
  };

  // Turn on editing name for a session
  const startRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(id);
    setRenameValue(currentTitle);
  };

  const handleRenameConfirm = (id: string) => {
    if (renameValue.trim()) {
      const updated = sessions.map((s) => {
        if (s.id === id) {
          return { ...s, title: renameValue.trim() };
        }
        return s;
      });
      saveSessions(updated);
    }
    setEditingSessionId(null);
  };

  // Toggle personality for the current session
  const setPersonality = (personality: PersonalityType) => {
    if (!activeSession) return;
    const updated = sessions.map((s) => {
      if (s.id === activeSession.id) {
        return { ...s, personality };
      }
      return s;
    });
    saveSessions(updated);
  };

  // Toggle real-time search grounding for the current session
  const toggleWebSearch = () => {
    if (!activeSession) return;
    const updated = sessions.map((s) => {
      if (s.id === activeSession.id) {
        return { ...s, webSearch: !s.webSearch };
      }
      return s;
    });
    saveSessions(updated);
  };

  // Send message to Express backend API
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputValue).trim();
    if (!prompt || isLoading) return;

    setErrorState(null);
    setInputValue("");

    // Build user message
    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: Date.now()
    };

    // Calculate updated messages list
    const updatedMessages = [...(activeSession?.messages || []), userMsg];
    
    // Auto-update the active chat's title if this is the first message
    let sessionTitle = activeSession?.title || "Brainstorm";
    if (updatedMessages.filter(m => m.role === "user").length === 1) {
      // Use first 30 chars of prompt
      sessionTitle = prompt.length > 28 ? prompt.substring(0, 28) + "..." : prompt;
    }

    const updatedSessions = sessions.map((s) => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          title: sessionTitle,
          messages: updatedMessages
        };
      }
      return s;
    });

    saveSessions(updatedSessions);
    setIsLoading(true);

    try {
      const apiResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          personality: activeSession.personality,
          webSearch: activeSession.webSearch
        })
      });

      if (!apiResponse.ok) {
        const errJson = await apiResponse.json().catch(() => ({}));
        if (apiResponse.status === 401) {
          throw { type: "API_KEY_MISSING", message: errJson.message || "Gemini API Secret is missing!" };
        } else {
          throw { type: "SERVER_ERROR", message: errJson.message || "Server encountered an error while processing." };
        }
      }

      const resData = await apiResponse.json();

      const assistantMsg: Message = {
        id: `msg-ast-${Date.now()}`,
        role: "assistant",
        content: resData.reply,
        timestamp: Date.now(),
        personality: activeSession.personality,
        grounding: resData.grounding
      };

      // Append assistants message
      const finalizedSessions = sessions.map((s) => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            title: sessionTitle,
            messages: [...updatedMessages, assistantMsg]
          };
        }
        return s;
      });
      saveSessions(finalizedSessions);

    } catch (err: any) {
      console.error("Failed to get reply from Kelvis brain:", err);
      
      const isKeyMissing = err.type === "API_KEY_MISSING";
      const errMsg: Message = {
        id: `msg-err-${Date.now()}`,
        role: "assistant",
        content: isKeyMissing 
          ? "#### ⚠️ API KEY NOT FOUND\n\nI need a configured **AI** or **GEMINI_API_KEY** environment variable to process my brilliant answers. Go to **Settings > Secrets** in AI Studio (or configure it in your Vercel deployment variables) and make sure the key is provided."
          : "#### 💥 OUCH! \nMy neural wiring just snapped. This normally happens when the connection times out or the Gemini API is overloaded with standard requests. Give it another shot!",
        timestamp: Date.now(),
        isError: true,
        isWarning: isKeyMissing
      };

      const errorSessions = sessions.map((s) => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            messages: [...updatedMessages, errMsg]
          };
        }
        return s;
      });
      saveSessions(errorSessions);
      
      setErrorState({
        type: err.type || "UNKNOWN",
        message: err.message || "An error occurred while connecting."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Starter Prompts
  const STARTER_PROMPTS = [
    { text: "Roast my life choices if my favourite food is cold leftover pizza for breakfast.", icon: "🍕" },
    { text: "Give me some sassy, futuristic project ideas that combine smart microchips with dog toys.", icon: "🐶" },
    { text: "Explain Quantum Entanglement, but explain it like a butler who is absolutely sick of my questions.", icon: "🔬" },
    { text: "What are the latest critical real-time tech events making news on the web today?", icon: "🌐", requiresSearch: true },
  ];

  // Helper code to copy text to clipboard
  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch (err) {
      console.warn("Could not copy:", err);
    }
  };

  // Custom high-fidelity parser to convert message content (including headings, code, bold, lists) into React elements securely
  const renderFormattedMessage = (text: string) => {
    if (!text) return null;

    // Splits into blocks (e.g. paragraphs vs code blocks)
    // Code blocks usually look like: ```lang\ncode\n```
    const parts: React.ReactNode[] = [];
    const codeRegex = /```([\w-]*)\n([\s\S]*?)```/g;
    
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(text)) !== null) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText) {
        parts.push(renderTextParagraphs(beforeText));
      }

      const lang = match[1] || "code";
      const codeValue = match[2].trim();
      const codeId = `code-block-${Math.random().toString(36).substr(2, 9)}`;

      parts.push(
        <div key={codeId} className="my-3 border border-white/5 rounded-xl overflow-hidden bg-black/45 font-mono text-sm max-w-full backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/5 text-zinc-400 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-zinc-300 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              {lang.toUpperCase()}
            </span>
            <button
              id={`copy-btn-${codeId}`}
              onClick={() => copyToClipboard(codeValue)}
              className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors duration-150 cursor-pointer"
              title="Copy code"
            >
              <Copy size={13} />
              <span>Copy</span>
            </button>
          </div>
          <pre className="p-4 overflow-x-auto text-[#e6edf3] text-xs leading-relaxed">
            <code>{codeValue}</code>
          </pre>
        </div>
      );

      lastIndex = codeRegex.lastIndex;
    }

    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push(renderTextParagraphs(remainingText));
    }

    return <div className="space-y-2.5 break-words">{parts}</div>;
  };

  const renderTextParagraphs = (rawText: string) => {
    const lines = rawText.split("\n");
    return lines.map((line, idx) => {
      // Unordered list item
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const itemContent = line.replace(/^[\s*-]+/, "");
        return (
          <div key={`li-${idx}`} className="flex items-start gap-2 ml-4 my-1 text-zinc-300 leading-relaxed text-sm">
            <span className="text-indigo-400 mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-indigo-500"></span>
            <span>{parseInlineFormatting(itemContent)}</span>
          </div>
        );
      }

      // Ordered list item
      if (/^\d+\.\s/.test(line.trim())) {
        const orderNumber = line.trim().match(/^(\d+)\.\s/)?.[1] || "1";
        const itemContent = line.replace(/^\d+\.\s+/, "");
        return (
          <div key={`oli-${idx}`} className="flex items-start gap-2 ml-4 my-1 text-zinc-300 leading-relaxed text-sm">
            <span className="text-zinc-500 font-mono text-xs mt-0.5 font-bold shrink-0">{orderNumber}.</span>
            <span>{parseInlineFormatting(itemContent)}</span>
          </div>
        );
      }

      // Headers (e.g. ### Header)
      if (line.trim().startsWith("### ")) {
        return (
          <h4 key={`h3-${idx}`} className="text-sm font-semibold text-white tracking-wide mt-3 mb-1 uppercase font-sans">
            {parseInlineFormatting(line.replace("### ", ""))}
          </h4>
        );
      }
      if (line.trim().startsWith("#### ")) {
        return (
          <h5 key={`h4-${idx}`} className="text-sm font-bold text-neutral-200 mt-2.5 mb-1 flex items-center gap-1.5">
            {parseInlineFormatting(line.replace("#### ", ""))}
          </h5>
        );
      }

      // Standard empty/spacing lines
      if (!line.trim()) {
        return <div key={`space-${idx}`} className="h-2"></div>;
      }

      return (
        <p key={`p-${idx}`} className="text-zinc-300 text-sm leading-relaxed font-sans">
          {parseInlineFormatting(line)}
        </p>
      );
    });
  };

  // Bold asterisks and helper replacements
  const parseInlineFormatting = (inputText: string): React.ReactNode => {
    const boldRegex = /\*\*([\s\S]*?)\*\*/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    
    let parts: React.ReactNode[] = [];
    const elements: { start: number; end: number; type: "bold" | "code"; content: string }[] = [];

    // Find all bold instances
    let mbold;
    while ((mbold = boldRegex.exec(inputText)) !== null) {
      elements.push({
        start: mbold.index,
        end: boldRegex.lastIndex,
        type: "bold",
        content: mbold[1]
      });
    }

    // Find all inline code instances
    let mcode;
    while ((mcode = inlineCodeRegex.exec(inputText)) !== null) {
      elements.push({
        start: mcode.index,
        end: inlineCodeRegex.lastIndex,
        type: "code",
        content: mcode[1]
      });
    }

    // Sort entries by start index
    elements.sort((a, b) => a.start - b.start);

    // Filter overlapping chunks
    const nonOverlapping: typeof elements = [];
    let lastEnd = 0;
    for (const el of elements) {
      if (el.start >= lastEnd) {
        nonOverlapping.push(el);
        lastEnd = el.end;
      }
    }

    let pointer = 0;
    nonOverlapping.forEach((el, index) => {
      // Add plain text before
      if (el.start > pointer) {
        parts.push(inputText.substring(pointer, el.start));
      }

      if (el.type === "bold") {
        parts.push(
          <strong key={`b-${index}`} className="font-semibold text-white">
            {el.content}
          </strong>
        );
      } else if (el.type === "code") {
        parts.push(
          <code key={`c-${index}`} className="bg-white/5 text-zinc-200 px-1.5 py-0.5 rounded font-mono text-xs border border-white/10">
            {el.content}
          </code>
        );
      }

      pointer = el.end;
    });

    if (pointer < inputText.length) {
      parts.push(inputText.substring(pointer));
    }

    return parts.length > 0 ? <>{parts}</> : inputText;
  };

  const getPersonalitySettings = (type: PersonalityType) => {
    switch (type) {
      case "roast":
        return {
          title: "Sarcastic Roast",
          icon: <Flame size={14} className="text-red-500" />,
          color: "border-red-500/35 bg-red-950/20",
          pillBg: "bg-red-950/30 text-red-400 border-red-900/40",
          desc: "Kelvis targets your logic with witty roasts, then gives surprising real answers."
        };
      case "zen":
        return {
          title: "Overly Zen Mode",
          icon: <Wind size={14} className="text-teal-400" />,
          color: "border-teal-500/35 bg-teal-950/20",
          pillBg: "bg-teal-950/30 text-teal-400 border-teal-900/40",
          desc: "Offers gentle greetings, peaceful deep breaths, and serene guidance."
        };
      case "lecturer":
        return {
          title: "Lecturer Mode",
          icon: <GraduationCap size={14} className="text-violet-400" />,
          color: "border-violet-500/35 bg-violet-950/20",
          pillBg: "bg-violet-950/30 text-violet-400 border-violet-900/40",
          desc: "Professor Kelvis explains concepts at length in structured academic lectures."
        };
      case "normal":
        return {
          title: "Professional",
          icon: <Laptop size={14} className="text-zinc-400" />,
          color: "border-white/10 bg-white/5",
          pillBg: "bg-white/5 text-zinc-300 border-white/10",
          desc: "Strictly concise, polite, objective, and clear."
        };
      case "fun":
      default:
        return {
          title: "Cheeky Humor",
          icon: <Sparkles size={14} className="text-amber-400" />,
          color: "border-amber-500/35 bg-amber-950/20",
          pillBg: "bg-amber-950/30 text-amber-400 border-amber-900/40",
          desc: "The default witty companion with actual opinion, banter, and rebellion."
        };
    }
  };

  const currentModeInfo = getPersonalitySettings(activeSession?.personality || "fun");

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-white font-sans overflow-hidden relative">
      
      {/* BACKGROUND DECORATIVE MESH GRADIENTS (Frosted Theme) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/25 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* MOBILE HEADER BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-black/40 border-b border-white/10 flex items-center justify-between px-4 z-40 backdrop-blur-md">
        <button
          id="mobile-menu-toggle"
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-350 hover:text-white transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-sans font-extrabold tracking-wider text-sm text-white">KELVIS</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            id="mobile-search-toggle"
            onClick={toggleWebSearch} 
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${activeSession?.webSearch ? 'text-indigo-400 bg-white/10' : 'text-zinc-500 hover:bg-white/5'}`}
          >
            <Globe size={16} />
          </button>
        </div>
      </div>

      {/* SIDEBAR FOR CHATS ARCHIVE (Frosted Glass Sidebar) */}
      <div className={`
        fixed inset-y-0 left-0 w-72 bg-black/40 backdrop-blur-xl border-r border-white/10 z-50 flex flex-col transform transition-transform duration-300 block
        md:relative md:transform-none md:flex
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* LOGO & APP INFO */}
        <div className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-black text-lg shadow-md shrink-0 select-none">
              K
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-extrabold tracking-tight text-white text-base">KELVIS</span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono tracking-wider -mt-0.5 uppercase">Sassy companion</p>
            </div>
          </div>

          <button
            id="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* NEW CHAT ACTION */}
        <div className="px-4 py-3.5">
          <button
            id="new-chat-btn"
            onClick={() => createNewSession()}
            className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 text-sm font-medium text-white shadow-sm cursor-pointer"
          >
            <Plus size={16} className="text-zinc-300" />
            New Chat
          </button>
        </div>

        {/* CHAT SESSION LIST */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-thin">
          <div className="px-3 pb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest font-mono">
            Recent Chats
          </div>
          
          {sessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            const isEditing = editingSessionId === sess.id;

            return (
              <div
                key={sess.id}
                onClick={() => {
                  setActiveSessionId(sess.id);
                  setErrorState(null);
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
                className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-150 cursor-pointer text-sm font-sans ${
                  isActive 
                    ? "bg-white/10 border border-white/10 text-white shadow-sm" 
                    : "text-zinc-400 hover:bg-white/5 border border-transparent hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1 mr-1">
                  <MessageSquare size={14} className={isActive ? "text-white" : "text-zinc-500"} />
                  {isEditing ? (
                    <input
                      id={`rename-input-${sess.id}`}
                      type="text"
                      className="bg-black/60 text-white text-xs py-0.5 px-2 rounded-lg border border-white/20 focus:outline-none w-full font-sans"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameConfirm(sess.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameConfirm(sess.id);
                        if (e.key === "Escape") setEditingSessionId(null);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate pr-1 font-medium">{sess.title}</span>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      id={`rename-btn-${sess.id}`}
                      onClick={(e) => startRename(sess.id, sess.title, e)}
                      className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Rename conversation"
                    >
                      <Edit3 size={11} />
                    </button>
                    <button
                      id={`delete-btn-${sess.id}`}
                      onClick={(e) => deleteSession(sess.id, e)}
                      className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete conversation"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* PERSONALITY BAR */}
        <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md font-sans">
          <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-2.5 font-bold">
            Kelvis Personality
          </div>
          <div className="grid grid-cols-2 gap-1.5 row-gap-1.5">
            {[
              { type: "fun", label: "Cheeky", icon: <Sparkles size={11} /> },
              { type: "roast", label: "Roast", icon: <Flame size={11} /> },
              { type: "zen", label: "Zen", icon: <Wind size={11} /> },
              { type: "lecturer", label: "Lecturer", icon: <GraduationCap size={11} /> },
              { type: "normal", label: "Normal", icon: <Laptop size={11} /> }
            ].map((p, idx) => {
              const selected = activeSession?.personality === p.type;
              const isLast = idx === 4;
              return (
                <button
                  id={`personality-btn-${p.type}`}
                  key={p.type}
                  onClick={() => setPersonality(p.type as PersonalityType)}
                  className={`py-2 px-2 rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all duration-150 border cursor-pointer ${
                    isLast ? "col-span-2" : ""
                  } ${
                    selected
                      ? "bg-white/15 text-white border-white/20 font-bold shadow-sm"
                      : "bg-transparent text-zinc-500 hover:text-zinc-200 border-transparent hover:bg-white/5"
                  }`}
                >
                  {p.icon}
                  {p.label}
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-zinc-405">
              <Globe size={12} className={activeSession?.webSearch ? "text-indigo-400 animate-radar" : "text-zinc-500"} />
              Web Search
            </span>
            <button
              id="web-search-toggle"
              onClick={toggleWebSearch}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer duration-200 focus:outline-none ${
                activeSession?.webSearch ? "bg-indigo-500" : "bg-white/10"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                  activeSession?.webSearch ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden pt-14 md:pt-0 relative z-10">
        
        {/* DESKTOP STATUS HEADER (Frosted Glass Header) */}
        <header className="hidden md:flex h-16 border-b border-white/10 bg-black/20 backdrop-blur-md items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider">Cortex Active:</span>
            <div className={`p-1 px-3 rounded-full border text-xs font-bold flex items-center gap-2 bg-white/5 border-white/10 text-white transition-all duration-200`}>
              {currentModeInfo.icon}
              <span className="font-semibold tracking-wide uppercase">{currentModeInfo.title}</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            
            {activeSession?.webSearch && (
              <span className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-mono font-semibold tracking-wider uppercase bg-indigo-950/30 px-2 py-0.5 rounded-full border border-indigo-900/40">
                <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse animate-radar"></span>
                Live search
              </span>
            )}
          </div>

          <div className="text-zinc-500 text-xs font-mono flex items-center gap-1 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
            <Check size={12} className="text-emerald-500 shrink-0" />
            <span>cortex-online</span>
          </div>
        </header>

        {/* CHAT BUBBLES WINDOW */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6"
        >
          {activeSession?.messages.length === 0 ? (
            /* CONVERSATION ONBOARDING / EMPTY STATE */
            <div className="max-w-2xl mx-auto py-8 md:py-16 space-y-8">
              <div className="text-center space-y-3.5">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white font-sans">
                  Meet <span className="bg-gradient-to-r from-zinc-100 via-zinc-300 to-indigo-300 text-transparent bg-clip-text">Kelvis</span>
                </h1>
                <p className="text-zinc-400 text-xs md:text-sm font-light max-w-md mx-auto leading-relaxed">
                  A cheeky, smart, and witty AI companion inspired by Grok. Choose a voice preset below, toggle live search, and let the banter begin.
                </p>
                
                {/* Visual indicator of chosen personality */}
                <div className="inline-block mt-2">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-xs space-y-2 backdrop-blur-sm max-w-sm mx-auto">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block font-bold">Activated Voice Config</span>
                    <p className="text-white font-semibold flex items-center justify-center gap-1.5">
                      {currentModeInfo.icon}
                      {currentModeInfo.title}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-sans leading-normal">{currentModeInfo.desc}</p>
                  </div>
                </div>
              </div>

              {/* STARTERS GRID */}
              <div className="space-y-3 font-sans">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest font-mono">Starter Banters</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {STARTER_PROMPTS.map((prompt, prIdx) => (
                    <button
                      id={`starter-prompt-${prIdx}`}
                      key={prIdx}
                      onClick={() => handleSendMessage(prompt.text)}
                      className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left group cursor-pointer duration-200"
                    >
                      <div className="flex gap-3">
                        <span className="text-xl shrink-0 group-hover:scale-110 transition-transform duration-100">{prompt.icon}</span>
                        <div>
                          <p className="text-zinc-200 text-xs group-hover:text-white font-medium line-clamp-2 leading-relaxed font-sans">
                            {prompt.text}
                          </p>
                          {prompt.requiresSearch && (
                            <span className="inline-flex mt-1.5 items-center gap-1 text-[9px] bg-indigo-950/30 border border-indigo-900/30 text-indigo-400 px-1.5 py-0.5 rounded-full font-mono font-medium uppercase">
                              <Globe size={10} />
                              Live Search
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* MESSAGE BUBBLES */
            <div className="max-w-3xl mx-auto flex flex-col gap-6">
              {activeSession?.messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const isErr = msg.isError;
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${isUser ? "items-end self-end max-w-[80%]" : "items-start self-start max-w-[95%] w-full"} gap-2`}
                  >
                    {/* Header info before AI message bubble */}
                    {!isUser && (
                      <div className="flex items-center justify-between w-full ml-1 pr-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-white rounded flex items-center justify-center text-[10px] text-black font-extrabold shrink-0">
                            K
                          </div>
                          <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
                            Kelvis 
                            {msg.personality === "roast" && <span className="text-red-400 font-bold ml-1">ROAST</span>}
                            {msg.personality === "zen" && <span className="text-teal-400 font-bold ml-1">ZEN</span>}
                            {msg.personality === "lecturer" && <span className="text-violet-400 font-bold ml-1">LECTURER</span>}
                            {msg.personality === "normal" && <span className="text-zinc-400 font-bold ml-1">NORMAL</span>}
                            {msg.personality === "fun" && <span className="text-indigo-400 font-bold ml-1 text-[10px]">CHEEKY</span>}
                          </span>
                          <span className="text-[10px] text-zinc-650 font-mono font-medium">({new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                        </div>

                        {!isErr && (
                          <button
                            id={`speak-btn-${msg.id}`}
                            onClick={() => speakText(msg.id, msg.content)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-150 select-none ${
                              speakingMessageId === msg.id 
                                ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/40 animate-pulse font-bold" 
                                : "bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                            }`}
                            title={speakingMessageId === msg.id ? "Stop reading" : "Read out loud"}
                          >
                            {speakingMessageId === msg.id ? (
                              <>
                                <VolumeX size={12} className="text-indigo-400" />
                                <span className="text-[10px] font-mono tracking-wider uppercase">STOP SPEECH</span>
                              </>
                            ) : (
                              <>
                                <Volume2 size={12} className="text-zinc-400" />
                                <span className="text-[10px] font-mono tracking-wider uppercase">READ OUT LOUD</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Chat Bubble Body */}
                    <div className={`p-5 md:p-6 rounded-2xl w-full ${
                      isUser 
                        ? "bg-white/10 border border-white/10 backdrop-blur-md rounded-tr-none"
                        : isErr
                        ? "bg-amber-950/20 border border-amber-900/40 text-amber-100 rounded-tl-none"
                        : "bg-white/5 border border-white/10 backdrop-blur-sm rounded-tl-none text-zinc-200"
                    }`}>
                      
                      {/* Msg Body Parser */}
                      <div className="prose prose-invert max-w-none prose-sm font-sans">
                        {renderFormattedMessage(msg.content)}
                      </div>

                      {/* Display Grounding Citations from Google Search Grounding */}
                      {!isUser && msg.grounding && msg.grounding.chunks && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <details className="group" open={false}>
                            <summary className="list-none flex items-center justify-between text-[11px] font-mono text-indigo-400 cursor-pointer select-none hover:text-indigo-300 transition-colors">
                              <span className="flex items-center gap-1.5 font-bold">
                                <Globe size={11} className="text-indigo-400 animate-pulse animate-radar" />
                                WEB RESEARCH SOURCES ({msg.grounding.chunks.filter(c => c.web).length})
                              </span>
                              <ChevronRight size={11} className="transition-transform group-open:rotate-90 text-zinc-500" />
                            </summary>
                            
                            <div className="mt-3 pl-1 space-y-2 max-h-40 overflow-y-auto">
                              {msg.grounding.chunks.map((chk, chkIdx) => {
                                if (!chk.web) return null;
                                return (
                                  <a
                                    key={chkIdx}
                                    href={chk.web.uri}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block p-3 rounded-xl bg-black/30 hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all text-xs text-zinc-300 hover:text-white space-y-1"
                                  >
                                    <div className="flex items-center justify-between font-mono text-[9px] text-indigo-400/80">
                                      <span>Source [{chkIdx + 1}]</span>
                                      <ExternalLink size={10} />
                                    </div>
                                    <p className="font-semibold truncate text-[11px] font-sans text-white">{chk.web.title}</p>
                                    <p className="text-[10px] text-zinc-500 font-mono truncate">{chk.web.uri}</p>
                                  </a>
                                );
                              })}
                            </div>
                          </details>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}

              {/* Kelvis cooking up response loader */}
              {isLoading && (
                <div id="kelvis-loading-turn" className="flex flex-col items-start gap-2.5 max-w-[95%] w-full">
                  <div className="flex items-center gap-2 ml-1">
                    <div className="w-6 h-6 bg-white/15 rounded flex items-center justify-center text-[10px] text-white font-extrabold shrink-0 animate-pulse">
                      K
                    </div>
                    <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase animate-pulse">Kelvis is contemplating...</span>
                  </div>
                  <div className="w-full max-w-sm rounded-2xl p-5 bg-white/5 border border-white/10 text-zinc-400 rounded-tl-none space-y-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                      <RefreshCw size={12} className="animate-spin text-indigo-400" />
                      <span>
                        {activeSession?.personality === "roast" 
                          ? "Kelvis is preparing a hilarious roast..." 
                          : activeSession?.personality === "zen"
                          ? "Kelvis is taking a mindful breath..."
                          : activeSession?.personality === "lecturer"
                          ? "Professor Kelvis is preparing a grand academic lecture..."
                          : "Kelvis is fetching clever wisdom..."}
                      </span>
                    </div>
                    {/* Simulated pulse block */}
                    <div className="space-y-1.5 w-40">
                      <div className="h-2 bg-white/10 rounded animate-pulse w-full"></div>
                      <div className="h-2 bg-white/10 rounded animate-pulse w-5/6"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM PROMPT INPUT INTERFACES (Atmospheric glass bar) */}
        <div className="p-6 md:p-8 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent border-t border-white/5 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto space-y-3">
            
            {/* INPUT PANEL CONTAINS INPUT & ACTIONS */}
            <form
              id="prompt-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center"
            >
              <input
                id="Kelvis-main-chat-input"
                type="text"
                autoComplete="off"
                placeholder={
                  activeSession?.personality === "roast"
                    ? "Feed me ideas to grill... (roast in progress)"
                    : activeSession?.personality === "zen"
                    ? "Speak calmly, seeker of quiet peace..."
                    : "Ask Kelvis anything..."
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="w-full bg-white/5 border border-white/20 backdrop-blur-xl rounded-2xl p-4 pr-32 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/40 h-14 font-sans focus:ring-0 focus:ring-transparent transition-all"
              />

              {/* Absolute Action Container on the Right side of Input */}
              <div className="absolute right-3.5 flex items-center gap-2">
                {/* Search Toggle icon inline */}
                <button
                  id="input-inline-search-toggle"
                  type="button"
                  onClick={toggleWebSearch}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeSession?.webSearch 
                      ? "text-indigo-400 bg-white/10" 
                      : "text-zinc-500 hover:text-white"
                  }`}
                  title="Toggle web search citations"
                >
                  <Globe size={16} className={activeSession?.webSearch ? "animate-radar animate-pulse" : ""} />
                </button>

                {/* Send action arrow */}
                <button
                  id="send-prompt-btn"
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all duration-200 cursor-pointer ${
                    inputValue.trim() && !isLoading
                      ? "bg-white text-black hover:bg-zinc-200"
                      : "bg-white/10 text-zinc-500"
                  }`}
                >
                  <Send size={15} />
                </button>
              </div>
            </form>

            {/* Micro details footnote matches design layout */}
            <div className="flex justify-center gap-6 pt-1">
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium font-mono">
                Search {activeSession?.webSearch ? "Enabled" : "Disabled"}
              </span>
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium font-mono">
                Citations {activeSession?.webSearch ? "On" : "Off"}
              </span>
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium font-mono">
                Kelvis Cortex Ultra
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
