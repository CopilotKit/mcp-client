'use client';

import React, { useRef, useEffect } from 'react';
import { MCPConfigForm } from './MCPConfigForm';
// import SpreadsheetRenderer from './SpreadsheetRenderer';

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeySaved: () => void;
}

export function RightSidebar({ isOpen, onClose, onApiKeySaved }: RightSidebarProps) {
  // const [showSpreadsheet, setShowSpreadsheet] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[70]" onClick={onClose} />
      <div 
        ref={sidebarRef}
        className="fixed top-0 right-0 h-full w-full md:w-[80vw] lg:w-[30vw] bg-[#f5f4ed] shadow-lg border-l border-gray-200 z-[70] transform transition-transform duration-300 ease-in-out translate-x-0"
      >
        <div className="p-4 flex justify-between items-center border-b">
          <h2 className="text-lg font-semibold">Settings </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-65px)]">
          <MCPConfigForm 
            // showSpreadsheet={showSpreadsheet} 
            // setShowSpreadsheet={setShowSpreadsheet} 
            onApiKeySaved={onApiKeySaved}
          />
          {/* {showSpreadsheet && <SpreadsheetRenderer />} */}
        </div>
      </div>
    </>
  );
}
