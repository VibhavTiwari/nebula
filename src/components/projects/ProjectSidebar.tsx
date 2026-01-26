import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { CreateProjectDialog } from "./CreateProjectDialog";
import clsx from "clsx";

export function ProjectSidebar() {
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const workstreams = useProjectStore((s) => s.workstreams);
  const activeWorkstreamId = useProjectStore((s) => s.activeWorkstreamId);
  const setActiveWorkstream = useProjectStore((s) => s.setActiveWorkstream);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <aside className="w-[var(--sidebar-width)] nebula-panel shrink-0">
      <div className="nebula-panel-header flex items-center justify-between">
        <span>Projects</span>
        <button
          onClick={() => setShowCreate(true)}
          className="nebula-btn-secondary text-xs px-2 py-1"
          title="New Project"
        >
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="p-4 text-sm text-surface-dark-4">
            No projects yet. Create one to get started.
          </div>
        ) : (
          <div className="py-1">
            {projects.map((project) => (
              <div key={project.id}>
                <button
                  onClick={() => setActiveProject(project.id)}
                  className={clsx(
                    "w-full text-left px-4 py-2 text-sm hover:bg-surface-2 transition-colors",
                    activeProjectId === project.id &&
                      "bg-nebula-50 text-nebula-700 font-medium"
                  )}
                >
                  <div className="truncate">{project.name}</div>
                  <div className="text-xs text-surface-dark-4 truncate mt-0.5">
                    {project.description}
                  </div>
                </button>

                {/* Workstreams for active project */}
                {activeProjectId === project.id && workstreams.length > 0 && (
                  <div className="ml-4 border-l border-surface-3">
                    {workstreams.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => setActiveWorkstream(ws.id)}
                        className={clsx(
                          "w-full text-left pl-4 pr-3 py-1.5 text-xs hover:bg-surface-2 transition-colors",
                          activeWorkstreamId === ws.id &&
                            "bg-nebula-50 text-nebula-700 font-medium"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <PhaseIndicator phase={ws.currentPhase} />
                          <span className="truncate">{ws.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectDialog onClose={() => setShowCreate(false)} />
      )}
    </aside>
  );
}

function PhaseIndicator({ phase }: { phase: string }) {
  const colors: Record<string, string> = {
    design: "bg-purple-400",
    build: "bg-blue-400",
    test: "bg-yellow-400",
    deploy: "bg-orange-400",
    document: "bg-green-400",
    completed: "bg-green-500",
  };

  return (
    <div
      className={clsx("w-1.5 h-1.5 rounded-full shrink-0", colors[phase] || "bg-gray-400")}
      title={phase}
    />
  );
}
