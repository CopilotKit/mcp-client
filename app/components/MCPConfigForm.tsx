"use client";

import { useState, useEffect } from "react";
import { useCoAgent } from "@copilotkit/react-core";
// import { ExampleConfigs } from "./ExampleConfigs";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { Trash2, Save } from "lucide-react";

type ConnectionType = "stdio" | "sse";

interface StdioConfig {
  command: string;
  args: string[];
  transport: "stdio";
}

interface SSEConfig {
  url: string;
  transport: "sse";
}

type ServerConfig = StdioConfig | SSEConfig;

// Define a generic type for our state
interface AgentState {
  mcp_config: Record<string, ServerConfig>;
  openai_api_key?: string;
}

// Local storage key for saving agent state
const STORAGE_KEY = "mcp-agent-state";

const ExternalLink = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-3 h-3 ml-1 text-gray-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

// Define props type including the callback
interface MCPConfigFormProps {
  onApiKeySaved: () => void;
}

export function MCPConfigForm({ onApiKeySaved }: MCPConfigFormProps) {
  // Use our localStorage hook for persistent storage
  const [savedConfigs, setSavedConfigs] = useLocalStorage<
    Record<string, ServerConfig>
  >(STORAGE_KEY, {});
  
  const [savedApiKey, setSavedApiKey] = useLocalStorage<string>("openai-api-key", "");

  // Function to set a cookie
  const setCookie = (name: string, value: string, days = 365) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  };

  // Function to remove a cookie
  const removeCookie = (name: string) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict`;
  };

  // State for the API key input field - DECLARE EARLY
  // Initialize with potentially empty value from localStorage hook initially
  const [apiKeyInput, setApiKeyInput] = useState(savedApiKey || "");

  // Initialize agent state with the data from localStorage
  const { state: agentState, setState: setAgentState } = useCoAgent<AgentState>(
    {
      name: "mcp_agent",
      initialState: {
        mcp_config: savedConfigs,
        openai_api_key: savedApiKey,
      },
    }
  );

  // Effect to synchronize agentState API key when savedApiKey changes
  useEffect(() => {
    const currentAgentKey = agentState?.openai_api_key;
    // Update agentState only if the loaded key is different
    if (savedApiKey !== currentAgentKey) {
      // Ensure mcp_config is preserved correctly
      setAgentState(prevState => ({ 
        ...prevState,
        mcp_config: prevState?.mcp_config || {}, 
        openai_api_key: savedApiKey 
      }));
    }
    // Also update the local input state if it doesn't match the loaded key
    // This covers the initial load case where agentState might update after input is set
    if (apiKeyInput !== savedApiKey) {
      setApiKeyInput(savedApiKey || '');
    }
    // Dependencies: run when loaded key changes, or if agent key changes externally
  }, [savedApiKey, agentState?.openai_api_key, setAgentState]); 


  // Effect to synchronize agentState mcp_config when savedConfigs changes
  useEffect(() => {
    // Basic check to avoid unnecessary updates if objects are identical
    if (JSON.stringify(savedConfigs) !== JSON.stringify(agentState?.mcp_config)) {
      // Ensure openai_api_key is preserved correctly
      setAgentState(prevState => ({ 
        ...prevState, // Spread existing state first
        openai_api_key: prevState?.openai_api_key, // Explicitly keep existing api key
        mcp_config: savedConfigs // Update the configs
      }));
    }
  }, [savedConfigs, agentState?.mcp_config, setAgentState]);

  // Simple getter for configs - use agentState as the source of truth
  const configs = agentState?.mcp_config || {};
  
  // Simple getter for API key
  const apiKey = agentState?.openai_api_key || "";

  // Simple setter wrapper for configs
  const setConfigs = (newConfigs: Record<string, ServerConfig>) => {
    setAgentState({ ...agentState, mcp_config: newConfigs });
    setSavedConfigs(newConfigs);
  };
  
  // Simple setter for API key
  const setApiKey = (newApiKey: string) => {
    setAgentState({ ...agentState, openai_api_key: newApiKey });
    setSavedApiKey(newApiKey);
    setCookie("openai-api-key", newApiKey);
    onApiKeySaved(); // Call the callback function here
    
    // Refresh the page after setting the API key
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const [serverName, setServerName] = useState("");
  const [connectionType, setConnectionType] = useState<ConnectionType>("sse");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddServerForm, setShowAddServerForm] = useState(false);
  // const [showExampleConfigs, setShowExampleConfigs] = useState(false);

  // Calculate server statistics
  const totalServers = Object.keys(configs).length;
  const stdioServers = Object.values(configs).filter(
    (config) => config.transport === "stdio"
  ).length;
  const sseServers = Object.values(configs).filter(
    (config) => config.transport === "sse"
  ).length;

  // Set loading to false when state is loaded
  useEffect(() => {
    if (agentState) {
      setIsLoading(false);
    }
  }, [agentState]);

  const addConfig = () => {
    if (!serverName) return;

    const newConfig =
      connectionType === "stdio"
        ? {
            command,
            args: args.split(" ").filter((arg) => arg.trim() !== ""),
            transport: "stdio" as const,
          }
        : {
            url,
            transport: "sse" as const,
          };

    setConfigs({
      ...configs,
      [serverName]: newConfig,
    });

    // Reset form
    setServerName("");
    setCommand("");
    setArgs("");
    setUrl("");
    setShowAddServerForm(false);
  };

  const removeConfig = (name: string) => {
    const newConfigs = { ...configs };
    delete newConfigs[name];
    setConfigs(newConfigs);
  };

  if (isLoading) {
    return <div className="p-4">Loading configuration...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-1">
          <div className="flex items-center">
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-700">
              Open MCP Client
            </h1>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-slate-600">
              Manage and configure your MCP servers
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative w-full sm:w-auto">
              <button
                onClick={() => setShowAddServerForm(!showAddServerForm)}
                className="w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#6666FC] hover:bg-[#120635] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6666FC] flex items-center gap-1 justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Server
              </button>
              {showAddServerForm && (
                <div className="absolute z-10 right-0 mt-2 w-96 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none p-6 border border-gray-200">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Add New Server
                  </h3>
                  <button
                    onClick={() => setShowAddServerForm(false)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="serverNameInput"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Server Name
                      </label>
                      <input
                        id="serverNameInput"
                        type="text"
                        value={serverName}
                        onChange={(e) => setServerName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Give a name for your agent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Connection Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setConnectionType("sse")}
                          className={`px-3 py-2 border rounded-md text-center flex items-center justify-center text-sm ${
                            connectionType === "sse"
                              ? "bg-[#d4e1ff] border-[#6666fc] text-[#6666fc] font-medium ring-1 ring-[#6666fc]"
                              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                            />
                          </svg>
                          SSE
                        </button>
                        <button
                          type="button"
                          onClick={() => setConnectionType("stdio")}
                          className={`px-3 py-2 border rounded-md text-center flex items-center justify-center text-sm ${
                            connectionType === "stdio"
                              ? "bg-[#d4e1ff] border-[#6666fc] text-[#6666fc] font-medium ring-1 ring-[#6666fc]"
                              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 9l3 3m0 0l3-3m-3 3v8m0-13a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          STDIO
                        </button>
                      </div>
                    </div>

                    {connectionType === "stdio" ? (
                      <>
                        <div>
                          <label
                            htmlFor="commandInput"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Command
                          </label>
                          <input
                            id="commandInput"
                            type="text"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="e.g., python, node, ./my_agent"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="argsInput"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Arguments (space-separated)
                          </label>
                          <input
                            id="argsInput"
                            type="text"
                            value={args}
                            onChange={(e) => setArgs(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="e.g., agent.py --port 8000"
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label
                          htmlFor="urlInput"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Server URL
                        </label>
                        <input
                          id="urlInput"
                          type="text"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Add your agent URL here"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200 text-center text-sm text-gray-700">
                    Discover more servers at
                    <a href="https://mcp.composio.dev/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center ml-1">
                      mcp.composio.dev <ExternalLink />
                    </a>
                  </div>

                  <div className="flex justify-end space-x-3 pt-5 mt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowAddServerForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addConfig}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#6666fc] hover:bg-[#120635] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Add Server
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* OpenAI API Key Input */}
        <div className="mt-4 mb-6">
          <label htmlFor="openai-api-key" className="block text-sm font-medium text-gray-700 mb-1">
            OpenAI API Key
          </label>
          <div className="flex items-center gap-2">
            <input
              type="password"
              id="openai-api-key"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter your OpenAI API key"
              className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {/* Save Button */}
            <button
              onClick={() => {
                const trimmedKey = apiKeyInput.trim();
                if (trimmedKey) {
                  setApiKey(trimmedKey);
                }
              }}
              className={`p-2 rounded-md transition-colors ${
                apiKeyInput.trim() && apiKeyInput.trim() !== apiKey
                  ? "text-green-800 hover:text-white hover:bg-green-700"
                  : "text-gray-400 cursor-not-allowed"
              }`}
              disabled={!apiKeyInput.trim() || apiKeyInput.trim() === apiKey}
              aria-label="Save API Key"
            >
              <Save className="h-5 w-5" />
            </button>
            {/* Remove Button - shown only if key is saved */}
            {apiKey && (
              <button
                onClick={() => {
                  setApiKey("");
                  removeCookie("openai-api-key");
                  // Refresh the page after removing the API key
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
                className="p-2 text-red-800 hover:text-white hover:bg-red-400 rounded-md transition-colors"
                aria-label="Remove API Key"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Your API key will be stored locally and used for both frontend and backend.
          </p>
        </div>
      </div>

      {/* Server Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#FFFBF5] border-1 border-gray-400 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Total Servers</h3>
          <p className="text-2xl font-semibold text-gray-900">{totalServers}</p>
        </div>
        <div className="bg-[#FFFBF5] border-1 border-gray-400 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Stdio Servers</h3>
          <p className="text-2xl font-semibold text-gray-900">{stdioServers}</p>
        </div>
        <div className="bg-[#FFFBF5] border-1 border-gray-400 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-1">SSE Servers</h3>
          <p className="text-2xl font-semibold text-gray-900">{sseServers}</p>
        </div>
      </div>

      {/* Server List */}
      <div className="bg-[#FFFBF5] border-1 border-gray-400 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Server List</h2>
        {totalServers === 0 ? (
          <p className="text-gray-500 italic">No servers configured yet.</p>
        ) : (
          <ul className="space-y-3">
            {Object.entries(configs).map(([name, config]) => (
              <li key={name} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-[#FFFBF5] border-1 border-gray-400 rounded-md gap-2">
                <div className="flex-grow">
                  <span className="font-medium text-gray-800">{name}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ml-2" style={{backgroundColor: config.transport === 'stdio' ? '#e0e7ff' : '#d1fae5', color: config.transport === 'stdio' ? '#4338ca' : '#065f46'}}>
                     {config.transport}
                  </span>
                  <p className="text-sm text-gray-700 mt-1 break-all">
                    {config.transport === 'stdio' ? (
                      `Cmd: ${config.command} ${config.args.join(' ')}`
                    ) : (
                      `URL: ${config.url}`
                    )}
                  </p>
                </div>
                <div className="flex-shrink-0 mt-2 sm:mt-0">
                  <button
                    onClick={() => removeConfig(name)}
                    className="p-2 text-red-800 hover:text-white hover:bg-red-400 rounded-md transition-colors"
                    aria-label="Remove server"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-700">
          Discover more servers at
          <a href="https://mcp.composio.dev/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center ml-1 mr-2">
            mcp.composio.dev <ExternalLink />
          </a>
          and
          <a href="https://www.mcp.run/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center ml-1">
            mcp.run <ExternalLink />
          </a>
        </div>
      </div>
    </div>
  );
}
