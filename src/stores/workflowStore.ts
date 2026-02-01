import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type WorkflowStatus = "draft" | "published";

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  author: string;
  nodeCount?: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  nodes: unknown[];
  edges: unknown[];
}

type ActiveTab = "drafts" | "templates";

interface WorkflowStoreState {
  /** List of all workflows */
  workflows: WorkflowSummary[];

  /** Pre-built workflow templates */
  templates: WorkflowTemplate[];

  /** Current active tab in the list view */
  activeTab: ActiveTab;

  /** Currently selected workflow ID for editing */
  editingWorkflowId: string | null;

  /** Actions */
  setActiveTab: (tab: ActiveTab) => void;
  setEditingWorkflowId: (id: string | null) => void;

  /** CRUD operations */
  createWorkflow: (workflow: Omit<WorkflowSummary, "id" | "createdAt" | "updatedAt">) => string;
  updateWorkflow: (id: string, updates: Partial<Omit<WorkflowSummary, "id" | "createdAt">>) => void;
  deleteWorkflow: (id: string) => void;
  duplicateWorkflow: (id: string) => string | null;
  getWorkflow: (id: string) => WorkflowSummary | undefined;

  /** Template operations */
  createFromTemplate: (templateId: string, name?: string) => string | null;
}

/* ------------------------------------------------------------------ */
/*  Default Templates                                                  */
/* ------------------------------------------------------------------ */

