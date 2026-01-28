/**
 * Node Properties Panel — Agent Builder
 *
 * Right-side panel for editing selected node configuration.
 * Renders type-specific form fields based on the node type.
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
  { name: "yellow", value: "#fef9c3" },
  { name: "blue", value: "#dbeafe" },
  { name: "green", value: "#dcfce7" },
  { name: "pink", value: "#fce7f3" },
];

const NODE_META: Record<string, { icon: string; color: string }> = {
  agent: { icon: "A", color: "bg-blue-100 text-blue-700" },
  classify: { icon: "C", color: "bg-indigo-100 text-indigo-700" },
  end: { icon: "E", color: "bg-gray-100 text-gray-700" },
  note: { icon: "N", color: "bg-yellow-100 text-yellow-700" },
  "file-search": { icon: "F", color: "bg-purple-100 text-purple-700" },
  guardrails: { icon: "G", color: "bg-red-100 text-red-700" },
  mcp: { icon: "M", color: "bg-cyan-100 text-cyan-700" },
  "if-else": { icon: "?", color: "bg-orange-100 text-orange-700" },
  "while-loop": { icon: "W", color: "bg-amber-100 text-amber-700" },
  "user-approval": { icon: "U", color: "bg-teal-100 text-teal-700" },
  transform: { icon: "X", color: "bg-amber-100 text-amber-700" },
  "set-state": { icon: "S", color: "bg-emerald-100 text-emerald-700" },
  start: { icon: "S", color: "bg-green-100 text-green-700" },
  "tool-call": { icon: "T", color: "bg-purple-100 text-purple-700" },
  gate: { icon: "G", color: "bg-red-100 text-red-700" },
  question: { icon: "?", color: "bg-teal-100 text-teal-700" },
  "deploy-step": { icon: "D", color: "bg-orange-100 text-orange-700" },
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
  const meta = NODE_META[nodeType] || { icon: "?", color: "bg-gray-100 text-gray-700" };

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
    <aside className="w-80 border-l border-surface-3 bg-white flex flex-col h-full shrink-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
              meta.color
            )}
          >
            {meta.icon}
          </div>
          <span className="text-sm font-medium capitalize">{nodeType.replace(/-/g, " ")}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDelete(node.id)}
            className="p-1.5 rounded hover:bg-red-50 text-surface-dark-4 hover:text-red-600 transition-colors"
            title="Delete node"
          >
            <TrashIcon />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-2 text-surface-dark-4 hover:text-surface-dark-0 transition-colors"
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
            <div className="text-xs font-mono text-surface-dark-4 bg-surface-1 rounded px-2 py-1.5 border border-surface-3 select-all">
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
      <h4 className="text-xs font-semibold text-surface-dark-4 uppercase tracking-wide mb-3">
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-surface-dark-4 mb-1">{label}</label>
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
          className="nebula-input text-sm"
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
          className="nebula-input text-sm resize-none"
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
        <div className="space-y-1.5">
          {TOOL_OPTIONS.map((tool) => (
            <label key={tool} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={tools.includes(tool)}
                onChange={() => toggleTool(tool)}
                className="rounded border-surface-3 text-nebula-600 focus:ring-nebula-500"
              />
              <span className="text-xs font-mono">{tool}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Handoff Agents">
        <textarea
          value={(config.handoffAgents as string) ?? ""}
          onChange={(e) => updateConfig({ handoffAgents: e.target.value })}
          className="nebula-input text-sm resize-none"
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
          className="nebula-input text-sm resize-none"
          rows={4}
          placeholder="Classification instructions..."
        />
      </Field>

      <Field label="Model">
        <select
          value={(config.model as string) ?? "gpt-4o"}
          onChange={(e) => updateConfig({ model: e.target.value })}
          className="nebula-input text-sm"
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-surface-dark-4">Categories</label>
          <button
            onClick={addCategory}
            className="text-xs text-nebula-600 hover:text-nebula-700 font-medium"
          >
            + Add Category
          </button>
        </div>
        <div className="space-y-3">
          {categories.map((cat, i) => (
            <div key={i} className="border border-surface-3 rounded-md p-2.5 relative">
              <button
                onClick={() => removeCategory(i)}
                className="absolute top-1.5 right-1.5 text-surface-dark-4 hover:text-red-500 transition-colors"
                title="Remove category"
              >
                <CloseIcon />
              </button>
              <div className="space-y-2 pr-5">
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
                  className="nebula-input text-sm resize-none"
                  rows={2}
                  placeholder="Category description"
                />
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-xs text-surface-dark-4 text-center py-3">
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
          <label className="text-xs text-surface-dark-4">Output Mapping</label>
          <button
            onClick={addMapping}
            className="text-xs text-nebula-600 hover:text-nebula-700 font-medium"
          >
            + Add Row
          </button>
        </div>
        <div className="space-y-2">
          {mappings.map((m, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                type="text"
                value={m.key}
                onChange={(e) => updateMapping(i, { key: e.target.value })}
                className="nebula-input text-sm flex-1"
                placeholder="Key"
              />
              <span className="text-xs text-surface-dark-4 shrink-0">:</span>
              <input
                type="text"
                value={m.value}
                onChange={(e) => updateMapping(i, { value: e.target.value })}
                className="nebula-input text-sm flex-1"
                placeholder="Value"
              />
              <button
                onClick={() => removeMapping(i)}
                className="text-surface-dark-4 hover:text-red-500 shrink-0 p-0.5"
                title="Remove row"
              >
                <CloseIcon />
              </button>
            </div>
          ))}
          {mappings.length === 0 && (
            <div className="text-xs text-surface-dark-4 text-center py-3">
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
          className="nebula-input text-sm resize-none"
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
                "w-8 h-8 rounded-md border-2 transition-all",
                (config.color as string) === c.value
                  ? "border-nebula-500 scale-110"
                  : "border-surface-3 hover:border-surface-dark-4"
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
          <div className="flex gap-1.5">
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
                className="inline-flex items-center gap-1 bg-surface-2 text-xs font-mono px-2 py-1 rounded"
              >
                {id}
                <button
                  onClick={() => removeVectorStoreId(id)}
                  className="text-surface-dark-4 hover:text-red-500"
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
          <label className="text-xs text-surface-dark-4">Rules</label>
          <button
            onClick={addRule}
            className="text-xs text-nebula-600 hover:text-nebula-700 font-medium"
          >
            + Add Rule
          </button>
        </div>
        <div className="space-y-3">
          {rules.map((rule, i) => (
            <div key={i} className="border border-surface-3 rounded-md p-2.5 relative">
              <button
                onClick={() => removeRule(i)}
                className="absolute top-1.5 right-1.5 text-surface-dark-4 hover:text-red-500 transition-colors"
                title="Remove rule"
              >
                <CloseIcon />
              </button>
              <div className="space-y-2 pr-5">
                <input
                  type="text"
                  value={rule.name}
                  onChange={(e) => updateRule(i, { name: e.target.value })}
                  className="nebula-input text-sm"
                  placeholder="Rule name"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-surface-dark-4 mb-0.5">Type</label>
                    <select
                      value={rule.type}
                      onChange={(e) => updateRule(i, { type: e.target.value as "input" | "output" })}
                      className="nebula-input text-sm"
                    >
                      <option value="input">Input</option>
                      <option value="output">Output</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-surface-dark-4 mb-0.5">Action</label>
                    <select
                      value={rule.action}
                      onChange={(e) =>
                        updateRule(i, { action: e.target.value as "block" | "warn" | "log" })
                      }
                      className="nebula-input text-sm"
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
            <div className="text-xs text-surface-dark-4 text-center py-3">
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
          className="nebula-input text-sm resize-none font-mono"
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
          className="nebula-input text-sm"
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
          className="nebula-input text-sm resize-none font-mono"
          rows={4}
          placeholder="Enter condition expression..."
          spellCheck={false}
        />
      </Field>

      <div className="pt-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-green-700">Pass (true)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs font-medium text-red-700">Fail (false)</span>
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
          className="nebula-input text-sm"
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
          className="nebula-input text-sm resize-none font-mono"
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
          className="nebula-input text-sm resize-none"
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
          className="nebula-input text-sm"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
        </select>
      </Field>

      <Field label="Code">
        <textarea
          value={(config.code as string) ?? ""}
          onChange={(e) => updateConfig({ code: e.target.value })}
          className="nebula-input text-sm resize-none font-mono"
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
          className="nebula-input text-sm"
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
