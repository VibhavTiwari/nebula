import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useAgentStore } from "@/stores/agentStore";
import { MessageBubble } from "./MessageBubble";
import { AttachmentBar } from "./AttachmentBar";
import type { ConversationMessage, Attachment, Workstream } from "@/types/workstream";

export function ConversationPane() {
  const conversation = useProjectStore((s) => s.conversation);
  const addMessage = useProjectStore((s) => s.addMessage);
  const addWorkstream = useProjectStore((s) => s.addWorkstream);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeWorkstreamId = useProjectStore((s) => s.activeWorkstreamId);
  const setActiveWorkstream = useProjectStore((s) => s.setActiveWorkstream);
  const isExecuting = useAgentStore((s) => s.isExecuting);

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

    // Simulate agent response (will be replaced by real agent runtime in Phase 3)
    simulateAgentResponse(message.content);
  };

  const simulateAgentResponse = (userMessage: string) => {
    setTimeout(() => {
      const response: ConversationMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: generatePlanResponse(userMessage),
        timestamp: new Date().toISOString(),
        agentId: "cto-agent",
        agentName: "CTO Agent",
      };
      addMessage(response);
    }, 800);
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
            <div className="text-center max-w-lg">
              <h2 className="text-xl font-semibold mb-2">
                Ask Nebula to build...
              </h2>
              <p className="text-surface-dark-4 text-sm mb-4">
                Describe what you want to create, attach a PRD or design files,
                and Nebula will generate a plan and start building.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="text-xs px-3 py-1.5 rounded-full bg-surface-2 text-surface-dark-4 hover:bg-surface-3 transition-colors"
                  >
                    {prompt}
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
            {isExecuting ? "Working..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

const EXAMPLE_PROMPTS = [
  "Build a task management app",
  "Create a REST API for user management",
  "Build a landing page from my design",
  "Add authentication to my existing app",
];

function generatePlanResponse(userMessage: string): string {
  return `I've analyzed your request. Here's my proposed plan:

**Phase 1: Design**
- Analyze requirements from your description
- Define system architecture
- Select appropriate stack pack

**Phase 2: Build**
- Scaffold the project structure
- Implement core features
- Set up database and API layers

**Phase 3: Test**
- Write unit tests
- Run integration tests
- Perform security checks

**Phase 4: Deploy**
- Configure deployment pipeline
- Deploy to staging environment
- Run health checks

**Phase 5: Document**
- Generate Level 0 documentation notes
- Consolidate Level 1 service documentation
- Update system overview (Level 2)

Would you like me to proceed with this plan, or would you like to adjust anything?`;
}
