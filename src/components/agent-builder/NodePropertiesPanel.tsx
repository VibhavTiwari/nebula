/**
 * Node Properties Panel — Agent Builder
 *
 * Right-side panel for editing selected node configuration.
 * Renders type-specific form fields based on the node type.
 * Dark theme design.
 */

import { useCallback } from "react";
import type { Node } from "reactflow";
import clsx from "clsx";

// ── Types ──

interface NodePropertiesPanelProps {
  node: Node;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

interface Category {
  name: string;
  description: string;
}

interface OutputMapping {
  key: string;
  value: string;
}

interface GuardrailRule {
  name: string;
  type: "input" | "output";
  condition: string;
  action: "block" | "warn" | "log";
}

// ── Constants ──

const MODEL_OPTIONS = [
  "gpt-4o",
  "gpt-4o-mini",
  "claude-sonnet-4-20250514",
  "claude-opus-4-20250514",
  "gemini-2.0-flash",
];

const TOOL_OPTIONS = [
  "file_search",
  "code_interpreter",
  "web_search",
  "function_call",
];

const NOTE_COLORS = [
  { name: "yellow", value: "#713f12", borderColor: "border-accent-yellow" },
  { name: "blue", value: "#1e3a5f", borderColor: "border-accent-blue" },
  { name: "green", value: "#166534", borderColor: "border-accent-green" },
  { name: "pink", value: "#831843", borderColor: "border-accent-pink" },
];

const NODE_META: Record<string, { icon: string; color: string; bgColor: string }> = {
  agent: { icon: "A", color: "text-nebula-400", bgColor: "bg-nebula-500/20" },
  classify: { icon: "C", color: "text-accent-purple", bgColor: "bg-accent-purple/20" },
  end: { icon: "E", color: "text-text-muted", bgColor: "bg-panel-hover" },
  note: { icon: "N", color: "text-accent-yellow", bgColor: "bg-accent-yellow/20" },
  "file-search": { icon: "F", color: "text-accent-green", bgColor: "bg-accent-green/20" },
  guardrails: { icon: "G", color: "text-accent-red", bgColor: "bg-accent-red/20" },
  mcp: { icon: "M", color: "text-accent-teal", bgColor: "bg-accent-teal/20" },
  "if-else": { icon: "?", color: "text-accent-orange", bgColor: "bg-accent-orange/20" },
  "while-loop": { icon: "W", color: "text-accent-indigo", bgColor: "bg-accent-indigo/20" },
  "user-approval": { icon: "U", color: "text-accent-blue", bgColor: "bg-accent-blue/20" },
  transform: { icon: "X", color: "text-accent-amber", bgColor: "bg-accent-amber/20" },
  "set-state": { icon: "S", color: "text-accent-sky", bgColor: "bg-accent-sky/20" },
  start: { icon: "S", color: "text-accent-green", bgColor: "bg-accent-green/20" },
  "tool-call": { icon: "T", color: "text-accent-purple", bgColor: "bg-accent-purple/20" },
  gate: { icon: "G", color: "text-accent-red", bgColor: "bg-accent-red/20" },
  question: { icon: "?", color: "text-accent-teal", bgColor: "bg-accent-teal/20" },
  "deploy-step": { icon: "D", color: "text-accent-orange", bgColor: "bg-accent-orange/20" },
};

// ── Main Component ──

export function NodePropertiesPanel({
  node,
  onUpdate,
  onDelete,
  onClose,
}: NodePropertiesPanelProps) {
  const data = node.data as Record<string, unknown>;
  const nodeType = node.type || "agent";
  const meta = NODE_META[nodeType] || { icon: "?", color: "text-text-muted", bgColor: "bg-panel-hover" };

  const update = useCallback(
    (patch: Record<string, unknown>) => {
      onUpdate(node.id, { ...data, ...patch });
    },
    [node.id, data, onUpdate]
  );

  const updateConfig = useCallback(
    (patch: Record<string, unknown>) => {
      const config = (data.config ?? {}) as Record<string, unknown>;
      onUpdate(node.id, { ...data, config: { ...config, ...patch } });
    },
    [node.id, data, onUpdate]
  );

  const config = (data.config ?? {}) as Record<string, unknown>;

  return (
    <aside className="w-80 border-l border-panel-border bg-panel-card flex flex-col h-full shrink-0 nebula-slide-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
              meta.bgColor,
              meta.color
            )}
          >
            {meta.icon}
          </div>
          <span className="text-sm font-medium text-text-primary capitalize">{nodeType.replace(/-/g, " ")}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDelete(node.id)}
            className="p-1.5 rounded-lg hover:bg-accent-red-soft text-text-muted hover:text-accent-red transition-colors"
            title="Delete node"
          >
            <TrashIcon />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-panel-hover text-text-muted hover:text-text-primary transition-colors"
            title="Close panel"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Common Fields */}
        <Section title="General">
          <Field label="Label">
            <input
              type="text"
              value={(data.label as string) ?? ""}
              onChange={(e) => update({ label: e.target.value })}
              className="nebula-input text-sm"
              placeholder="Node label"
            />
          </Field>
          <Field label="Node ID">
            <div className="text-xs font-mono text-text-muted bg-panel-bg rounded-lg px-3 py-2 border border-panel-border select-all">
              {node.id}
            </div>
          </Field>
        </Section>

        {/* Type-specific Fields */}
        {nodeType === "agent" && (
          <AgentFields config={config} updateConfig={updateConfig} />
        )}
        {nodeType === "classify" && (
          <ClassifyFields config={config} updateConfig={updateConfig} />
        )}
        {nodeType === "end" && (
          <EndFields config={config} updateConfig={updateConfig} />
        )}
        {nodeType === "note" && (
          <NoteFields config={config} updateConfig={updateConfig} />
        )}
        {nodeType === "file-search" && (
          <FileSearchFields config={config} updateConfig={updateConfig} />
        )}
        {nodeType === "guardrails" && (
          <GuardrailsFields config={config} updateConfig={updateConfig} />
        )}
        {nodeType === "mcp" && (
          <McpFields config={config} updateConfig={updateConfig} />
        )}
        {nodeType === "if-else" && (
          <IfElseFields config={config} updateConfig={updateConfig} />
        )}
        {nodeType === "while-loop" && (
          <WhileLoopFields config={config} updateConfig={updateConfig} />
        )}
        {nodeType === "user-approval" && (
          <UserApprovalFields config={config} updateConfig={updateConfig} />
        )}
        {nodeType === "transform" && (
          <TransformFields config={config} updateConfig={updateConfig} />
        )}
        {nodeType === "set-state" && (
          <SetStateFields config={config} updateConfig={updateConfig} />
        )}
      </div>
    </aside>
  );
}

