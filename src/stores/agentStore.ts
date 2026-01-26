import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { AgentInstance, AgentStatus, AgentToolCall } from "@/types/agent";
import type { RunRecord, RunSummary } from "@/types/audit";

interface AgentState {
  /** Active agent instances for current run */
  activeAgents: AgentInstance[];

  /** Current run record */
  currentRun: RunRecord | null;

  /** Run history */
  runHistory: RunRecord[];

  /** Whether agents are currently executing */
  isExecuting: boolean;

  /** Actions */
  setActiveAgents: (agents: AgentInstance[]) => void;
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;
  addToolCall: (agentId: string, toolCall: AgentToolCall) => void;
  updateToolCall: (agentId: string, toolCallId: string, updates: Partial<AgentToolCall>) => void;
  setCurrentRun: (run: RunRecord | null) => void;
  addRunToHistory: (run: RunRecord) => void;
  setExecuting: (executing: boolean) => void;
}

export const useAgentStore = create<AgentState>()(
  immer((set) => ({
    activeAgents: [],
    currentRun: null,
    runHistory: [],
    isExecuting: false,

    setActiveAgents: (agents) =>
      set((state) => {
        state.activeAgents = agents;
      }),

    updateAgentStatus: (agentId, status) =>
      set((state) => {
        const agent = state.activeAgents.find((a) => a.id === agentId);
        if (agent) agent.status = status;
      }),

    addToolCall: (agentId, toolCall) =>
      set((state) => {
        const agent = state.activeAgents.find((a) => a.id === agentId);
        if (agent) agent.toolCalls.push(toolCall);
      }),

    updateToolCall: (agentId, toolCallId, updates) =>
      set((state) => {
        const agent = state.activeAgents.find((a) => a.id === agentId);
        if (agent) {
          const tc = agent.toolCalls.find((t) => t.id === toolCallId);
          if (tc) Object.assign(tc, updates);
        }
      }),

    setCurrentRun: (run) =>
      set((state) => {
        state.currentRun = run;
      }),

    addRunToHistory: (run) =>
      set((state) => {
        state.runHistory.unshift(run);
      }),

    setExecuting: (executing) =>
      set((state) => {
        state.isExecuting = executing;
      }),
  }))
);
