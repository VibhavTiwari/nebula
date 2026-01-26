import { useProjectStore } from "@/stores/projectStore";

export function TitleBar() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const projects = useProjectStore((s) => s.projects);
  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <div
      data-tauri-drag-region
      className="flex items-center h-12 px-4 bg-surface-dark-0 text-white select-none shrink-0"
    >
      <div className="flex items-center gap-2">
        <span className="text-nebula-400 font-bold text-lg">Nebula</span>
        {activeProject && (
          <>
            <span className="text-surface-dark-4">/</span>
            <span className="text-sm text-gray-300">{activeProject.name}</span>
          </>
        )}
      </div>

      <div className="flex-1" data-tauri-drag-region />

      <div className="flex items-center gap-2">
        <StatusIndicator />
      </div>
    </div>
  );
}

function StatusIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-green-400" />
      <span className="text-xs text-gray-400">Ready</span>
    </div>
  );
}
