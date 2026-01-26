# Nebula IDE

Nebula is a cross-platform agentic IDE that enables non-technical users — product managers, designers, and domain experts — to build production-grade applications by conversing with an AI-powered orchestrator. Instead of writing code directly, users describe what they want in natural language. A hierarchy of specialized AI agents (CTO Agent, Engineering, Testing, DevOps, Security, Scribing, and more) collaborates autonomously to design, build, test, deploy, and document the application.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Tauri v2 Shell                  │
│          (Rust backend + Web frontend)          │
├──────────┬──────────────────────┬───────────────┤
│ Projects │   Conversation UI    │   Evidence    │
│ Sidebar  │   Plan Progress      │   Panel       │
│          │   Agent Builder       │   Code Viewer │
├──────────┴──────────────────────┴───────────────┤
│              Agent Runtime (TypeScript)          │
│  ┌─────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ CTO │→ │ Dept.    │→ │ Worker Agents     │  │
│  │ L1  │  │ Heads L2 │  │ L3               │  │
│  └─────┘  └──────────┘  └───────────────────┘  │
├─────────────────────────────────────────────────┤
│              MCP Server Framework               │
│  Repository │ Documentation │ Linear │ Deploy   │
│  Observability                                  │
├─────────────────────────────────────────────────┤
│              Core Services                      │
│  Git │ Policy │ Audit │ Security │ Telemetry    │
│  Testing │ Deployment │ Governance │ Multi-cloud│
├─────────────────────────────────────────────────┤
│              Integrations                       │
│  Obsidian Vault │ Linear │ Figma               │
├─────────────────────────────────────────────────┤
│              Stack Packs                        │
│  TS/Next.js │ Python/Django │ Erlang │ Elixir  │
│  Rust/Axum                                     │
└─────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Tauri v2 (Rust) |
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS with custom Nebula design tokens |
| State | Zustand + Immer |
| Data Fetching | TanStack React Query |
| Agent Graph Editor | ReactFlow |
| Code Editor | Monaco Editor |
| Agent Protocol | Model Context Protocol (MCP) |
| Integrations | Obsidian, Linear (GraphQL), Figma REST API |

## Agent Hierarchy

Nebula uses a three-level agent hierarchy:

- **Level 1 — CTO Agent**: Decomposes user requests into workstream plans, delegates to department heads, enforces policy gates.
- **Level 2 — Department Heads**: Engineering, Testing, DevOps, Security, Scribing, Product, Design agents that coordinate domain-specific work.
- **Level 3 — Worker Agents**: Stack-specific agents (e.g., `ts-nextjs-worker`, `python-django-worker`) that perform concrete code generation, test execution, and deployments.

## Key Features

- **Conversational Development**: Describe features in plain language; agents build them end-to-end.
- **Five-Phase Execution**: Every request flows through Design → Build → Test → Deploy → Document.
- **Policy Engine**: Machine-enforced rules for agent permissions, deployment gates, data classification, and tool access.
- **Immutable Audit Log**: Every agent action, tool call, and decision is recorded for full traceability.
- **Stack Packs**: Opinionated, production-ready scaffolds for TypeScript/Next.js, Python/Django, Erlang/BEAM, Elixir/BEAM, and Rust/Axum.
- **Progressive Delivery**: Canary and blue-green deployments via Argo Rollouts, Azure Functions slot swaps, and AWS CodeDeploy.
- **Multi-Cloud Resilience**: Azure primary / AWS standby with PostgreSQL logical replication and Traffic Manager failover.
- **Security Hardening**: Secret scanning, prompt injection defense, data classification routing, output redaction.
- **Observability**: OpenTelemetry collector configuration, per-stack instrumentation, auto-generated runbooks.
- **Documentation Lattice**: Three-level Obsidian vault structure (atomic change notes → service docs → system-wide views).
- **Visual Agent Builder**: ReactFlow-based canvas for designing custom agent workflows.
- **Embedded Code Viewer**: Monaco Editor with file tree, diff view, blame, and structural outline.

## Project Structure

```
nebula/
├── src/                        # React frontend
│   ├── app/                    # App root
│   ├── components/             # UI components
│   │   ├── layout/             # MainLayout, TitleBar
│   │   ├── conversation/       # Chat interface
│   │   ├── plan/               # Plan progress tracking
│   │   ├── evidence/           # Evidence panel
│   │   ├── projects/           # Project sidebar, dialogs
│   │   ├── agent-builder/      # Visual agent graph editor
│   │   └── code-viewer/        # Monaco-based code viewer
│   ├── services/               # Business logic
│   │   ├── agents/             # Runtime, testing, security, governance
│   │   ├── mcp/                # MCP server framework
│   │   ├── git/                # Git operations
│   │   ├── deployment/         # K8s, serverless, multi-cloud
│   │   ├── telemetry/          # OpenTelemetry config generation
│   │   ├── policy/             # Policy enforcement
│   │   ├── audit/              # Audit logging
│   │   ├── obsidian/           # Obsidian vault integration
│   │   ├── linear/             # Linear issue tracking
│   │   └── figma/              # Figma design integration
│   ├── stores/                 # Zustand state stores
│   ├── hooks/                  # React hooks
│   ├── types/                  # TypeScript type definitions
│   ├── lib/                    # Tauri API bridge
│   └── styles/                 # Global CSS
├── src-tauri/                  # Rust backend
│   ├── src/                    # Rust source (commands, policy, audit, vault)
│   └── capabilities/           # Tauri permission capabilities
├── packages/                   # Shared packages
│   └── stack-packs/            # Stack pack registry
├── vault/                      # Obsidian vault templates
│   └── templates/              # Level 0/1/2 note templates
└── tests/                      # Test directories
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/) (stable toolchain)
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/) v2

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode (launches Tauri window)
npm run tauri:dev

# Type-check the frontend
npm run typecheck

# Build for production
npm run tauri:build
```

## License

Proprietary. All rights reserved.
