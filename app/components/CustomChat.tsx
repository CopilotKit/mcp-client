'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useCopilotChat } from "@copilotkit/react-core";
import { useCopilotContext } from "@copilotkit/react-core";
import { Role, TextMessage, Message } from "@copilotkit/runtime-client-gql";
import { ArrowUp, Settings, Plus, PanelLeft, PanelLeftDashed, CircleStop } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';

// Constants
const CHAT_HISTORY_KEY = 'chat-history';

// Type guard for TextMessage
const isTextMessage = (message: unknown): message is TextMessage => {
  return message !== null && 
         typeof message === 'object' && 
         message !== undefined && 
         'content' in message && 
         'role' in message;
};

interface ChatSession {
  id: string;
  threadId: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface CustomChatProps {
  onSettingsClick?: () => void;
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
  hasApiKey?: boolean;
}

// Helper function to get time-based greeting
const getTimeBasedGreeting = (): React.ReactNode => {
  // Static greeting about CopilotKit MCP Client
  return (
    <div className="text-center">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
        👋 Welcome to <span className="text-blue-900">CopilotKit Open MCP Client</span>
      </h1>
      <p className="mt-3 text-base md:text-lg text-gray-600">
        You can add your MCP servers in the settings and start chatting.
        <span className="text-yellow-500 font-semibold ml-1">Enjoy! 😊</span>
      </p>
    </div>
  );
  /*
  const currentHour = new Date().getHours();
  const random = Math.floor(Math.random() * 4); // Random number 0-3 for variety
  
  // Morning greetings (5 AM to 12 PM)
  if (currentHour >= 5 && currentHour < 12) {
    const morningGreetings = [
      "☀️ Rise and shine!",
      "🌅 Good morning!",
      "🌞 Morning! Ready for today?",
      "🐦 Hello, early bird!"
    ];
    return morningGreetings[random];
  } 
  // Afternoon greetings (12 PM to 5 PM)
  else if (currentHour >= 12 && currentHour < 17) {
    const afternoonGreetings = [
      "🌤️ Good afternoon!",
      "👋 Hey there!",
      "🕑 Afternoon!",
      "☕ Coffee time?"
    ];
    return afternoonGreetings[random];
  } 
  // Evening greetings (5 PM to 9 PM)
  else if (currentHour >= 17 && currentHour < 21) {
    const eveningGreetings = [
      "🌆 How was your day?",
      "🌙 Good evening!",
      "✨ Evening!",
      "🛋️ Winding down?"
    ];
    return eveningGreetings[random];
  } 
  // Late night greetings (9 PM to 5 AM)
  else {
    const lateNightGreetings = [
      "💻 Working late?",
      "🌜 Still up?",
      "🔥 Burning the midnight oil?",
      "🦉 Hello, night owl!"
    ];
    return lateNightGreetings[random];
  }
  */
};

export const CustomChat = forwardRef<{ handleNewChat: () => void, handleSidebarToggle: () => void }, CustomChatProps>((props, ref) => {
  const { onSettingsClick, isSidebarOpen, onSidebarToggle, hasApiKey = true } = props;
  const { visibleMessages, appendMessage, isLoading, stopGeneration, setMessages } = useCopilotChat();
  const { setThreadId } = useCopilotContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [greeting, setGreeting] = useState<React.ReactNode>('Hello!');
  
  // Chat history state
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Add state for dropdown menu and rename functionality
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Add ref for click outside detection
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRename = (chatId: string) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setRenameValue(chat.title);
      setIsRenaming(chatId);
      setActiveDropdownId(null);
    }
  };

