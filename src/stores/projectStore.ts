import { create } from "zustand";
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

  /** Loading states */
  isLoading: boolean;

  /** Actions */
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
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
  immer((set) => ({
    projects: [],
    activeProjectId: null,
    workstreams: [],
    activeWorkstreamId: null,
    conversation: null,
    isLoading: false,

    setProjects: (projects) =>
      set((state) => {
        state.projects = projects;
      }),

    addProject: (project) =>
      set((state) => {
        state.projects.push(project);
      }),

    setActiveProject: (projectId) =>
      set((state) => {
        state.activeProjectId = projectId;
        state.activeWorkstreamId = null;
        state.workstreams = [];
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
          state.conversation = {
            id: workstreamId,
            workstreamId,
            messages:
              state.workstreams.find((w) => w.id === workstreamId)
                ?.userRequest
                ? []
                : [],
            createdAt: new Date().toISOString(),
          };
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
  }))
);
