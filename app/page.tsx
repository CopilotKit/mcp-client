"use client";

import { CopilotActionHandler } from "./components/CopilotActionHandler";
import { CustomChat } from './components/CustomChat';
import { RightSidebar } from './components/RightSidebar';
import { SettingsIcon } from './components/Icons';
import { Plus } from 'lucide-react';
import SpreadsheetRenderer from "./components/SpreadsheetRenderer";
import { INSTRUCTIONS } from "./instructions";
import { useState, useRef } from "react";
import { MCPConfigForm } from "./components/MCPConfigForm";
import { PanelLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);
  const chatRef = useRef<{ handleNewChat: () => void, handleSidebarToggle: () => void }>(null);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Client component that sets up the Copilot action handler */}
      <CopilotActionHandler />

      {/* Main content area (optional, could be integrated elsewhere or removed if chat is the main focus) */}
      {/* This section below should be removed as it duplicates the sidebar content */}
      {/* <div className="flex-1 p-4 md:p-8 lg:mr-[30vw]"> */}
      {/*   <MCPConfigForm showSpreadsheet={showSpreadsheet} */}
      {/*     setShowSpreadsheet={setShowSpreadsheet} /> */}
      {/*   {showSpreadsheet && <SpreadsheetRenderer />} */}
      {/* </div> */}

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
           <CustomChat ref={chatRef} onSettingsClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        </div>
      </div>

      {/* Right Sidebar for Settings/Data */}
      <RightSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
}
