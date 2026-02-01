/**
 * ClassifyPropertiesPanel - Configuration panel for Classify nodes
 *
 * Matches OpenAI's classifier node interface:
 * - Name input
 * - Input variable selector with type badge
 * - Categories list with add/delete
 * - Classifier model dropdown
 * - Examples section with input/category pairs
 */

import { useState } from "react";
import clsx from "clsx";
import { VariableSelector } from "./shared/VariableSelector";
import { ModelSelector } from "./shared/ModelSelector";

// ── Types ──

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface ClassifyExample {
  id: string;
  input: string;
  categoryId: string;
}

interface ClassifyConfig {
  inputVariable?: string;
  categories?: Category[];
  model?: string;
  instructions?: string;
  examples?: ClassifyExample[];
  confidence_threshold?: number;
}

interface ClassifyPropertiesPanelProps {
  nodeId: string;
  config: ClassifyConfig;
  onUpdate: (config: Partial<ClassifyConfig>) => void;
}

// ── Helper to generate IDs ──

function generateId(): string {
  return `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ── Component ──

export function ClassifyPropertiesPanel({
  nodeId: _nodeId,
  config,
  onUpdate,
}: ClassifyPropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<"categories" | "examples">("categories");

  const categories = config.categories || [];
  const examples = config.examples || [];

  // ── Category handlers ──

  const addCategory = () => {
    const newCategory: Category = {
      id: generateId(),
      name: "",
      description: "",
    };
    onUpdate({ categories: [...categories, newCategory] });
  };

  const updateCategory = (id: string, patch: Partial<Category>) => {
    const next = categories.map((cat) =>
      cat.id === id ? { ...cat, ...patch } : cat
    );
    onUpdate({ categories: next });
  };

  const removeCategory = (id: string) => {
    onUpdate({
      categories: categories.filter((cat) => cat.id !== id),
      // Also remove examples that reference this category
      examples: examples.filter((ex) => ex.categoryId !== id),
    });
  };

  // ── Example handlers ──

  const addExample = () => {
    const newExample: ClassifyExample = {
      id: generateId(),
      input: "",
      categoryId: categories[0]?.id || "",
    };
    onUpdate({ examples: [...examples, newExample] });
  };

  const updateExample = (id: string, patch: Partial<ClassifyExample>) => {
    const next = examples.map((ex) =>
      ex.id === id ? { ...ex, ...patch } : ex
    );
    onUpdate({ examples: next });
  };

  const removeExample = (id: string) => {
    onUpdate({ examples: examples.filter((ex) => ex.id !== id) });
  };

  return (
    <div className="space-y-5">
      {/* Input Variable */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Input
        </label>
        <VariableSelector
          value={config.inputVariable || "input"}
          onChange={(value) => onUpdate({ inputVariable: value })}
          placeholder="Select input variable..."
        />
        <p className="text-[10px] text-surface-dark-4 mt-1">
          The variable to classify. Typically the user's message.
        </p>
      </div>

      {/* Model */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Classifier Model
        </label>
        <ModelSelector
          value={config.model || "gpt-4o-mini"}
          onChange={(model) => onUpdate({ model })}
        />
        <p className="text-[10px] text-surface-dark-4 mt-1">
          Faster models work well for simple classification.
        </p>
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Instructions (optional)
        </label>
        <textarea
          value={config.instructions || ""}
          onChange={(e) => onUpdate({ instructions: e.target.value })}
          className="nebula-input text-sm resize-none w-full"
          rows={3}
          placeholder="Additional context for classification..."
        />
      </div>

      {/* Tabs: Categories / Examples */}
      <div>
        <div className="flex border-b border-surface-3 mb-3">
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={clsx(
              "px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
              activeTab === "categories"
                ? "border-nebula-600 text-nebula-600"
                : "border-transparent text-surface-dark-4 hover:text-gray-700"
            )}
          >
            Categories ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("examples")}
            className={clsx(
              "px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
              activeTab === "examples"
                ? "border-nebula-600 text-nebula-600"
                : "border-transparent text-surface-dark-4 hover:text-gray-700"
            )}
          >
            Examples ({examples.length})
          </button>
        </div>

        {/* Categories Tab */}
        {activeTab === "categories" && (
          <div className="space-y-3">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className="relative border border-surface-3 rounded-lg p-3 hover:border-surface-dark-4 transition-colors"
              >
                {/* Category number badge */}
                <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center">
                  {index + 1}
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => removeCategory(category.id)}
                  className="absolute top-2 right-2 p-1 rounded hover:bg-red-50 text-surface-dark-4 hover:text-red-500 transition-colors"
                  title="Remove category"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="space-y-2 pr-6">
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                    className="nebula-input text-sm w-full font-medium"
                    placeholder="Category name"
                  />
                  <textarea
                    value={category.description || ""}
                    onChange={(e) => updateCategory(category.id, { description: e.target.value })}
                    className="nebula-input text-xs resize-none w-full"
                    rows={2}
                    placeholder="Description (helps the model understand this category)"
                  />
                </div>
              </div>
            ))}

            {categories.length === 0 && (
              <div className="text-center py-6 text-xs text-surface-dark-4 border border-dashed border-surface-3 rounded-lg">
                No categories defined yet.
              </div>
            )}

            <button
              type="button"
              onClick={addCategory}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-surface-3 rounded-lg text-xs text-nebula-600 hover:border-nebula-500 hover:bg-nebula-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Category
            </button>
          </div>
        )}

        {/* Examples Tab */}
        {activeTab === "examples" && (
          <div className="space-y-3">
            {categories.length === 0 ? (
              <div className="text-center py-6 text-xs text-surface-dark-4 border border-dashed border-surface-3 rounded-lg">
                Add categories first before adding examples.
              </div>
            ) : (
              <>
                {examples.map((example, index) => (
                    <div
                      key={example.id}
                      className="relative border border-surface-3 rounded-lg p-3 hover:border-surface-dark-4 transition-colors"
                    >
                      {/* Example number */}
                      <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                        {index + 1}
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => removeExample(example.id)}
                        className="absolute top-2 right-2 p-1 rounded hover:bg-red-50 text-surface-dark-4 hover:text-red-500 transition-colors"
                        title="Remove example"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      <div className="space-y-2 pr-6">
                        {/* Input */}
                        <div>
                          <label className="block text-[10px] text-surface-dark-4 mb-1">
                            Input
                          </label>
                          <textarea
                            value={example.input}
                            onChange={(e) => updateExample(example.id, { input: e.target.value })}
                            className="nebula-input text-xs resize-none w-full"
                            rows={2}
                            placeholder="Example input text..."
                          />
                        </div>

                        {/* Category dropdown */}
                        <div>
                          <label className="block text-[10px] text-surface-dark-4 mb-1">
                            Category
                          </label>
                          <select
                            value={example.categoryId}
                            onChange={(e) => updateExample(example.id, { categoryId: e.target.value })}
                            className="nebula-input text-xs w-full"
                          >
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name || "(unnamed)"}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                ))}

                {examples.length === 0 && (
                  <div className="text-center py-6 text-xs text-surface-dark-4 border border-dashed border-surface-3 rounded-lg">
                    Add examples to improve classification accuracy.
                  </div>
                )}

                <button
                  type="button"
                  onClick={addExample}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-surface-3 rounded-lg text-xs text-nebula-600 hover:border-nebula-500 hover:bg-nebula-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Example
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Confidence Threshold */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-700">
            Confidence Threshold
          </label>
          <span className="text-xs font-mono text-nebula-600">
            {((config.confidence_threshold ?? 0.7) * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={config.confidence_threshold ?? 0.7}
          onChange={(e) =>
            onUpdate({ confidence_threshold: parseFloat(e.target.value) })
          }
          className="w-full h-2 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-nebula-600"
        />
        <p className="text-[10px] text-surface-dark-4 mt-1">
          Minimum confidence required for a classification match.
        </p>
      </div>
    </div>
  );
}

export default ClassifyPropertiesPanel;
