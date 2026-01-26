import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import type { Project } from "@/types/project";

interface Props {
  onClose: () => void;
}

export function CreateProjectDialog({ onClose }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const addProject = useProjectStore((s) => s.addProject);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  const handleCreate = () => {
    if (!name.trim()) return;

    const project: Project = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active",
      vaultPath: "",
      repositories: [],
      workstreams: [],
      dataClassification: "internal",
      policyPath: "nebula-policy.json",
      cloud: {
        primary: { provider: "azure", region: "eastus" },
        standby: { provider: "aws", region: "us-east-1" },
        failoverEnabled: false,
      },
      integrations: {
        obsidian: { vaultPath: "", deepLinkProtocol: "obsidian" },
        modelProviders: [],
      },
    };

    addProject(project);
    setActiveProject(project.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Create New Project</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Application"
              className="nebula-input"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what this project is about..."
              className="nebula-input min-h-[80px] resize-none"
            />
            <p className="text-xs text-surface-dark-4 mt-1">
              This helps Nebula understand the context of your project.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="nebula-btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="nebula-btn-primary disabled:opacity-50"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}
