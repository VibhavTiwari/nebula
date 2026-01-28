import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Project } from "@/types/project";
import type {
  Workstream,
  WorkstreamStatus,
  WorkPhase,
  Conversation,
  ConversationMessage,
  Evidence,
} from "@/types/workstream";

interface ProjectState {
  /** All projects */
  projects: Project[];

  /** Currently selected project */
  activeProjectId: string | null;

  /** Workstreams for active project */
  workstreams: Workstream[];

  /** Currently selected workstream */
  activeWorkstreamId: string | null;

  /** Conversation for active workstream */
  conversation: Conversation | null;

  /** All conversations indexed by workstream ID (for persistence) */
  conversationsByWorkstream: Record<string, Conversation>;

  /** Loading states */
  isLoading: boolean;

  /** Actions */
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  setActiveProject: (projectId: string | null) => void;
  setWorkstreams: (workstreams: Workstream[]) => void;
  addWorkstream: (workstream: Workstream) => void;
  setActiveWorkstream: (workstreamId: string | null) => void;
  updateWorkstreamStatus: (workstreamId: string, status: WorkstreamStatus) => void;
  updateWorkstreamPhase: (workstreamId: string, phase: WorkPhase) => void;
  addMessage: (message: ConversationMessage) => void;
  addEvidence: (workstreamId: string, evidence: Evidence) => void;
  setLoading: (loading: boolean) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    immer((set) => ({
      projects: [],
      activeProjectId: null,
      workstreams: [],
      activeWorkstreamId: null,
      conversation: null,
      conversationsByWorkstream: {},
      isLoading: false,

      setProjects: (projects) =>
        set((state) => {
          state.projects = projects;
        }),

      addProject: (project) =>
        set((state) => {
          state.projects.push(project);
        }),

      updateProject: (projectId, updates) =>
        set((state) => {
          const project = state.projects.find((p) => p.id === projectId);
          if (project) {
            Object.assign(project, updates);
          }
        }),

      deleteProject: (projectId) =>
        set((state) => {
          state.projects = state.projects.filter((p) => p.id !== projectId);
          // Also remove workstreams for this project
          state.workstreams = state.workstreams.filter(
            (w) => w.projectId !== projectId
          );
          // Clear active selections if deleted project was active
          if (state.activeProjectId === projectId) {
            state.activeProjectId = null;
            state.activeWorkstreamId = null;
            state.conversation = null;
          }
        }),

      setActiveProject: (projectId) =>
        set((state) => {
          state.activeProjectId = projectId;
          state.activeWorkstreamId = null;
          // Load workstreams for this project (they're stored inline)
          // In a real app, you might filter from a global workstreams array
          state.conversation = null;
        }),

      setWorkstreams: (workstreams) =>
        set((state) => {
          state.workstreams = workstreams;
        }),

      addWorkstream: (workstream) =>
        set((state) => {
          state.workstreams.push(workstream);
        }),

      setActiveWorkstream: (workstreamId) =>
        set((state) => {
          state.activeWorkstreamId = workstreamId;
          if (workstreamId) {
            // Check if we have a saved conversation for this workstream
            const savedConversation =
              state.conversationsByWorkstream[workstreamId];
            if (savedConversation) {
              state.conversation = savedConversation;
            } else {
              // Create new conversation
              const newConversation: Conversation = {
                id: workstreamId,
                workstreamId,
                messages: [],
                createdAt: new Date().toISOString(),
              };
              state.conversation = newConversation;
              state.conversationsByWorkstream[workstreamId] = newConversation;
            }
          } else {
            state.conversation = null;
          }
        }),

      updateWorkstreamStatus: (workstreamId, status) =>
        set((state) => {
          const ws = state.workstreams.find((w) => w.id === workstreamId);
          if (ws) ws.status = status;
        }),

      updateWorkstreamPhase: (workstreamId, phase) =>
        set((state) => {
          const ws = state.workstreams.find((w) => w.id === workstreamId);
          if (ws) ws.currentPhase = phase;
        }),

      addMessage: (message) =>
        set((state) => {
          if (state.conversation) {
            state.conversation.messages.push(message);
            // Also update the persisted conversations record
            const wsId = state.conversation.workstreamId;
            if (state.conversationsByWorkstream[wsId]) {
              state.conversationsByWorkstream[wsId].messages.push(message);
            }
          }
        }),

      addEvidence: (workstreamId, evidence) =>
        set((state) => {
          const ws = state.workstreams.find((w) => w.id === workstreamId);
          if (ws) ws.evidence.push(evidence);
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),
    })),
    {
      name: "nebula-projects",
      // Only persist these keys (not transient state like isLoading)
      partialize: (state) => ({
        projects: state.projects,
        workstreams: state.workstreams,
        conversationsByWorkstream: state.conversationsByWorkstream,
        activeProjectId: state.activeProjectId,
        activeWorkstreamId: state.activeWorkstreamId,
      }),
    }
  )
);