  const handleRenameSubmit = (chatId: string) => {
    if (renameValue.trim()) {
      setChatHistory(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, title: renameValue.trim() }
          : chat
      ));
      setIsRenaming(null);
      setRenameValue('');
    }
  };

  const handleDropdownToggle = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDropdownId(activeDropdownId === chatId ? null : chatId);
  };

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        // Reconstruct Message objects from plain objects
        const reconstructedHistory = history.map((chat: ChatSession) => ({
          ...chat,
          // Ensure threadId exists (for backward compatibility)
          threadId: chat.threadId || `thread-${chat.id}`,
          messages: chat.messages
            .filter(isTextMessage) // Keep only messages that pass the TextMessage type guard
            .map(msg => new TextMessage({ // Reconstruct only these filtered messages
              content: msg.content,
              role: msg.role,
              // Ensure ID exists, important for React keys
              id: msg.id || uuidv4() // Generate a new UUID if ID is missing
            }))
        }));
        setChatHistory(reconstructedHistory);
        
        // If there's at least one chat, load the most recent one
        if (reconstructedHistory.length > 0 && !activeChatId) {
          const mostRecentChat = reconstructedHistory[0];
          setActiveChatId(mostRecentChat.id);
          setThreadId(mostRecentChat.threadId);
          setMessages(mostRecentChat.messages);
        }
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      // Reset to empty state if there's an error
      setChatHistory([]);
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
    } catch (error) {
      console.error("Error saving chat history:", error);
    }
    
    // Update chat history when messages change
    if (activeChatId && visibleMessages.length > 0) {
      setChatHistory(prevHistory => {
        return prevHistory.map(chat => {
          if (chat.id === activeChatId) {
            return {
              ...chat,
              messages: visibleMessages,
              updatedAt: Date.now()
            };
          }
          return chat;
        });
      });
    }
  }, [visibleMessages, activeChatId, setMessages, setThreadId]);

  // Update active chat when messages change
  useEffect(() => {
    if (activeChatId && visibleMessages.length > 0) {
      setChatHistory(prevHistory => {
        return prevHistory.map(chat => {
          if (chat.id === activeChatId) {
            return {
              ...chat,
              messages: visibleMessages,
              updatedAt: Date.now()
            };
          }
          return chat;
        });
      });
    }
  }, [visibleMessages, activeChatId]);

  // This effect handles the case where a new chat gets its first message
  // It ensures the chat appears in the sidebar once it has content
  useEffect(() => {
    // If we have an active chat and it just got its first message
    if (activeChatId && visibleMessages.length === 1 && isTextMessage(visibleMessages[0]) && visibleMessages[0].role === Role.User) {
      // Force a re-render of the sidebar by updating the chat history
      setChatHistory(prev => [...prev]);
    }
  }, [visibleMessages, activeChatId]);

  useEffect(() => {
    // Focus input when component mounts, messages change, or new chat is created
    if (inputRef.current && !isLoading) {
      inputRef.current.focus();
    }
  }, [visibleMessages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Set the greeting on the client side to avoid hydration errors
    setGreeting(getTimeBasedGreeting());
  }, []);

  useEffect(scrollToBottom, [visibleMessages]);

  const handleNewChat = () => {
    // Check if the current chat is already a new empty chat
    const currentChat = activeChatId ? chatHistory.find(chat => chat.id === activeChatId) : null;
    
    // If we're already in a new chat with no messages, don't create another one
    if (currentChat && currentChat.messages.length === 0) {
      return; // Already in a new chat, no need to create another one
    }
    
    const newChatId = Date.now().toString();
    const threadId = uuidv4();  // Create a valid UUID for LangGraph Platform
    
    // Clear any existing thread state first
    setThreadId("");
    setMessages([]);
    
    // Small delay to ensure thread is cleared before setting the new one
    setTimeout(() => {
    const newChat: ChatSession = {
      id: newChatId,
        threadId: threadId,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setChatHistory(prev => [newChat, ...prev]);
      setActiveChatId(newChatId);
      setThreadId(threadId);  // Set the thread ID in CopilotKit
      setInputValue('');
    }, 50);
  };

  useImperativeHandle(ref, () => ({
    handleNewChat,
    handleSidebarToggle: onSidebarToggle
  }));

  const loadChat = (chatId: string) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      // Clear any existing thread state first
      setThreadId("");
      setMessages([]);
      
      // Small delay to ensure thread is cleared before setting the new one
      setTimeout(() => {
        setActiveChatId(chatId);
        setThreadId(chat.threadId);  // Set the thread ID in CopilotKit
        setMessages(chat.messages);
      }, 50);
    }
  };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setMessages([]);
    }
  };

  const sendMessage = () => {
    if (inputValue.trim()) {
      if (!activeChatId) {
        // Create new chat if none is active
        const newChatId = Date.now().toString();
        const threadId = uuidv4();  // Create a valid UUID for LangGraph Platform
        
        const newChat: ChatSession = {
          id: newChatId,
          threadId: threadId,
          title: inputValue.length > 15 ? `${inputValue.slice(0, 15)}...` : inputValue,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        setChatHistory(prev => [newChat, ...prev]);
        setActiveChatId(newChatId);
        setThreadId(threadId);  // Set the thread ID in CopilotKit
      } else {
        // Update title if this is the first message in the chat
        setChatHistory(prev => prev.map(chat => {
          if (chat.id === activeChatId && chat.messages.length === 0) {
            return {
              ...chat,
              title: inputValue.length > 35 ? `${inputValue.slice(0, 35)}...` : inputValue
            };
          }
          return chat;
        }));
      }
      
      appendMessage(new TextMessage({ content: inputValue, role: Role.User }));
      setInputValue('');
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    }
  };

  const markdownComponents: Components = {
    a: ({ children, ...props }) => (
      <a target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    )
  };

  return (
    <div className="flex h-full bg-[#F5F8FF]">
      {/* Chat History Sidebar */}
      <div className={`${isSidebarOpen ? 'w-72' : 'w-0'} h-screen fixed left-0 top-0 bg-[#FFFBF5] border-r border-gray-200 transition-all duration-300 overflow-hidden z-[10]`}>
        <div className="pt-24 p-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[#6666FC] font-bold rounded-md hover:text-[#120635] transition-colors text-sm"
          >
            <div className="bg-[#6666FC] hover:bg-[#120635] rounded-full p-1">
              <Plus size={16} className="text-white" />
            </div>
            New chat
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-5rem)]">
          {chatHistory
            .filter(chat => chat.messages.length > 0) // Only show chats with messages
            .map((chat) => (
            <div
              key={chat.id}
              onClick={() => loadChat(chat.id)}
              className={`group flex items-center justify-between p-3 hover:bg-[#D4E1FF] cursor-pointer relative rounded-md mx-2 my-1 text-sm ${
                activeChatId === chat.id ? 'bg-[#D4E1FF]' : ''
              }`}
            >
              <div className="flex items-center gap-2 truncate flex-grow">
                {/* <MessageSquare size={18} /> */}
                {isRenaming === chat.id ? (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRenameSubmit(chat.id);
                    }}
                    className="flex-grow"
                    onClick={e => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded"
                      autoFocus
                      onBlur={() => handleRenameSubmit(chat.id)}
                    />
                  </form>
                ) : (
                  <span className="truncate">{chat.title}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleDropdownToggle(chat.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-700 p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
                {activeDropdownId === chat.id && (
                  <div 
                    ref={dropdownRef}
                    className="fixed transform translate-y-12 translate-x-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleRename(chat.id)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Rename
                    </button>
                    <button
                      onClick={(e) => deleteChat(chat.id, e)}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onSidebarToggle}
          className="absolute top-4 left-4 text-gray-500 hover:text-gray-800"
        >
          {isSidebarOpen ? <PanelLeftDashed size={20} /> : <PanelLeft size={20} />}
        </button>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${isSidebarOpen ? 'ml-64' : ''} transition-all duration-300`}>
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 bg-[#faf9f5] p-4 flex justify-between items-center z-10">
          {!isSidebarOpen && (
            <button
              onClick={onSidebarToggle}
              className="text-gray-500 hover:text-gray-800"
            >
              <PanelLeft size={20} />
            </button>
          )}
          <h1 className="text-xl font-semibold"></h1>
          <button
            onClick={onSettingsClick}
            className="p-2 text-gray-600 hover:text-gray-900"
            aria-label="Open Settings"
          >
            <Settings className="h-6 w-6" />
          </button>
        </div>
        {/* Main content area */}
        <div className={`flex-grow flex flex-col ${visibleMessages.length === 0 ? 'justify-center' : 'justify-start'} max-w-3xl mx-auto w-full px-4 pb-12 h-[calc(100vh-120px)]`}>
          {/* Initial State: Centered Greeting  */}
          {visibleMessages.length === 0 ? (
            <div className="text-center -mt-64">
              <div className="flex justify-center items-center mb-8">
                <h1 className="text-2xl font-bold text-[#120635] font-serif whitespace-pre-line">{greeting}</h1>
              </div>
              {/* GitHub link */}
              <div className="flex justify-center items-center mb-8">
                <a 
                  href="https://github.com/CopilotKit/mcp-client" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                  </svg>
                  <span>View on GitHub</span>
                </a>
              </div>
              {/* Input area for initial state */}
              <div className="bg-white rounded-lg shadow-md border border-gray-400 overflow-hidden p-1 max-w-2xl mx-auto">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="How can I help you today?"
                    className="w-full px-4 py-4 border-none focus:outline-none focus:ring-0 text-gray-800"
                  />
                </div>
                <div className="flex justify-between items-center px-4 py-2">
                  <div className="flex items-center">
                    <button
                      onClick={handleSettingsClick}
                      className="text-gray-400 hover:text-gray-600"
                      title="Settings"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={sendMessage}
                      disabled={isLoading || !inputValue.trim()}
                      className={`p-1.5 rounded-md ${inputValue.trim() ? 'bg-[#6666FC] text-white' : 'bg-[#120635] text-white'} hover:bg-[#6666FC] hover:text-white transition-colors`}
                    >
                      <ArrowUp className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Chat View: Messages Area
            <div style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }} className="flex-grow overflow-y-auto py-6 space-y-6 w-full [&::-webkit-scrollbar]:hidden max-h-full h-[calc(100vh-180px)]">
              {visibleMessages.map((msg) => {
                let contentToRender: React.ReactNode = null;
                let alignmentClass = 'justify-start'; // Default to assistant/left alignment

                // --- Inline Checks for Rendering Logic ---

                // USER MESSAGE
                if ('role' in msg && msg.role === Role.User && 'content' in msg && typeof msg.content === 'string' && msg.content.trim() !== '') {
                  alignmentClass = 'justify-start';  
                  contentToRender = (
                    <div className="flex items-center gap-3">
                      <div className={`inline-flex items-center gap-2 max-w-3xl bg-[#D4E1FF] px-3 py-2 rounded-lg text-gray-800`}>
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 p-1">
                          <span className="text-white font-bold text-sm">U</span>
                        </div>
                        <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  );
                }
                // ACTION EXECUTION MESSAGE (Agent Start)
                // Check type exists and is ActionExecutionMessage, then check name exists
                else if ('type' in msg && msg.type === 'ActionExecutionMessage' && 'name' in msg && typeof msg.name === 'string') {
                  contentToRender = (
                    <div className="text-sm text-gray-500 italic">
                      🔍️Using <span className="font-semibold">{msg.name}</span>...
                    </div>
                  );
                }
                // ASSISTANT TEXT MESSAGE
                // Check role exists and is Assistant, then check content is valid string
                // Also ensure it's not an ActionExecutionMessage that we handled above
                else if ('role' in msg && msg.role === Role.Assistant && 'content' in msg && typeof msg.content === 'string' && msg.content.trim() !== '' && (!('type' in msg) || msg.type !== 'ActionExecutionMessage')) {
                  if ('tool_calls' in msg && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
                    const toolCall = msg.tool_calls[0];
                    if (toolCall?.function?.name) {
                      contentToRender = (
                         <div className="text-sm text-gray-500 italic">
                           (Tool Call: {toolCall.function.name})
                         </div>
                      );
                    }
                  }
                  if (!contentToRender && 'content' in msg && typeof msg.content === 'string' && msg.content.trim() !== '') {
                    contentToRender = (
                      <div
                      className={`inline-block max-w-3xl text-gray-900 leading-relaxed text-lg prose prose-sm prose-gray max-w-none space-y-6`}
                      >
                        <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                      </div>
                    );
                  }
                }
                // --- End Inline Checks ---

                // Skip rendering if no displayable content could be determined for this message
                if (!contentToRender) {
                  return null;
                }

                return (
                  <div
                    key={msg.id}
                    className="w-full"
                  >
                    {/* Message bubble with alignment */}
                    <div className={`max-w-full flex ${alignmentClass}`}>
                      {contentToRender}
                    </div>
                  </div>
                );
              })}
              {/* Loading Indicator */}
              {isLoading && (
                <div className="w-full">
                  <div className="text-gray-400">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} /> {/* Scroll anchor */}
            </div>
          )}
        </div>

        {/* Input Area: Only show in chat view (not initial state) */}
        {visibleMessages.length > 0 && (
          <div className="border-t border-gray-100 bg-[#faf9f5] w-full py-4">
            <div className="max-w-3xl mx-auto">
              {/* Input Row */}
              <div className="fixed bottom-5 bg-white rounded-lg shadow-sm border border-gray-400 overflow-hidden z-50 w-full max-w-3xl">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={hasApiKey ? "How can I help you today?" : "Please add your OpenAI API key to use the chat"}
                    className="w-full px-4 py-3 border-none focus:outline-none focus:ring-0 text-gray-800"
                    disabled={isLoading || !hasApiKey}
                  />
                  {/* Add overlay when API key is missing */}
                  {!hasApiKey && (
                    <div 
                      className="absolute inset-0 bg-gray-100 bg-opacity-60 flex items-center justify-center cursor-not-allowed"
                      onClick={onSettingsClick}
                    >
                      <div className="text-sm text-gray-600 font-medium flex items-center">
                        <span className="mr-2">Add API Key to unlock chat</span>
                        <button className="px-3 py-1 bg-[#120635] hover:bg-[#6666fc] text-white rounded-md text-xs">
                          Open Settings
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center px-4 py-2">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleSettingsClick}
                      className="text-gray-400 hover:text-gray-600"
                      title="Settings"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center">
                    {isLoading ? (
                      <button
                        onClick={stopGeneration}
                        className="p-1.5 rounded-md bg-[#120635] text-white hover:bg-[#6666fc] transition-colors"
                        title="Stop Generation"
                      >
                        <CircleStop className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={sendMessage}
                        disabled={!inputValue.trim() || !hasApiKey}
                        className={`p-1.5 rounded-md ${inputValue.trim() && hasApiKey ? 'bg-[#6666FC] text-white' : 'bg-[#120635] text-white'} hover:bg-[#6666FC] hover:text-white transition-colors`}
                      >
                        <ArrowUp className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

CustomChat.displayName = 'CustomChat';
