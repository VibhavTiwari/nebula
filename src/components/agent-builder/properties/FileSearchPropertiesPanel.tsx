/**
 * FileSearchPropertiesPanel - Configuration panel for File Search nodes
 *
 * Features:
 * - Vector store selector (mock list)
 * - Max results input
 * - Search query configuration
 * - Result filtering options
 */

import { useState } from "react";
import clsx from "clsx";
import { VariableSelector } from "./shared/VariableSelector";

// ── Types ──

interface VectorStore {
  id: string;
  name: string;
  fileCount: number;
  lastUpdated: string;
}

interface FileSearchConfig {
  vectorStoreIds?: string[];
  maxResults?: number;
  queryVariable?: string;
  scoreThreshold?: number;
  includeMetadata?: boolean;
  fileFilters?: string[];
}

interface FileSearchPropertiesPanelProps {
  nodeId: string;
  config: FileSearchConfig;
  onUpdate: (config: Partial<FileSearchConfig>) => void;
}

// ── Mock vector stores ──

const MOCK_VECTOR_STORES: VectorStore[] = [
  { id: "vs_abc123", name: "Product Documentation", fileCount: 45, lastUpdated: "2025-01-30" },
  { id: "vs_def456", name: "Knowledge Base", fileCount: 128, lastUpdated: "2025-01-28" },
  { id: "vs_ghi789", name: "Technical Specs", fileCount: 32, lastUpdated: "2025-01-25" },
  { id: "vs_jkl012", name: "Support Articles", fileCount: 89, lastUpdated: "2025-01-29" },
  { id: "vs_mno345", name: "Training Materials", fileCount: 56, lastUpdated: "2025-01-27" },
];

// ── Component ──

