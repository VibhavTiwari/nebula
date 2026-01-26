import { useState } from "react";
import { ProjectSidebar } from "@/components/projects/ProjectSidebar";
import { ConversationPane } from "@/components/conversation/ConversationPane";
import { PlanProgressPane } from "@/components/plan/PlanProgressPane";
import { EvidencePane } from "@/components/evidence/EvidencePane";
import { TitleBar } from "./TitleBar";
import { useProjectStore } from "@/stores/projectStore";

export function MainLayout() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeWorkstreamId = useProjectStore((s) => s.activeWorkstreamId);
  const [showEvidence, setShowEvidence] = useState(true);

  return (
    <div className="flex flex-col h-full">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Projects & Workstreams */}
        <ProjectSidebar />

        {/* Center: Conversation + Plan */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col flex-1 min-w-0">
            {activeProjectId && activeWorkstreamId ? (
              <>
                <ConversationPane />
                <PlanProgressPane />
              </>
            ) : activeProjectId ? (
              <EmptyWorkstreamState />
            ) : (
              <WelcomeState />
            )}
          </div>

          {/* Right: Evidence Panel */}
          {activeWorkstreamId && showEvidence && (
            <EvidencePane onClose={() => setShowEvidence(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-surface-1">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4">&#9733;</div>
        <h1 className="text-2xl font-semibold mb-2">Welcome to Nebula</h1>
        <p className="text-surface-dark-4 mb-6">
          Create a new project or select an existing one to get started.
          Describe what you want to build, and Nebula will handle the rest.
        </p>
        <p className="text-sm text-surface-dark-4">
          Start by creating a project in the left sidebar.
        </p>
      </div>
    </div>
  );
}

function EmptyWorkstreamState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-surface-1">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
        <p className="text-surface-dark-4">
          Create a new workstream to begin building. Describe a feature,
          attach a PRD, or paste designs to get started.
        </p>
      </div>
    </div>
  );
}
