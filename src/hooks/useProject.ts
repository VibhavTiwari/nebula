/**
 * Project-related hooks
 */

import { useCallback } from "react";
import { useProjectStore } from "@/stores/projectStore";
import type { Project } from "@/types/project";
import type { Workstream, ConversationMessage } from "@/types/workstream";

/**
 * Hook for project operations
 */
export function useProject() {
  const {
    projects,
    activeProjectId,
    workstreams,
    activeWorkstreamId,
    conversation,
    setProjects,
    addProject,
    setActiveProject,
    setWorkstreams,
    addWorkstream,
    setActiveWorkstream,
    addMessage,
    setLoading,
    isLoading,
  } = useProjectStore();

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const activeWorkstream =
    workstreams.find((w) => w.id === activeWorkstreamId) || null;

  const createProject = useCallback(
    (name: string, description: string) => {
      const project: Project = {
        id: crypto.randomUUID(),
        name,
        description,
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
      return project;
    },
    [addProject, setActiveProject]
  );

  const createWorkstream = useCallback(
    (title: string, userRequest: string) => {
      if (!activeProjectId) return null;

      const workstream: Workstream = {
        id: crypto.randomUUID(),
        projectId: activeProjectId,
        title,
        description: "",
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userRequest,
        attachments: [],
        currentPhase: "design",
        runIds: [],
        linearIssueIds: [],
        figmaFileIds: [],
        branches: [],
        evidence: [],
      };
      addWorkstream(workstream);
      setActiveWorkstream(workstream.id);
      return workstream;
    },
    [activeProjectId, addWorkstream, setActiveWorkstream]
  );

  const sendMessage = useCallback(
    (content: string) => {
      const message: ConversationMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      };
      addMessage(message);
      return message;
    },
    [addMessage]
  );

  return {
    projects,
    activeProject,
    activeProjectId,
    workstreams,
    activeWorkstream,
    activeWorkstreamId,
    conversation,
    isLoading,
    createProject,
    createWorkstream,
    sendMessage,
    setActiveProject,
    setActiveWorkstream,
    addMessage,
    setLoading,
  };
}