const DEFAULT_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "customer-support-bot",
    name: "Customer Support Bot",
    description: "An intelligent support agent that handles customer inquiries, routes complex issues, and maintains conversation context.",
    icon: "headset",
    category: "Support",
    nodes: [
      { id: "start", type: "start", position: { x: 400, y: 0 }, data: { label: "Start", config: {} } },
      { id: "guard-in", type: "guardrails", position: { x: 400, y: 100 }, data: { label: "Input Guard", config: { rules: [{ name: "No PII", type: "input", condition: "no_pii", action: "warn" }] } } },
      { id: "classify", type: "classify", position: { x: 400, y: 220 }, data: { label: "Intent Classifier", config: { model: "gpt-4o-mini", categories: [{ id: "billing", name: "Billing", description: "Payment and billing questions" }, { id: "technical", name: "Technical", description: "Technical support issues" }, { id: "general", name: "General", description: "General inquiries" }] } } },
      { id: "billing-agent", type: "agent", position: { x: 150, y: 360 }, data: { label: "Billing Support", config: { model: "gpt-4o", instructions: "Handle billing inquiries with empathy", tools: ["file_search"] } } },
      { id: "tech-agent", type: "agent", position: { x: 400, y: 360 }, data: { label: "Tech Support", config: { model: "gpt-4o", instructions: "Resolve technical issues", tools: ["code_interpreter"] } } },
      { id: "general-agent", type: "agent", position: { x: 650, y: 360 }, data: { label: "General Support", config: { model: "gpt-4o-mini", instructions: "Handle general inquiries" } } },
      { id: "satisfaction", type: "agent", position: { x: 400, y: 500 }, data: { label: "Satisfaction Check", config: { model: "gpt-4o-mini", instructions: "Ask if the issue was resolved" } } },
      { id: "end", type: "end", position: { x: 400, y: 620 }, data: { label: "End", config: {} } },
    ],
    edges: [
      { id: "e1", source: "start", target: "guard-in" },
      { id: "e2", source: "guard-in", target: "classify" },
      { id: "e3", source: "classify", sourceHandle: "billing", target: "billing-agent", label: "billing" },
      { id: "e4", source: "classify", sourceHandle: "technical", target: "tech-agent", label: "technical" },
      { id: "e5", source: "classify", sourceHandle: "general", target: "general-agent", label: "general" },
      { id: "e6", source: "billing-agent", target: "satisfaction" },
      { id: "e7", source: "tech-agent", target: "satisfaction" },
      { id: "e8", source: "general-agent", target: "satisfaction" },
      { id: "e9", source: "satisfaction", target: "end" },
    ],
  },
  {
    id: "research-agent",
    name: "Research Agent",
    description: "A research assistant that searches multiple sources, synthesizes information, and generates comprehensive reports.",
    icon: "search",
    category: "Research",
    nodes: [
      { id: "start", type: "start", position: { x: 400, y: 0 }, data: { label: "Start", config: {} } },
      { id: "planner", type: "agent", position: { x: 400, y: 100 }, data: { label: "Research Planner", config: { model: "gpt-4o", instructions: "Break down research query into subtasks" } } },
      { id: "web-search", type: "mcp", position: { x: 200, y: 240 }, data: { label: "Web Search", config: { serverId: "web-search", toolName: "search", parameters: "{}" } } },
      { id: "file-search", type: "file-search", position: { x: 400, y: 240 }, data: { label: "Document Search", config: { vectorStoreIds: [], maxResults: 10 } } },
      { id: "api-search", type: "mcp", position: { x: 600, y: 240 }, data: { label: "API Data", config: { serverId: "data-api", toolName: "query", parameters: "{}" } } },
      { id: "synthesizer", type: "agent", position: { x: 400, y: 380 }, data: { label: "Synthesizer", config: { model: "claude-opus-4-20250514", instructions: "Combine all research findings into coherent analysis" } } },
      { id: "fact-check", type: "guardrails", position: { x: 400, y: 500 }, data: { label: "Fact Check", config: { rules: [{ name: "Verify claims", type: "output", condition: "grounded", action: "warn" }] } } },
      { id: "report", type: "transform", position: { x: 400, y: 620 }, data: { label: "Format Report", config: { language: "javascript", code: "return { report: formatAsMarkdown(data) }" } } },
      { id: "end", type: "end", position: { x: 400, y: 740 }, data: { label: "End", config: {} } },
    ],
    edges: [
      { id: "e1", source: "start", target: "planner" },
      { id: "e2", source: "planner", target: "web-search" },
      { id: "e3", source: "planner", target: "file-search" },
      { id: "e4", source: "planner", target: "api-search" },
      { id: "e5", source: "web-search", target: "synthesizer" },
      { id: "e6", source: "file-search", target: "synthesizer" },
      { id: "e7", source: "api-search", target: "synthesizer" },
      { id: "e8", source: "synthesizer", target: "fact-check" },
      { id: "e9", source: "fact-check", target: "report" },
      { id: "e10", source: "report", target: "end" },
    ],
  },
  {
    id: "data-pipeline",
    name: "Data Pipeline",
    description: "An automated data processing workflow with validation, transformation, and error handling capabilities.",
    icon: "database",
    category: "Data",
    nodes: [
      { id: "start", type: "start", position: { x: 400, y: 0 }, data: { label: "Start", config: {} } },
      { id: "fetch", type: "mcp", position: { x: 400, y: 100 }, data: { label: "Fetch Data", config: { serverId: "data-source", toolName: "fetch_records", parameters: "{}" } } },
      { id: "validate", type: "if-else", position: { x: 400, y: 220 }, data: { label: "Validate Schema", config: { conditionType: "code", condition: "data.isValid && data.records.length > 0" } } },
      { id: "transform", type: "transform", position: { x: 250, y: 360 }, data: { label: "Transform Data", config: { language: "javascript", code: "return data.records.map(r => ({ ...r, processed: true, timestamp: Date.now() }))" } } },
      { id: "error-handler", type: "agent", position: { x: 550, y: 360 }, data: { label: "Error Handler", config: { model: "gpt-4o-mini", instructions: "Log and categorize data validation errors" } } },
      { id: "enrich", type: "agent", position: { x: 250, y: 480 }, data: { label: "Data Enrichment", config: { model: "gpt-4o", instructions: "Add metadata and categorization to records" } } },
      { id: "store", type: "mcp", position: { x: 250, y: 600 }, data: { label: "Store Results", config: { serverId: "database", toolName: "insert_batch", parameters: "{}" } } },
      { id: "notify", type: "agent", position: { x: 400, y: 720 }, data: { label: "Send Notification", config: { model: "gpt-4o-mini", instructions: "Generate processing summary notification" } } },
      { id: "end", type: "end", position: { x: 400, y: 840 }, data: { label: "Complete", config: {} } },
    ],
    edges: [
      { id: "e1", source: "start", target: "fetch" },
      { id: "e2", source: "fetch", target: "validate" },
      { id: "e3", source: "validate", sourceHandle: "pass", target: "transform", label: "valid" },
      { id: "e4", source: "validate", sourceHandle: "fail", target: "error-handler", label: "invalid" },
      { id: "e5", source: "transform", target: "enrich" },
      { id: "e6", source: "enrich", target: "store" },
      { id: "e7", source: "store", target: "notify" },
      { id: "e8", source: "error-handler", target: "notify" },
      { id: "e9", source: "notify", target: "end" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Initial State                                                      */
/* ------------------------------------------------------------------ */

const initialState = {
  workflows: [] as WorkflowSummary[],
  templates: DEFAULT_TEMPLATES,
  activeTab: "drafts" as ActiveTab,
  editingWorkflowId: null as string | null,
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useWorkflowStore = create<WorkflowStoreState>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      /* ------ Tab & Selection ------ */

      setActiveTab: (tab) =>
        set((state) => {
          state.activeTab = tab;
        }),

      setEditingWorkflowId: (id) =>
        set((state) => {
          state.editingWorkflowId = id;
        }),

      /* ------ CRUD Operations ------ */

      createWorkflow: (workflow) => {
        const id = `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const now = new Date().toISOString();

        set((state) => {
          state.workflows.unshift({
            ...workflow,
            id,
            createdAt: now,
            updatedAt: now,
          });
        });

        return id;
      },

      updateWorkflow: (id, updates) =>
        set((state) => {
          const index = state.workflows.findIndex((w) => w.id === id);
          if (index !== -1) {
            state.workflows[index] = {
              ...state.workflows[index],
              ...updates,
              updatedAt: new Date().toISOString(),
            };
          }
        }),

      deleteWorkflow: (id) =>
        set((state) => {
          state.workflows = state.workflows.filter((w) => w.id !== id);
          if (state.editingWorkflowId === id) {
            state.editingWorkflowId = null;
          }
        }),

      duplicateWorkflow: (id) => {
        const workflow = get().workflows.find((w) => w.id === id);
        if (!workflow) return null;

        const newId = `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const now = new Date().toISOString();

        set((state) => {
          state.workflows.unshift({
            ...workflow,
            id: newId,
            name: `${workflow.name} (Copy)`,
            status: "draft",
            createdAt: now,
            updatedAt: now,
          });
        });

        return newId;
      },

      getWorkflow: (id) => {
        return get().workflows.find((w) => w.id === id);
      },

      /* ------ Template Operations ------ */

      createFromTemplate: (templateId, name) => {
        const template = get().templates.find((t) => t.id === templateId);
        if (!template) return null;

        const id = `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const now = new Date().toISOString();

        set((state) => {
          state.workflows.unshift({
            id,
            name: name || template.name,
            description: template.description,
            status: "draft",
            createdAt: now,
            updatedAt: now,
            author: "You",
            nodeCount: template.nodes.length,
          });
        });

        return id;
      },
    })),
    {
      name: "nebula-workflow-store",
      partialize: (state) => ({
        workflows: state.workflows,
        activeTab: state.activeTab,
      }),
    }
  )
);
