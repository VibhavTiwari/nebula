import { useState } from "react";
import { ProjectSidebar } from "@/components/projects/ProjectSidebar";
import { ConversationPane } from "@/components/conversation/ConversationPane";
import { PlanProgressPane } from "@/components/plan/PlanProgressPane";
import { EvidencePane } from "@/components/evidence/EvidencePane";
import { AgentBuilderCanvas } from "@/components/agent-builder/AgentBuilderCanvas";
import { CodeViewer, type FileEntry } from "@/components/code-viewer/CodeViewer";
import { TitleBar } from "./TitleBar";
import { useProjectStore } from "@/stores/projectStore";
import clsx from "clsx";

type ViewTab = "conversation" | "agent-builder" | "code-viewer";

const DEMO_FILES: FileEntry[] = [
  {
    path: "src",
    name: "src",
    type: "directory",
    children: [
      {
        path: "src/main.tsx",
        name: "main.tsx",
        type: "file",
        language: "typescript",
        content: `import React from "react";\nimport ReactDOM from "react-dom/client";\nimport { App } from "./app/App";\nimport "./styles/globals.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);`,
      },
      {
        path: "src/app",
        name: "app",
        type: "directory",
        children: [
          {
            path: "src/app/App.tsx",
            name: "App.tsx",
            type: "file",
            language: "typescript",
            content: `import { QueryClient, QueryClientProvider } from "@tanstack/react-query";\nimport { MainLayout } from "@/components/layout/MainLayout";\n\nconst queryClient = new QueryClient({\n  defaultOptions: {\n    queries: { staleTime: 5 * 60 * 1000 },\n  },\n});\n\nexport function App() {\n  return (\n    <QueryClientProvider client={queryClient}>\n      <MainLayout />\n    </QueryClientProvider>\n  );\n}`,
          },
        ],
      },
    ],
  },
  {
    path: "package.json",
    name: "package.json",
    type: "file",
    language: "json",
    content: `{\n  "name": "nebula-ide",\n  "version": "0.1.0",\n  "private": true\n}`,
  },
];

export function MainLayout() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeWorkstreamId = useProjectStore((s) => s.activeWorkstreamId);
  const [showEvidence, setShowEvidence] = useState(true);
  const [activeView, setActiveView] = useState<ViewTab>("conversation");

  return (
    <div className="flex flex-col h-full">
      <TitleBar />

      {/* Navigation Tabs — shown when a project is active */}
      {activeProjectId && (
        <div className="flex items-center gap-0 border-b border-surface-3 bg-white px-4">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={clsx(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeView === tab.id
                  ? "border-nebula-600 text-nebula-700"
                  : "border-transparent text-surface-dark-4 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}

          {/* Right-aligned controls */}
          <div className="ml-auto flex items-center gap-2">
            {activeWorkstreamId && (
              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className={clsx(
                  "text-xs px-3 py-1 rounded transition-colors",
                  showEvidence
                    ? "bg-nebula-100 text-nebula-700"
                    : "text-surface-dark-4 hover:bg-surface-2"
                )}
              >
                Evidence Panel
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Projects & Workstreams */}
        <ProjectSidebar />

        {/* Center: Main content based on active view */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col flex-1 min-w-0">
            {!activeProjectId ? (
              <WelcomeState />
            ) : activeView === "conversation" ? (
              <>
                <ConversationPane />
                {activeWorkstreamId && <PlanProgressPane />}
              </>
            ) : activeView === "agent-builder" ? (
              <AgentBuilderCanvas />
            ) : activeView === "code-viewer" ? (
              <CodeViewer files={DEMO_FILES} />
            ) : null}
          </div>

          {/* Right: Evidence Panel */}
          {activeView === "conversation" &&
            activeWorkstreamId &&
            showEvidence && (
              <EvidencePane onClose={() => setShowEvidence(false)} />
            )}
        </div>
      </div>
    </div>
  );
}

const VIEW_TABS: { id: ViewTab; label: string; icon: string }[] = [
  { id: "conversation", label: "Conversation", icon: "\u{1F4AC}" },
  { id: "agent-builder", label: "Agent Builder", icon: "\u{1F9E9}" },
  { id: "code-viewer", label: "Code Viewer", icon: "\u{1F4C4}" },
];

function WelcomeState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-surface-1">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4 text-nebula-600">N</div>
        <h1 className="text-2xl font-semibold mb-2">Welcome to Nebula</h1>
        <p className="text-surface-dark-4 mb-6">
          Create a new project or select an existing one to get started.
          Describe what you want to build, and Nebula will handle the rest.
        </p>
        <div className="flex flex-col gap-3 text-sm text-surface-dark-4">
          <div className="flex items-center gap-2 justify-center">
            <span className="w-6 h-6 rounded-full bg-nebula-100 text-nebula-700 flex items-center justify-center text-xs font-medium">1</span>
            Create a project with <strong>+ New</strong> in the sidebar
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="w-6 h-6 rounded-full bg-nebula-100 text-nebula-700 flex items-center justify-center text-xs font-medium">2</span>
            Describe your app in natural language
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="w-6 h-6 rounded-full bg-nebula-100 text-nebula-700 flex items-center justify-center text-xs font-medium">3</span>
            Watch the agents build, test, and deploy it
          </div>
        </div>
      </div>
    </div>
  );
}
