import {
    CopilotRuntime,
    copilotRuntimeNextJSAppRouterEndpoint,
    langGraphPlatformEndpoint,
    LangChainAdapter
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";
import { ChatOpenAI } from "@langchain/openai";

// Configure runtime upfront - this doesn't depend on the API key
const runtime = new CopilotRuntime({
    remoteEndpoints: [
        langGraphPlatformEndpoint({
            deploymentUrl: `${process.env.AGENT_DEPLOYMENT_URL || 'http://localhost:8123'}`,
            langsmithApiKey: process.env.LANGSMITH_API_KEY,
            agents: [
                {
                    name: 'mcp_agent', 
                    description: 'A helpful LLM agent.',
                }
            ]
        }),
    ],
});

export const POST = async (req: NextRequest) => {
    // Extract the user's API key from the request headers
    const openaiApiKey = req.headers.get("x-openai-api-key");
    
    // Create model with the API key from headers
    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0,
        apiKey: openaiApiKey || process.env["OPENAI_API_KEY"],
    });
    
    // Create service adapter with the model
    const serviceAdapter = new LangChainAdapter({
        chainFn: async ({ messages, tools }) => {
            return model.bindTools(tools, { strict: true }).stream(messages);
        },
    });

    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
        runtime,
        serviceAdapter,
        endpoint: "/api/copilotkit",
    });

    return handleRequest(req);
};