// ── Shared Layout Components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="nebula-section-title">
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="nebula-label">{label}</label>
      {children}
    </div>
  );
}

// ── Icons ──

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M9 6.5v4M5 6.5v4M3.5 4l.5 7.5a1 1 0 001 1h4a1 1 0 001-1L10.5 4" />
    </svg>
  );
}

// ── Type-Specific Field Components ──

interface FieldProps {
  config: Record<string, unknown>;
  updateConfig: (patch: Record<string, unknown>) => void;
}

// ── Agent Fields ──

function AgentFields({ config, updateConfig }: FieldProps) {
  const tools = (config.tools as string[]) ?? [];

  const toggleTool = (tool: string) => {
    const next = tools.includes(tool) ? tools.filter((t) => t !== tool) : [...tools, tool];
    updateConfig({ tools: next });
  };

  return (
    <Section title="Agent Configuration">
      <Field label="Model">
        <select
          value={(config.model as string) ?? "gpt-4o"}
          onChange={(e) => updateConfig({ model: e.target.value })}
          className="nebula-select text-sm"
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </Field>

      <Field label="Instructions">
        <textarea
          value={(config.instructions as string) ?? ""}
          onChange={(e) => updateConfig({ instructions: e.target.value })}
          className="nebula-textarea text-sm"
          rows={6}
          placeholder="System instructions for this agent..."
        />
      </Field>

      <Field label="Temperature">
        <input
          type="number"
          value={(config.temperature as number) ?? 1}
          onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
          className="nebula-input text-sm"
          min={0}
          max={2}
          step={0.1}
        />
      </Field>

      <Field label="Max Tokens">
        <input
          type="number"
          value={(config.maxTokens as number) ?? ""}
          onChange={(e) =>
            updateConfig({ maxTokens: e.target.value ? parseInt(e.target.value, 10) : undefined })
          }
          className="nebula-input text-sm"
          placeholder="e.g. 4096"
          min={1}
        />
      </Field>

      <Field label="Tools">
        <div className="space-y-2">
          {TOOL_OPTIONS.map((tool) => (
            <label key={tool} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={tools.includes(tool)}
                onChange={() => toggleTool(tool)}
                className="nebula-checkbox w-4 h-4"
              />
              <span className="text-xs font-mono text-text-secondary group-hover:text-text-primary transition-colors">{tool}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Handoff Agents">
        <textarea
          value={(config.handoffAgents as string) ?? ""}
          onChange={(e) => updateConfig({ handoffAgents: e.target.value })}
          className="nebula-textarea text-sm"
          rows={2}
          placeholder="Comma-separated agent IDs..."
        />
      </Field>
    </Section>
  );
}

// ── Classify Fields ──

function ClassifyFields({ config, updateConfig }: FieldProps) {
  const categories = (config.categories as Category[]) ?? [];

  const addCategory = () => {
    updateConfig({ categories: [...categories, { name: "", description: "" }] });
  };

  const removeCategory = (index: number) => {
    updateConfig({ categories: categories.filter((_, i) => i !== index) });
  };

  const updateCategory = (index: number, patch: Partial<Category>) => {
    const next = categories.map((cat, i) => (i === index ? { ...cat, ...patch } : cat));
    updateConfig({ categories: next });
  };

  return (
    <Section title="Classification Configuration">
      <Field label="Instructions">
        <textarea
          value={(config.instructions as string) ?? ""}
          onChange={(e) => updateConfig({ instructions: e.target.value })}
          className="nebula-textarea text-sm"
          rows={4}
          placeholder="Classification instructions..."
        />
      </Field>

      <Field label="Model">
        <select
          value={(config.model as string) ?? "gpt-4o"}
          onChange={(e) => updateConfig({ model: e.target.value })}
          className="nebula-select text-sm"
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="nebula-label !mb-0">Categories</label>
          <button
            onClick={addCategory}
            className="text-xs text-nebula-400 hover:text-nebula-300 font-medium transition-colors"
          >
            + Add Category
          </button>
        </div>
        <div className="space-y-3">
          {categories.map((cat, i) => (
            <div key={i} className="border border-panel-border rounded-lg p-3 relative bg-panel-bg">
              <button
                onClick={() => removeCategory(i)}
                className="absolute top-2 right-2 text-text-muted hover:text-accent-red transition-colors"
                title="Remove category"
              >
                <CloseIcon />
              </button>
              <div className="space-y-2 pr-6">
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => updateCategory(i, { name: e.target.value })}
                  className="nebula-input text-sm"
                  placeholder="Category name"
                />
                <textarea
                  value={cat.description}
                  onChange={(e) => updateCategory(i, { description: e.target.value })}
                  className="nebula-textarea text-sm"
                  rows={2}
                  placeholder="Category description"
                />
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-xs text-text-muted text-center py-4 border border-dashed border-panel-border rounded-lg">
              No categories defined. Click &quot;+ Add Category&quot; to create one.
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

// ── End Fields ──

function EndFields({ config, updateConfig }: FieldProps) {
  const mappings = (config.outputMappings as OutputMapping[]) ?? [];

  const addMapping = () => {
    updateConfig({ outputMappings: [...mappings, { key: "", value: "" }] });
  };

  const removeMapping = (index: number) => {
    updateConfig({ outputMappings: mappings.filter((_, i) => i !== index) });
  };

  const updateMapping = (index: number, patch: Partial<OutputMapping>) => {
    const next = mappings.map((m, i) => (i === index ? { ...m, ...patch } : m));
    updateConfig({ outputMappings: next });
  };

  return (
    <Section title="End Configuration">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="nebula-label !mb-0">Output Mapping</label>
          <button
            onClick={addMapping}
            className="text-xs text-nebula-400 hover:text-nebula-300 font-medium transition-colors"
          >
            + Add Row
          </button>
        </div>
        <div className="space-y-2">
          {mappings.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={m.key}
                onChange={(e) => updateMapping(i, { key: e.target.value })}
                className="nebula-input text-sm flex-1"
                placeholder="Key"
              />
              <span className="text-xs text-text-muted shrink-0">:</span>
              <input
                type="text"
                value={m.value}
                onChange={(e) => updateMapping(i, { value: e.target.value })}
                className="nebula-input text-sm flex-1"
                placeholder="Value"
              />
              <button
                onClick={() => removeMapping(i)}
                className="text-text-muted hover:text-accent-red shrink-0 p-1"
                title="Remove row"
              >
                <CloseIcon />
              </button>
            </div>
          ))}
          {mappings.length === 0 && (
            <div className="text-xs text-text-muted text-center py-4 border border-dashed border-panel-border rounded-lg">
              No output mappings. Click &quot;+ Add Row&quot; to add one.
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

// ── Note Fields ──

function NoteFields({ config, updateConfig }: FieldProps) {
  return (
    <Section title="Note Configuration">
      <Field label="Text">
        <textarea
          value={(config.text as string) ?? ""}
          onChange={(e) => updateConfig({ text: e.target.value })}
          className="nebula-textarea text-sm"
          rows={4}
          placeholder="Note text..."
        />
      </Field>

      <Field label="Color">
        <div className="flex gap-2">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => updateConfig({ color: c.value })}
              className={clsx(
                "w-8 h-8 rounded-lg border-2 transition-all",
                (config.color as string) === c.value
                  ? `${c.borderColor} scale-110`
                  : "border-panel-border hover:border-panel-border-light"
              )}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
      </Field>
    </Section>
  );
}

// ── File Search Fields ──

function FileSearchFields({ config, updateConfig }: FieldProps) {
  const vectorStoreIds = (config.vectorStoreIds as string[]) ?? [];
  const inputValue = (config._vectorStoreInput as string) ?? "";

  const addVectorStoreId = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !vectorStoreIds.includes(trimmed)) {
      updateConfig({
        vectorStoreIds: [...vectorStoreIds, trimmed],
        _vectorStoreInput: "",
      });
    }
  };

  const removeVectorStoreId = (id: string) => {
    updateConfig({ vectorStoreIds: vectorStoreIds.filter((v) => v !== id) });
  };

  return (
    <Section title="File Search Configuration">
      <Field label="Vector Store IDs">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => updateConfig({ _vectorStoreInput: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addVectorStoreId();
                }
              }}
              className="nebula-input text-sm flex-1"
              placeholder="Enter store ID and press Enter"
            />
            <button
              onClick={addVectorStoreId}
              className="nebula-btn-secondary text-xs shrink-0"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {vectorStoreIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 bg-panel-hover text-xs font-mono px-2 py-1 rounded-lg border border-panel-border"
              >
                {id}
                <button
                  onClick={() => removeVectorStoreId(id)}
                  className="text-text-muted hover:text-accent-red transition-colors"
                >
                  <CloseIcon />
                </button>
              </span>
            ))}
          </div>
        </div>
      </Field>

      <Field label="Max Results">
        <input
          type="number"
          value={(config.maxResults as number) ?? ""}
          onChange={(e) =>
            updateConfig({ maxResults: e.target.value ? parseInt(e.target.value, 10) : undefined })
          }
          className="nebula-input text-sm"
          placeholder="e.g. 10"
          min={1}
        />
      </Field>
    </Section>
  );
}

// ── Guardrails Fields ──

function GuardrailsFields({ config, updateConfig }: FieldProps) {
  const rules = (config.rules as GuardrailRule[]) ?? [];

  const addRule = () => {
    updateConfig({
      rules: [...rules, { name: "", type: "input", condition: "", action: "block" }],
    });
  };

  const removeRule = (index: number) => {
    updateConfig({ rules: rules.filter((_, i) => i !== index) });
  };

  const updateRule = (index: number, patch: Partial<GuardrailRule>) => {
    const next = rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
    updateConfig({ rules: next });
  };

  return (
    <Section title="Guardrails Configuration">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="nebula-label !mb-0">Rules</label>
          <button
            onClick={addRule}
            className="text-xs text-nebula-400 hover:text-nebula-300 font-medium transition-colors"
          >
            + Add Rule
          </button>
        </div>
        <div className="space-y-3">
          {rules.map((rule, i) => (
            <div key={i} className="border border-panel-border rounded-lg p-3 relative bg-panel-bg">
              <button
                onClick={() => removeRule(i)}
                className="absolute top-2 right-2 text-text-muted hover:text-accent-red transition-colors"
                title="Remove rule"
              >
                <CloseIcon />
              </button>
              <div className="space-y-2 pr-6">
                <input
                  type="text"
                  value={rule.name}
                  onChange={(e) => updateRule(i, { name: e.target.value })}
                  className="nebula-input text-sm"
                  placeholder="Rule name"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="nebula-label">Type</label>
                    <select
                      value={rule.type}
                      onChange={(e) => updateRule(i, { type: e.target.value as "input" | "output" })}
                      className="nebula-select text-sm"
                    >
                      <option value="input">Input</option>
                      <option value="output">Output</option>
                    </select>
                  </div>
                  <div>
                    <label className="nebula-label">Action</label>
                    <select
                      value={rule.action}
                      onChange={(e) =>
                        updateRule(i, { action: e.target.value as "block" | "warn" | "log" })
                      }
                      className="nebula-select text-sm"
                    >
                      <option value="block">Block</option>
                      <option value="warn">Warn</option>
                      <option value="log">Log</option>
                    </select>
                  </div>
                </div>
                <input
                  type="text"
                  value={rule.condition}
                  onChange={(e) => updateRule(i, { condition: e.target.value })}
                  className="nebula-input text-sm"
                  placeholder="Condition expression"
                />
              </div>
            </div>
          ))}
          {rules.length === 0 && (
            <div className="text-xs text-text-muted text-center py-4 border border-dashed border-panel-border rounded-lg">
              No rules defined. Click &quot;+ Add Rule&quot; to create one.
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

// ── MCP Fields ──

function McpFields({ config, updateConfig }: FieldProps) {
  return (
    <Section title="MCP Configuration">
      <Field label="Server ID">
        <input
          type="text"
          value={(config.serverId as string) ?? ""}
          onChange={(e) => updateConfig({ serverId: e.target.value })}
          className="nebula-input text-sm"
          placeholder="e.g. my-mcp-server"
        />
      </Field>

      <Field label="Tool Name">
        <input
          type="text"
          value={(config.toolName as string) ?? ""}
          onChange={(e) => updateConfig({ toolName: e.target.value })}
          className="nebula-input text-sm"
          placeholder="e.g. read_file"
        />
      </Field>

      <Field label="Parameters (JSON)">
        <textarea
          value={(config.parameters as string) ?? "{\n  \n}"}
          onChange={(e) => updateConfig({ parameters: e.target.value })}
          className="nebula-textarea text-sm font-mono"
          rows={6}
          placeholder='{"key": "value"}'
          spellCheck={false}
        />
      </Field>
    </Section>
  );
}

// ── If-Else Fields ──

function IfElseFields({ config, updateConfig }: FieldProps) {
  return (
    <Section title="If-Else Configuration">
      <Field label="Condition Type">
        <select
          value={(config.conditionType as string) ?? "code"}
          onChange={(e) => updateConfig({ conditionType: e.target.value })}
          className="nebula-select text-sm"
        >
          <option value="code">Code</option>
          <option value="llm">LLM</option>
          <option value="variable">Variable</option>
        </select>
      </Field>

      <Field label="Condition">
        <textarea
          value={(config.condition as string) ?? ""}
          onChange={(e) => updateConfig({ condition: e.target.value })}
          className="nebula-textarea text-sm font-mono"
          rows={4}
          placeholder="Enter condition expression..."
          spellCheck={false}
        />
      </Field>

      <div className="pt-2 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-green" />
          <span className="text-xs font-medium text-accent-green">Pass (true)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-red" />
          <span className="text-xs font-medium text-accent-red">Fail (false)</span>
        </div>
      </div>
    </Section>
  );
}

// ── While-Loop Fields ──

function WhileLoopFields({ config, updateConfig }: FieldProps) {
  return (
    <Section title="While Loop Configuration">
      <Field label="Condition Type">
        <select
          value={(config.conditionType as string) ?? "code"}
          onChange={(e) => updateConfig({ conditionType: e.target.value })}
          className="nebula-select text-sm"
        >
          <option value="code">Code</option>
          <option value="llm">LLM</option>
          <option value="variable">Variable</option>
        </select>
      </Field>

      <Field label="Condition">
        <textarea
          value={(config.condition as string) ?? ""}
          onChange={(e) => updateConfig({ condition: e.target.value })}
          className="nebula-textarea text-sm font-mono"
          rows={4}
          placeholder="Loop condition expression..."
          spellCheck={false}
        />
      </Field>

      <Field label="Max Iterations">
        <input
          type="number"
          value={(config.maxIterations as number) ?? 10}
          onChange={(e) =>
            updateConfig({ maxIterations: e.target.value ? parseInt(e.target.value, 10) : 10 })
          }
          className="nebula-input text-sm"
          min={1}
        />
      </Field>
    </Section>
  );
}

// ── User Approval Fields ──

function UserApprovalFields({ config, updateConfig }: FieldProps) {
  return (
    <Section title="User Approval Configuration">
      <Field label="Prompt">
        <textarea
          value={(config.prompt as string) ?? ""}
          onChange={(e) => updateConfig({ prompt: e.target.value })}
          className="nebula-textarea text-sm"
          rows={4}
          placeholder="Message shown to user for approval..."
        />
      </Field>

      <Field label="Timeout (seconds)">
        <input
          type="number"
          value={(config.timeout as number) ?? ""}
          onChange={(e) =>
            updateConfig({ timeout: e.target.value ? parseInt(e.target.value, 10) : undefined })
          }
          className="nebula-input text-sm"
          placeholder="e.g. 300"
          min={0}
        />
      </Field>
    </Section>
  );
}

// ── Transform Fields ──

function TransformFields({ config, updateConfig }: FieldProps) {
  return (
    <Section title="Transform Configuration">
      <Field label="Language">
        <select
          value={(config.language as string) ?? "javascript"}
          onChange={(e) => updateConfig({ language: e.target.value })}
          className="nebula-select text-sm"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
        </select>
      </Field>

      <Field label="Code">
        <textarea
          value={(config.code as string) ?? ""}
          onChange={(e) => updateConfig({ code: e.target.value })}
          className="nebula-textarea text-sm font-mono"
          rows={8}
          placeholder="// Transform code..."
          spellCheck={false}
        />
      </Field>
    </Section>
  );
}

// ── Set-State Fields ──

function SetStateFields({ config, updateConfig }: FieldProps) {
  return (
    <Section title="Set State Configuration">
      <Field label="Key">
        <input
          type="text"
          value={(config.key as string) ?? ""}
          onChange={(e) => updateConfig({ key: e.target.value })}
          className="nebula-input text-sm"
          placeholder="State key"
        />
      </Field>

      <Field label="Value">
        <input
          type="text"
          value={(config.value as string) ?? ""}
          onChange={(e) => updateConfig({ value: e.target.value })}
          className="nebula-input text-sm"
          placeholder="State value"
        />
      </Field>

      <Field label="Value Type">
        <select
          value={(config.valueType as string) ?? "string"}
          onChange={(e) => updateConfig({ valueType: e.target.value })}
          className="nebula-select text-sm"
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="json">JSON</option>
        </select>
      </Field>
    </Section>
  );
}
