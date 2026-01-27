import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useAgentStore } from "@/stores/agentStore";
import { MessageBubble } from "./MessageBubble";
import { AttachmentBar } from "./AttachmentBar";
import type { ConversationMessage, Workstream } from "@/types/workstream";

export function ConversationPane() {
  const conversation = useProjectStore((s) => s.conversation);
  const addMessage = useProjectStore((s) => s.addMessage);
  const addWorkstream = useProjectStore((s) => s.addWorkstream);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeWorkstreamId = useProjectStore((s) => s.activeWorkstreamId);
  const setActiveWorkstream = useProjectStore((s) => s.setActiveWorkstream);
  const isExecuting = useAgentStore((s) => s.isExecuting);
  const setExecuting = useAgentStore((s) => s.setExecuting);

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  const handleSend = () => {
    if (!input.trim() && attachments.length === 0) return;

    // If no active workstream, create one
    if (!activeWorkstreamId && activeProjectId) {
      const ws: Workstream = {
        id: crypto.randomUUID(),
        projectId: activeProjectId,
        title: input.trim().slice(0, 60) || "New workstream",
        description: "",
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userRequest: input.trim(),
        attachments: [],
        currentPhase: "design",
        runIds: [],
        linearIssueIds: [],
        figmaFileIds: [],
        branches: [],
        evidence: [],
      };
      addWorkstream(ws);
      setActiveWorkstream(ws.id);
    }

    const message: ConversationMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    addMessage(message);
    setInput("");
    setAttachments([]);

    // Simulate multi-agent response chain
    simulateAgentChain(message.content);
  };

  const simulateAgentChain = (userMessage: string) => {
    setExecuting(true);

    // CTO Agent responds first with plan
    setTimeout(() => {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: generatePlanResponse(userMessage),
        timestamp: new Date().toISOString(),
        agentId: "cto-agent",
        agentName: "CTO Agent",
      });
    }, 800);

    // Engineering agent starts building
    setTimeout(() => {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Starting implementation. I'll scaffold the project using the **TypeScript + React + Next.js** stack pack.\n\n\`\`\`\nCreating project structure...\n  src/\n  src/app/layout.tsx\n  src/app/page.tsx\n  src/components/\n  src/lib/\n  package.json\n  tsconfig.json\n  Dockerfile\n  k8s/deployment.yaml\n\`\`\`\n\nProject scaffolded. Now implementing core features...`,
        timestamp: new Date().toISOString(),
        agentId: "engineering-agent",
        agentName: "Engineering Agent",
      });
    }, 2500);

    // Testing agent runs tests
    setTimeout(() => {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Running automated test suite:\n\n- Unit tests: **12/12 passed**\n- Integration tests: **4/4 passed**\n- Security scan: **Clean** (0 findings)\n- Performance: **No regressions** (p99 < 200ms)\n\nAll quality gates passed. Ready for deployment.`,
        timestamp: new Date().toISOString(),
        agentId: "testing-agent",
        agentName: "Testing Agent",
      });
    }, 4200);

    // DevOps agent deploys
    setTimeout(() => {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Deploying to **staging** environment using canary strategy:\n\n- Canary at 5% traffic... health check passed\n- Canary at 25% traffic... metrics nominal\n- Canary at 100% traffic... deployment complete\n\nService is live at \`https://staging.app.nebula.internal\``,
        timestamp: new Date().toISOString(),
        agentId: "devops-agent",
        agentName: "DevOps Agent",
      });
    }, 5800);

    // Scribing agent documents
    setTimeout(() => {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Documentation updated:\n\n- Level 0: Created **3 atomic change notes** in Obsidian vault\n- Level 1: Updated service documentation for the new service\n- Linear: Created tracking issue **NEB-42**\n\nAll phases complete. The feature is built, tested, deployed, and documented.`,
        timestamp: new Date().toISOString(),
        agentId: "scribing-agent",
        agentName: "Scribing Agent",
      });
      setExecuting(false);
    }, 7400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setAttachments((prev) => [...prev, ...files]);
  };

  return (
    <div
      className="flex-1 flex flex-col min-h-0"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {(!conversation || conversation.messages.length === 0) && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-2xl">
              <h2 className="text-xl font-semibold mb-2">
                What would you like to build?
              </h2>
              <p className="text-surface-dark-4 text-sm mb-6">
                Describe your idea in natural language. The CTO Agent will analyze your
                request and coordinate a team of specialized agents to design, build,
                test, deploy, and document your application.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.label}
                    onClick={() => setInput(prompt.text)}
                    className="text-left px-4 py-3 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors border border-surface-3"
                  >
                    <div className="text-sm font-medium mb-0.5">{prompt.label}</div>
                    <div className="text-xs text-surface-dark-4">{prompt.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {conversation?.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-surface-3 px-6 py-3 bg-white">
        {attachments.length > 0 && (
          <AttachmentBar
            attachments={attachments}
            onRemove={(idx) =>
              setAttachments((prev) => prev.filter((_, i) => i !== idx))
            }
          />
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build..."
              className="nebula-input min-h-[44px] max-h-[200px] resize-none pr-20"
              rows={1}
              disabled={isExecuting}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <label className="cursor-pointer p-1 rounded hover:bg-surface-2 text-surface-dark-4">
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setAttachments((prev) => [...prev, ...files]);
                  }}
                />
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </label>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || isExecuting}
            className="nebula-btn-primary disabled:opacity-50 h-[44px] px-4"
          >
            {isExecuting ? "Agents working..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

const EXAMPLE_PROMPTS = [
  {
    label: "Task Management App",
    text: "Build a task management application with user authentication, project boards, and real-time collaboration",
    description: "Full-stack app with auth and real-time features",
  },
  {
    label: "REST API",
    text: "Create a REST API for user management with CRUD operations, JWT auth, and role-based access control",
    description: "Backend service with authentication",
  },
  {
    label: "Landing Page",
    text: "Build a responsive landing page with hero section, features grid, pricing table, and contact form",
    description: "Frontend with modern design patterns",
  },
  {
    label: "E-commerce Backend",
    text: "Build an e-commerce backend with product catalog, shopping cart, order processing, and payment integration",
    description: "Complex backend with multiple services",
  },
];

function generatePlanResponse(userMessage: string): string {
  const lowerMsg = userMessage.toLowerCase();
  const stackPack = lowerMsg.includes("python") || lowerMsg.includes("django")
    ? "Python + Django"
    : lowerMsg.includes("rust")
    ? "Rust + Axum"
    : lowerMsg.includes("elixir")
    ? "Elixir on BEAM"
    : "TypeScript + React + Next.js";

  return `I've analyzed your request and prepared an execution plan.

**Selected Stack Pack:** ${stackPack}

**Phase 1 - Design**
- Decompose requirements into service boundaries
- Define API contracts (OpenAPI spec)
- Select infrastructure topology

**Phase 2 - Build**
- Scaffold project from stack pack template
- Implement core business logic
- Set up database schema and migrations

**Phase 3 - Test**
- Run unit tests (target: >80% coverage)
- Execute integration tests
- Perform security scan and dependency audit

**Phase 4 - Deploy**
- Configure Kubernetes manifests
- Deploy via canary strategy (5% -> 25% -> 100%)
- Validate health checks and metrics

**Phase 5 - Document**
- Generate Level 0 atomic change notes
- Update Level 1 service documentation
- Create Linear tracking issues

Delegating to department agents now...`;
}
