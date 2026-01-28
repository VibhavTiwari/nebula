import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Node, Edge } from "reactflow";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type WorkflowStatus = "draft" | "published";
type BuilderView = "canvas" | "code" | "evaluate";

interface EvaluationResult {
  id: string;
  nodeId: string;
  input: unknown;
  output: unknown;
  status: "success" | "failure" | "error";
  duration: number;
  timestamp: string;
  error?: string;
}

interface AgentBuilderState {
  /** Current workflow metadata */
  workflowId: string;
  workflowName: string;
  workflowDescription: string;
  workflowStatus: WorkflowStatus;
  workflowVersion: string;

  /** Nodes and edges managed by ReactFlow */
  nodes: Node[];
  edges: Edge[];

  /** Selected node ID */
  selectedNodeId: string | null;

  /** Current view */
  activeView: BuilderView;

  /** Undo/redo stacks */
  undoStack: Array<{ nodes: Node[]; edges: Edge[] }>;
  redoStack: Array<{ nodes: Node[]; edges: Edge[] }>;

  /** Workflow state variables (for set-state / transform nodes) */
  stateVariables: Record<string, unknown>;

  /** Evaluation results */
  evaluationResults: EvaluationResult[];

  /** Dirty flag */
  isDirty: boolean;

  /** Actions */
  setWorkflowMeta: (
    meta: Partial<{
      workflowId: string;
      workflowName: string;
      workflowDescription: string;
      workflowVersion: string;
    }>,
  ) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  setActiveView: (view: BuilderView) => void;
  setWorkflowStatus: (status: WorkflowStatus) => void;

  /** Snapshot for undo */
  snapshot: () => void;
  undo: () => void;
  redo: () => void;

  /** State variables */
  setStateVariable: (key: string, value: unknown) => void;

  /** Evaluation */
  addEvaluationResult: (result: EvaluationResult) => void;
  clearEvaluationResults: () => void;

  /** Reset */
  reset: () => void;
  loadWorkflow: (data: {
    id: string;
    name: string;
    description: string;
    version: string;
    status: WorkflowStatus;
    nodes: Node[];
    edges: Edge[];
  }) => void;
}

/* ------------------------------------------------------------------ */
/*  Initial values                                                     */
/* ------------------------------------------------------------------ */

const DEFAULT_START_NODE: Node = {
  id: "start-node",
  type: "start",
  position: { x: 400, y: 50 },
  data: { label: "Start" },
};

const initialState = {
  workflowId: "",
  workflowName: "Untitled Workflow",
  workflowDescription: "",
  workflowStatus: "draft" as WorkflowStatus,
  workflowVersion: "0.1.0",

  nodes: [DEFAULT_START_NODE],
  edges: [] as Edge[],

  selectedNodeId: null as string | null,
  activeView: "canvas" as BuilderView,

  undoStack: [] as Array<{ nodes: Node[]; edges: Edge[] }>,
  redoStack: [] as Array<{ nodes: Node[]; edges: Edge[] }>,

  stateVariables: {} as Record<string, unknown>,
  evaluationResults: [] as EvaluationResult[],

  isDirty: false,
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useAgentBuilderStore = create<AgentBuilderState>()(
  immer((set) => ({
    ...initialState,

    /* ------ Workflow metadata ------ */

    setWorkflowMeta: (meta) =>
      set((state) => {
        if (meta.workflowId !== undefined) state.workflowId = meta.workflowId;
        if (meta.workflowName !== undefined) state.workflowName = meta.workflowName;
        if (meta.workflowDescription !== undefined) state.workflowDescription = meta.workflowDescription;
        if (meta.workflowVersion !== undefined) state.workflowVersion = meta.workflowVersion;
        state.isDirty = true;
      }),

    setWorkflowStatus: (status) =>
      set((state) => {
        state.workflowStatus = status;
        state.isDirty = true;
      }),

    /* ------ Nodes & Edges ------ */

    setNodes: (nodes) =>
      set((state) => {
        state.nodes = nodes;
        state.isDirty = true;
      }),

    setEdges: (edges) =>
      set((state) => {
        state.edges = edges;
        state.isDirty = true;
      }),

    addNode: (node) =>
      set((state) => {
        // snapshot before mutation
        state.undoStack.push({
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges)),
        });
        state.redoStack = [];

        state.nodes.push(node);
        state.isDirty = true;
      }),

    updateNodeData: (nodeId, data) =>
      set((state) => {
        // snapshot before mutation
        state.undoStack.push({
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges)),
        });
        state.redoStack = [];

        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.data = { ...node.data, ...data };
        }
        state.isDirty = true;
      }),

    removeNode: (nodeId) =>
      set((state) => {
        // snapshot before mutation
        state.undoStack.push({
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges)),
        });
        state.redoStack = [];

        state.nodes = state.nodes.filter((n) => n.id !== nodeId);
        state.edges = state.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId,
        );

        if (state.selectedNodeId === nodeId) {
          state.selectedNodeId = null;
        }
        state.isDirty = true;
      }),

    /* ------ Selection & View ------ */

    selectNode: (nodeId) =>
      set((state) => {
        state.selectedNodeId = nodeId;
      }),

    setActiveView: (view) =>
      set((state) => {
        state.activeView = view;
      }),

    /* ------ Undo / Redo ------ */

    snapshot: () =>
      set((state) => {
        state.undoStack.push({
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges)),
        });
        state.redoStack = [];
      }),

    undo: () =>
      set((state) => {
        const previous = state.undoStack.pop();
        if (!previous) return;

        state.redoStack.push({
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges)),
        });

        state.nodes = previous.nodes;
        state.edges = previous.edges;
        state.isDirty = true;
      }),

    redo: () =>
      set((state) => {
        const next = state.redoStack.pop();
        if (!next) return;

        state.undoStack.push({
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges)),
        });

        state.nodes = next.nodes;
        state.edges = next.edges;
        state.isDirty = true;
      }),

    /* ------ State variables ------ */

    setStateVariable: (key, value) =>
      set((state) => {
        state.stateVariables[key] = value;
      }),

    /* ------ Evaluation ------ */

    addEvaluationResult: (result) =>
      set((state) => {
        state.evaluationResults.push(result);
      }),

    clearEvaluationResults: () =>
      set((state) => {
        state.evaluationResults = [];
      }),

    /* ------ Reset & Load ------ */

    reset: () =>
      set((state) => {
        Object.assign(state, {
          ...initialState,
          nodes: [{ ...DEFAULT_START_NODE }],
          edges: [],
          undoStack: [],
          redoStack: [],
          stateVariables: {},
          evaluationResults: [],
        });
      }),

    loadWorkflow: (data) =>
      set((state) => {
        state.workflowId = data.id;
        state.workflowName = data.name;
        state.workflowDescription = data.description;
        state.workflowVersion = data.version;
        state.workflowStatus = data.status;
        state.nodes = data.nodes;
        state.edges = data.edges;
        state.selectedNodeId = null;
        state.undoStack = [];
        state.redoStack = [];
        state.stateVariables = {};
        state.evaluationResults = [];
        state.isDirty = false;
      }),
  })),
);