export function FileSearchPropertiesPanel({
  nodeId: _nodeId,
  config,
  onUpdate,
}: FileSearchPropertiesPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newStoreId, setNewStoreId] = useState("");

  const selectedStores = config.vectorStoreIds || [];
  const fileFilters = config.fileFilters || [];

  // ── Handlers ──

  const toggleStore = (storeId: string) => {
    const next = selectedStores.includes(storeId)
      ? selectedStores.filter((id) => id !== storeId)
      : [...selectedStores, storeId];
    onUpdate({ vectorStoreIds: next });
  };

  const addCustomStore = () => {
    const trimmed = newStoreId.trim();
    if (trimmed && !selectedStores.includes(trimmed)) {
      onUpdate({ vectorStoreIds: [...selectedStores, trimmed] });
      setNewStoreId("");
    }
  };

  const removeStore = (storeId: string) => {
    onUpdate({ vectorStoreIds: selectedStores.filter((id) => id !== storeId) });
  };

  const addFileFilter = () => {
    onUpdate({ fileFilters: [...fileFilters, ""] });
  };

  const updateFileFilter = (index: number, value: string) => {
    const next = [...fileFilters];
    next[index] = value;
    onUpdate({ fileFilters: next });
  };

  const removeFileFilter = (index: number) => {
    onUpdate({ fileFilters: fileFilters.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-5">
      {/* Query Variable */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Search Query
        </label>
        <VariableSelector
          value={config.queryVariable || "input"}
          onChange={(value) => onUpdate({ queryVariable: value })}
          placeholder="Select query variable..."
        />
        <p className="text-[10px] text-surface-dark-4 mt-1">
          The variable containing the search query text.
        </p>
      </div>

      {/* Vector Stores */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Vector Stores
        </label>

        {/* Selected stores */}
        {selectedStores.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {selectedStores.map((storeId) => {
              const store = MOCK_VECTOR_STORES.find((s) => s.id === storeId);
              return (
                <div
                  key={storeId}
                  className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg"
                >
                  <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-green-800 truncate">
                      {store?.name || storeId}
                    </div>
                    {store && (
                      <div className="text-[10px] text-green-600">
                        {store.fileCount} files
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStore(storeId)}
                    className="p-1 rounded hover:bg-green-100 text-green-600"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Available stores */}
        <div className="border border-surface-3 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-surface-1 border-b border-surface-3">
            <span className="text-[10px] font-medium text-surface-dark-4 uppercase tracking-wider">
              Available Stores
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {MOCK_VECTOR_STORES.filter((s) => !selectedStores.includes(s.id)).map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => toggleStore(store.id)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-1 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {store.name}
                  </div>
                  <div className="text-[10px] text-surface-dark-4">
                    {store.fileCount} files - Updated {store.lastUpdated}
                  </div>
                </div>
                <svg className="w-4 h-4 text-surface-dark-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Custom store ID input */}
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={newStoreId}
            onChange={(e) => setNewStoreId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomStore();
              }
            }}
            className="nebula-input text-sm flex-1 font-mono"
            placeholder="Or enter store ID manually..."
          />
          <button
            type="button"
            onClick={addCustomStore}
            disabled={!newStoreId.trim()}
            className="nebula-btn-secondary text-xs shrink-0 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Max Results */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-700">
            Max Results
          </label>
          <span className="text-xs font-mono text-nebula-600">
            {config.maxResults ?? 10}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          value={config.maxResults ?? 10}
          onChange={(e) => onUpdate({ maxResults: parseInt(e.target.value, 10) })}
          className="w-full h-2 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-nebula-600"
        />
        <div className="flex justify-between text-[10px] text-surface-dark-4 mt-1">
          <span>1</span>
          <span>25</span>
          <span>50</span>
        </div>
      </div>

      {/* Advanced Settings */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-xs text-surface-dark-4 hover:text-gray-700 transition-colors"
      >
        <svg
          className={clsx("w-3 h-3 transition-transform", showAdvanced && "rotate-90")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Advanced Settings
      </button>

      {showAdvanced && (
        <div className="space-y-4 pl-4 border-l-2 border-surface-2">
          {/* Score Threshold */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-700">
                Score Threshold
              </label>
              <span className="text-xs font-mono text-nebula-600">
                {((config.scoreThreshold ?? 0.7) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.scoreThreshold ?? 0.7}
              onChange={(e) => onUpdate({ scoreThreshold: parseFloat(e.target.value) })}
              className="w-full h-2 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-nebula-600"
            />
            <p className="text-[10px] text-surface-dark-4 mt-1">
              Minimum similarity score to include in results.
            </p>
          </div>

          {/* Include Metadata */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeMetadata ?? true}
              onChange={(e) => onUpdate({ includeMetadata: e.target.checked })}
              className="rounded border-surface-3 text-nebula-600 focus:ring-nebula-500"
            />
            <span className="text-xs text-gray-700">Include file metadata</span>
          </label>

          {/* File Filters */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-700">
                File Filters
              </label>
              <button
                type="button"
                onClick={addFileFilter}
                className="text-[10px] text-nebula-600 hover:text-nebula-700"
              >
                + Add filter
              </button>
            </div>
            <div className="space-y-1.5">
              {fileFilters.map((filter, index) => (
                <div key={index} className="flex gap-1.5">
                  <input
                    type="text"
                    value={filter}
                    onChange={(e) => updateFileFilter(index, e.target.value)}
                    className="nebula-input text-sm flex-1 font-mono"
                    placeholder="e.g. *.pdf, docs/*"
                  />
                  <button
                    type="button"
                    onClick={() => removeFileFilter(index)}
                    className="p-2 rounded hover:bg-red-50 text-surface-dark-4 hover:text-red-500"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {fileFilters.length === 0 && (
                <p className="text-[10px] text-surface-dark-4">
                  No filters. All files will be searched.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Output variables */}
      <div className="p-3 bg-surface-1 rounded-lg">
        <div className="text-[10px] font-medium text-surface-dark-4 mb-2">
          Output variables:
        </div>
        <div className="flex flex-wrap gap-1.5">
          <code className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-gray-700 border border-surface-3">
            search_results
          </code>
          <code className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-gray-700 border border-surface-3">
            result_count
          </code>
          <code className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-gray-700 border border-surface-3">
            top_result
          </code>
        </div>
      </div>
    </div>
  );
}

export default FileSearchPropertiesPanel;
