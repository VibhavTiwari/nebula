/**
 * WorkflowListView - Main dashboard for the Agent Builder
 *
 * Displays a hero section, tab navigation, and grid of workflow/template cards.
 */

import { useState } from "react";
import clsx from "clsx";
import { useWorkflowStore, type WorkflowTemplate } from "@/stores/workflowStore";
import { WorkflowCard } from "./WorkflowCard";
import { TemplateCard } from "./TemplateCard";
import { CreateWorkflowModal } from "./CreateWorkflowModal";

interface WorkflowListViewProps {
  onOpenWorkflow: (workflowId: string) => void;
}

export function WorkflowListView({ onOpenWorkflow }: WorkflowListViewProps) {
  const {
    workflows,
    templates,
    activeTab,
    setActiveTab,
    updateWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
  } = useWorkflowStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preselectedTemplate, setPreselectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setPreselectedTemplate(null);
    setShowCreateModal(true);
  };

  const handleUseTemplate = (template: WorkflowTemplate) => {
    setPreselectedTemplate(template);
    setShowCreateModal(true);
  };

  const handleWorkflowCreated = (workflowId: string) => {
    onOpenWorkflow(workflowId);
  };

  const handleDeleteWorkflow = (id: string) => {
    deleteWorkflow(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-surface-1 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-surface-3">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-800">Agent Builder</h1>
          <p className="text-sm text-surface-dark-4 mt-1">
            Create and manage your AI agent workflows
          </p>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Hero / Create section */}
          <div className="bg-gradient-to-br from-nebula-50 to-white border border-nebula-100 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">
                  Create a workflow
                </h2>
                <p className="text-sm text-surface-dark-4">
                  Build AI agent pipelines with drag-and-drop nodes
                </p>
              </div>
              <button
                onClick={handleCreateNew}
                className={clsx(
                  "flex items-center gap-2 px-5 py-2.5 rounded-lg",
                  "bg-nebula-600 text-white font-medium text-sm",
                  "hover:bg-nebula-700 transition-colors",
                  "shadow-sm hover:shadow-md"
                )}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 mb-6 bg-surface-2 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("drafts")}
              className={clsx(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === "drafts"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-surface-dark-4 hover:text-gray-700"
              )}
            >
              Drafts
              {workflows.length > 0 && (
                <span className="ml-2 text-xs bg-surface-3 px-1.5 py-0.5 rounded-full">
                  {workflows.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={clsx(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === "templates"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-surface-dark-4 hover:text-gray-700"
              )}
            >
              Templates
            </button>
          </div>

          {/* Content based on active tab */}
          {activeTab === "drafts" ? (
            <>
              {workflows.length === 0 ? (
                /* Empty state for drafts */
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-2 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-surface-dark-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    No workflows yet
                  </h3>
                  <p className="text-sm text-surface-dark-4 mb-6 max-w-sm mx-auto">
                    Create your first workflow to start building AI agent pipelines,
                    or start from one of our templates.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={handleCreateNew}
                      className={clsx(
                        "flex items-center gap-2 px-4 py-2 rounded-lg",
                        "bg-nebula-600 text-white text-sm font-medium",
                        "hover:bg-nebula-700 transition-colors"
                      )}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Create Workflow
                    </button>
                    <button
                      onClick={() => setActiveTab("templates")}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-medium",
                        "text-nebula-700 bg-nebula-50 border border-nebula-200",
                        "hover:bg-nebula-100 transition-colors"
                      )}
                    >
                      Browse Templates
                    </button>
                  </div>
                </div>
              ) : (
                /* Workflow grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workflows.map((workflow) => (
                    <WorkflowCard
                      key={workflow.id}
                      workflow={workflow}
                      onClick={() => onOpenWorkflow(workflow.id)}
                      onDuplicate={() => duplicateWorkflow(workflow.id)}
                      onDelete={() => setDeleteConfirmId(workflow.id)}
                      onRename={(newName) =>
                        updateWorkflow(workflow.id, { name: newName })
                      }
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Templates grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUseTemplate={() => handleUseTemplate(template)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Workflow Modal */}
      <CreateWorkflowModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setPreselectedTemplate(null);
        }}
        onCreated={handleWorkflowCreated}
        preselectedTemplate={preselectedTemplate}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Delete Workflow
                </h3>
                <p className="text-sm text-surface-dark-4">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteWorkflow(deleteConfirmId)}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium",
                  "bg-red-600 text-white hover:bg-red-700 transition-colors"
                )}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
