"use client";

import { CopilotActionHandler } from "./components/CopilotActionHandler";
import { CustomChat } from './components/CustomChat';
import { RightSidebar } from './components/RightSidebar';
import { SettingsIcon } from './components/Icons';
import { Plus, AlertTriangle } from 'lucide-react';
// import SpreadsheetRenderer from "./components/SpreadsheetRenderer";
// import { INSTRUCTIONS } from "./instructions";
import { useState, useRef, useEffect } from "react";
// import { MCPConfigForm } from "./components/MCPConfigForm";
import { PanelLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";

// Helper function to get a cookie by name
const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined; 
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
};

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showApiKeyNotification, setShowApiKeyNotification] = useState(false); 
  // const [showSpreadsheet, setShowSpreadsheet] = useState(false);
  const chatRef = useRef<{ handleNewChat: () => void, handleSidebarToggle: () => void }>(null);

  useEffect(() => {
    // Check for API key cookie on mount
    const apiKey = getCookie('openai-api-key');
    if (!apiKey) {
      setShowApiKeyNotification(true);
    }
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Client component that sets up the Copilot action handler */}
      <CopilotActionHandler />

      {/* Chat Area - takes full width or most width, sidebar overlays */}
      <div className=" flex-1 flex flex-col relative">
        {/* Header with Settings Button */}
        <div className="fixed top-0 left-0 right-0 bg-[#faf9f5] p-4 flex justify-between items-center z-[60]">
           <button
             onClick={() => chatRef.current?.handleSidebarToggle()}
             className="text-gray-500 hover:text-gray-800"
           >
             <PanelLeft size={20} />
           </button>
           <div className="flex items-center gap-1">
             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <button
                     className="flex items-center gap-2 px-3 py-1 text-[#c96442] font-bold rounded-md transition-colors text-sm"
                     onClick={() => chatRef.current?.handleNewChat()}
                   >
                     <div className="bg-[#c96442] rounded-sm p-2">
                       <Plus size={16} className="text-white" />
                     </div>
                   </button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>New Chat</p>
                 </TooltipContent>
               </Tooltip>
             </TooltipProvider>

             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <button
                     onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                     className="p-2 text-gray-600 hover:text-gray-900"
                     aria-label="Open Settings"
                   >
                     <SettingsIcon className="h-6 w-6" />
                   </button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Settings</p>
                 </TooltipContent>
               </Tooltip>
             </TooltipProvider>
           </div>
        </div>

       

          {/* Custom Chat Component */} 
        <div className="flex-grow pt-16"> {/* Ensure chat takes remaining height */}
            {showApiKeyNotification && (
              <div className="absolute top-20 left-0 right-0 z-50 flex justify-center">
                <div className="max-w-2xl w-full mx-auto px-4">
                  <div className="rounded-xl border border-[#c96442] bg-[#fff8f5] px-6 py-4 shadow-md flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-[#c96442] mt-1 flex-shrink-0" />
                      <div className="text-sm text-[#7d3f2a]">
                        <p className="font-semibold mb-1">Missing API Key</p>
                        <p>Please add your OpenAI API key to unlock all features of this chat experience.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="self-center bg-[#c96442] hover:bg-[#b05739] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Open Settings
                    </button>
                  </div>
                </div>
              </div>
            )}
            <CustomChat ref={chatRef} onSettingsClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        </div>

      </div>

      {/* Right Sidebar for Settings/Data */}
      <RightSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
}
