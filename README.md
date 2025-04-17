https://github.com/user-attachments/assets/364b6705-14d4-4e6d-bea7-fb9f12664fab


# Getting Started

## Set Up Environment Variables:

```sh
touch .env
```

Add the following inside `.env` at the root:

```sh
LANGSMITH_API_KEY=lsv2_...
OPENAI_API_KEY=sk-...
```

Next, create another `.env` file inside the `agent` folder:

```sh
cd agent
touch .env
```

Add the following inside `agent/.env`:

```sh
OPENAI_API_KEY=sk-...
LANGSMITH_API_KEY=lsv2_...
```

## Set Up Poetry:

Poetry is used for dependency management in the agent service. To install Poetry, run:

```sh
pip install poetry
```

To verify the installation, run:

```sh
poetry --version
```

## Development

We recommend running the **frontend and agent separately** in different terminals to debug errors and logs:

```bash
# Terminal 1 - Frontend
pnpm run dev-frontend

# Terminal 2 - Agent
pnpm run dev-agent
```

Alternatively, you can run both services together with:

```bash
pnpm run dev
```

Then, open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

The codebase is split into two main parts:

1. `/agent` **folder** – A LangGraph agent that connects to MCP servers and calls their tools.
2. `/app` **folder** – A frontend application using CopilotKit for UI and state synchronization.