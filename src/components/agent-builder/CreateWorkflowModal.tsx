/**
 * CreateWorkflowModal - Modal dialog for creating a new workflow
 *
 * Allows users to create a blank workflow or start from a template.
 */

import { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import { useWorkflowStore, type WorkflowTemplate } from "@/stores/workflowStore";

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (workflowId: string) => void;
  preselectedTemplate?: WorkflowTemplate | null;
}

export function CreateWorkflowModal({
  isOpen,
  onClose,
  onCreated,
  preselectedTemplate,
}: CreateWorkflowModalProps) {
  const { templates, createWorkflow, createFromTemplate } = useWorkflowStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [startFrom, setStartFrom] = useState<"blank" | "template">("blank");

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (preselectedTemplate) {
        setName(preselectedTemplate.name);
        setDescription(preselectedTemplate.description);
        setSelectedTemplateId(preselectedTemplate.id);
        setStartFrom("template");
      } else {
        setName("");
        setDescription("");
        setSelectedTemplateId(null);
        setStartFrom("blank");
      }

      // Focus input after a brief delay to allow modal animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, preselectedTemplate]);

  const handleCreate = () => {
    if (!name.trim()) return;

    let workflowId: string | null = null;

    if (startFrom === "template" && selectedTemplateId) {
      workflowId = createFromTemplate(selectedTemplateId, name.trim());
    } else {
      workflowId = createWorkflow({
        name: name.trim(),
        description: description.trim(),
        status: "draft",
        author: "You",
      });
    }

    if (workflowId) {
      onCreated(workflowId);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && name.trim()) {
      e.preventDefault();
      handleCreate();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Create New Workflow
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-surface-dark-4 hover:text-gray-700 hover:bg-surface-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5" onKeyDown={handleKeyDown}>
          {/* Workflow name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Workflow Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Workflow"
              className={clsx(
                "w-full px-3 py-2 rounded-lg border border-surface-3",
                "text-sm placeholder:text-surface-dark-4",
                "focus:outline-none focus:ring-2 focus:ring-nebula-500 focus:border-transparent",
                "transition-all"
              )}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this workflow does..."
              rows={3}
              className={clsx(
                "w-full px-3 py-2 rounded-lg border border-surface-3",
                "text-sm placeholder:text-surface-dark-4 resize-none",
                "focus:outline-none focus:ring-2 focus:ring-nebula-500 focus:border-transparent",
                "transition-all"
              )}
            />
          </div>

          {/* Start from options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start from
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStartFrom("blank");
                  setSelectedTemplateId(null);
                }}
                className={clsx(
                  "flex-1 py-3 px-4 rounded-lg border-2 transition-all",
                  "flex flex-col items-center gap-2",
                  startFrom === "blank"
                    ? "border-nebula-500 bg-nebula-50"
                    : "border-surface-3 hover:border-surface-4"
                )}
              >
                <svg
                  className={clsx(
                    "w-6 h-6",
                    startFrom === "blank" ? "text-nebula-600" : "text-surface-dark-4"
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                <span
                  className={clsx(
                    "text-sm font-medium",
                    startFrom === "blank" ? "text-nebula-700" : "text-gray-600"
                  )}
                >
                  Blank Canvas
                </span>
              </button>

              <button
                onClick={() => setStartFrom("template")}
                className={clsx(
                  "flex-1 py-3 px-4 rounded-lg border-2 transition-all",
                  "flex flex-col items-center gap-2",
                  startFrom === "template"
                    ? "border-nebula-500 bg-nebula-50"
                    : "border-surface-3 hover:border-surface-4"
                )}
              >
                <svg
                  className={clsx(
                    "w-6 h-6",
                    startFrom === "template" ? "text-nebula-600" : "text-surface-dark-4"
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                  />
                </svg>
                <span
                  className={clsx(
                    "text-sm font-medium",
                    startFrom === "template" ? "text-nebula-700" : "text-gray-600"
                  )}
                >
                  From Template
                </span>
              </button>
            </div>
          </div>

          {/* Template selection (shown when "From Template" is selected) */}
          {startFrom === "template" && (
            <div className="max-h-48 overflow-y-auto border border-surface-3 rounded-lg">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplateId(template.id);
                    if (!name.trim() || name === templates.find((t) => t.id === selectedTemplateId)?.name) {
                      setName(template.name);
                    }
                    setDescription(template.description);
                  }}
                  className={clsx(
                    "w-full text-left px-4 py-3 border-b border-surface-2 last:border-b-0",
                    "transition-colors",
                    selectedTemplateId === template.id
                      ? "bg-nebula-50"
                      : "hover:bg-surface-1"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        "w-8 h-8 rounded-md flex items-center justify-center",
                        selectedTemplateId === template.id
                          ? "bg-nebula-100 text-nebula-600"
                          : "bg-surface-2 text-surface-dark-4"
                      )}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={clsx(
                          "text-sm font-medium truncate",
                          selectedTemplateId === template.id
                            ? "text-nebula-700"
                            : "text-gray-700"
                        )}
                      >
                        {template.name}
                      </div>
                      <div className="text-xs text-surface-dark-4 truncate">
                        {template.nodes.length} nodes - {template.category}
                      </div>
                    </div>
                    {selectedTemplateId === template.id && (
                      <svg
                        className="w-5 h-5 text-nebula-600 shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-3 bg-surface-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || (startFrom === "template" && !selectedTemplateId)}
            className={clsx(
              "px-5 py-2 rounded-lg text-sm font-medium transition-all",
              "bg-nebula-600 text-white",
              "hover:bg-nebula-700",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-nebula-600"
            )}
          >
            Create Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
