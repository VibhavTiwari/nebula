import { useProjectStore } from "@/stores/projectStore";
import { useAgentStore } from "@/stores/agentStore";
import clsx from "clsx";

const PHASES = [
  { id: "design", label: "Design", description: "Analyzing requirements and architecture" },
  { id: "build", label: "Build", description: "Implementing features and code" },
  { id: "test", label: "Test", description: "Running automated tests" },
  { id: "deploy", label: "Deploy", description: "Deploying to environments" },
  { id: "document", label: "Document", description: "Updating documentation" },
] as const;

export function PlanProgressPane() {
  const activeWorkstreamId = useProjectStore((s) => s.activeWorkstreamId);
  const workstreams = useProjectStore((s) => s.workstreams);
  const activeAgents = useAgentStore((s) => s.activeAgents);
  const currentRun = useAgentStore((s) => s.currentRun);

  const activeWorkstream = workstreams.find((w) => w.id === activeWorkstreamId);
  if (!activeWorkstream) return null;

  const currentPhase = activeWorkstream.currentPhase;

  return (
    <div className="border-t border-surface-3 bg-surface-1 px-6 py-3 shrink-0">
      {/* Phase progress bar */}
      <div className="flex items-center gap-1 mb-2">
        {PHASES.map((phase, index) => {
          const phaseIndex = PHASES.findIndex((p) => p.id === currentPhase);
          const isComplete = index < phaseIndex;
          const isCurrent = phase.id === currentPhase;
          const isPending = index > phaseIndex;

          return (
            <div key={phase.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={clsx(
                    "w-full h-1.5 rounded-full transition-colors",
                    isComplete && "bg-green-500",
                    isCurrent && "bg-nebula-500",
                    isPending && "bg-surface-3"
                  )}
                />
                <span
                  className={clsx(
                    "text-xs mt-1",
                    isCurrent && "font-medium text-nebula-700",
                    !isCurrent && "text-surface-dark-4"
                  )}
                >
                  {phase.label}
                </span>
              </div>
              {index < PHASES.length - 1 && <div className="w-1" />}
            </div>
          );
        })}
      </div>

      {/* Active agents */}
      {activeAgents.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {activeAgents
            .filter((a) => a.status !== "idle")
            .map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-1.5 text-xs bg-white rounded-md px-2 py-1 border border-surface-3"
              >
                <div
                  className={clsx(
                    "w-1.5 h-1.5 rounded-full",
                    agent.status === "thinking" && "bg-yellow-400 animate-pulse",
                    agent.status === "executing" && "bg-blue-400 animate-pulse",
                    agent.status === "completed" && "bg-green-400",
                    agent.status === "failed" && "bg-red-400"
                  )}
                />
                <span className="text-surface-dark-4">
                  {agent.definitionId.replace(/-/g, " ")}
                </span>
                {agent.currentTask && (
                  <span className="text-surface-dark-4 truncate max-w-[150px]">
                    — {agent.currentTask}
                  </span>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Run summary */}
      {currentRun?.summary && (
        <div className="mt-2 flex items-center gap-4 text-xs text-surface-dark-4">
          <span>{currentRun.summary.total_events} events</span>
          <span>{currentRun.summary.code_changes} changes</span>
          <span>
            {currentRun.summary.tests_passed}/{currentRun.summary.tests_run} tests
          </span>
          <span>{currentRun.summary.documentation_updates} docs</span>
        </div>
      )}
    </div>
  );
}
