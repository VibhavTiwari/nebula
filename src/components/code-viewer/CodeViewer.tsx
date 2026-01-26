/**
 * Code Viewer — Phase 4
 *
 * Embedded code viewer/editor using Monaco Editor.
 * Supports file tree navigation, diffs, search, blame, and structural outline.
 */

import { useState, useCallback, useEffect } from "react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import clsx from "clsx";

interface Props {
  files: FileEntry[];
  onFileSelect?: (path: string) => void;
  onSave?: (path: string, content: string) => void;
  readOnly?: boolean;
}

export interface FileEntry {
  path: string;
  name: string;
  type: "file" | "directory";
  children?: FileEntry[];
  content?: string;
  language?: string;
}

type ViewMode = "edit" | "diff" | "blame";

export function CodeViewer({ files, onFileSelect, onSave, readOnly = true }: Props) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showOutline, setShowOutline] = useState(false);
  const [outline, setOutline] = useState<OutlineEntry[]>([]);
  const [diffOriginal, setDiffOriginal] = useState<string>("");

  const handleFileClick = useCallback(
    (path: string) => {
      setSelectedFile(path);
      const file = findFile(files, path);
      if (file?.content !== undefined) {
        setFileContent(file.content);
      }
      onFileSelect?.(path);
    },
    [files, onFileSelect]
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      const results: SearchResult[] = [];
      searchInFiles(files, query, results);
      setSearchResults(results);
    },
    [files]
  );

  const selectedFileEntry = selectedFile ? findFile(files, selectedFile) : null;
  const language = selectedFileEntry?.language || detectLanguage(selectedFile || "");

  return (
    <div className="flex h-full border border-surface-3 rounded-lg overflow-hidden">
      {/* File tree sidebar */}
      <div className="w-56 border-r border-surface-3 bg-surface-1 flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-surface-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full text-xs px-2 py-1 rounded border border-surface-3 bg-white focus:outline-none focus:border-nebula-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {searchQuery ? (
            <div className="py-1">
              {searchResults.map((result, i) => (
                <button
                  key={i}
                  onClick={() => handleFileClick(result.path)}
                  className="w-full text-left px-3 py-1 text-xs hover:bg-surface-2"
                >
                  <div className="truncate font-medium">{result.path}</div>
                  <div className="truncate text-surface-dark-4">{result.line}</div>
                </button>
              ))}
            </div>
          ) : (
            <FileTree
              entries={files}
              selectedPath={selectedFile}
              onSelect={handleFileClick}
              depth={0}
            />
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        {selectedFile && (
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-surface-3 bg-surface-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-mono truncate text-surface-dark-4">
                {selectedFile}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <ViewModeButton
                mode="edit"
                active={viewMode === "edit"}
                onClick={() => setViewMode("edit")}
                label="Code"
              />
              <ViewModeButton
                mode="diff"
                active={viewMode === "diff"}
                onClick={() => setViewMode("diff")}
                label="Diff"
              />
              <ViewModeButton
                mode="blame"
                active={viewMode === "blame"}
                onClick={() => setViewMode("blame")}
                label="Blame"
              />
              <button
                onClick={() => setShowOutline(!showOutline)}
                className={clsx(
                  "text-xs px-2 py-0.5 rounded",
                  showOutline
                    ? "bg-nebula-100 text-nebula-700"
                    : "text-surface-dark-4 hover:bg-surface-2"
                )}
              >
                Outline
              </button>
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1">
            {selectedFile ? (
              viewMode === "diff" ? (
                <DiffEditor
                  original={diffOriginal || fileContent}
                  modified={fileContent}
                  language={language}
                  theme="vs"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "JetBrains Mono, Fira Code, monospace",
                    scrollBeyondLastLine: false,
                  }}
                />
              ) : (
                <Editor
                  value={fileContent}
                  language={language}
                  theme="vs"
                  onChange={(value) => setFileContent(value || "")}
                  options={{
                    readOnly: readOnly || viewMode === "blame",
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "JetBrains Mono, Fira Code, monospace",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    lineNumbers: "on",
                    glyphMargin: viewMode === "blame",
                  }}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-surface-dark-4 text-sm">
                Select a file to view
              </div>
            )}
          </div>

          {/* Outline panel */}
          {showOutline && selectedFile && (
            <div className="w-48 border-l border-surface-3 bg-surface-1 overflow-y-auto">
              <div className="px-3 py-2 text-xs font-medium text-surface-dark-4 border-b border-surface-3">
                Outline
              </div>
              <div className="py-1">
                {outline.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-surface-dark-4">
                    No symbols found
                  </div>
                ) : (
                  outline.map((entry, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-3 py-1 text-xs hover:bg-surface-2"
                      style={{ paddingLeft: `${entry.depth * 12 + 12}px` }}
                    >
                      <span className={clsx("mr-1", SYMBOL_COLORS[entry.kind] || "text-gray-500")}>
                        {SYMBOL_ICONS[entry.kind] || "?"}
                      </span>
                      {entry.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function FileTree({
  entries,
  selectedPath,
  onSelect,
  depth,
}: {
  entries: FileEntry[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth: number;
}) {
  return (
    <div>
      {entries.map((entry) => (
        <div key={entry.path}>
          <button
            onClick={() => {
              if (entry.type === "file") onSelect(entry.path);
            }}
            className={clsx(
              "w-full text-left flex items-center gap-1 px-2 py-0.5 text-xs hover:bg-surface-2 transition-colors",
              selectedPath === entry.path && "bg-nebula-50 text-nebula-700 font-medium"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <span className="text-surface-dark-4">
              {entry.type === "directory" ? "D" : "F"}
            </span>
            <span className="truncate">{entry.name}</span>
          </button>
          {entry.type === "directory" && entry.children && (
            <FileTree
              entries={entry.children}
              selectedPath={selectedPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ViewModeButton({
  mode,
  active,
  onClick,
  label,
}: {
  mode: ViewMode;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "text-xs px-2 py-0.5 rounded",
        active
          ? "bg-nebula-100 text-nebula-700"
          : "text-surface-dark-4 hover:bg-surface-2"
      )}
    >
      {label}
    </button>
  );
}

// ── Utility functions ──

interface SearchResult {
  path: string;
  line: string;
  lineNumber: number;
}

interface OutlineEntry {
  name: string;
  kind: string;
  depth: number;
  line: number;
}

function findFile(entries: FileEntry[], path: string): FileEntry | undefined {
  for (const entry of entries) {
    if (entry.path === path) return entry;
    if (entry.children) {
      const found = findFile(entry.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

function searchInFiles(entries: FileEntry[], query: string, results: SearchResult[]): void {
  const lowerQuery = query.toLowerCase();
  for (const entry of entries) {
    if (entry.type === "file") {
      if (entry.name.toLowerCase().includes(lowerQuery)) {
        results.push({ path: entry.path, line: entry.name, lineNumber: 0 });
      }
      if (entry.content) {
        const lines = entry.content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(lowerQuery)) {
            results.push({ path: entry.path, line: lines[i].trim(), lineNumber: i + 1 });
            if (results.length > 50) return;
          }
        }
      }
    }
    if (entry.children) {
      searchInFiles(entry.children, query, results);
    }
  }
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    erl: "erlang",
    ex: "elixir",
    exs: "elixir",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    html: "html",
    css: "css",
    toml: "toml",
    sql: "sql",
    sh: "shell",
    dockerfile: "dockerfile",
  };
  return languageMap[ext || ""] || "plaintext";
}

const SYMBOL_ICONS: Record<string, string> = {
  function: "f",
  class: "C",
  interface: "I",
  variable: "v",
  constant: "K",
  enum: "E",
  method: "m",
  property: "p",
  module: "M",
};

const SYMBOL_COLORS: Record<string, string> = {
  function: "text-blue-500",
  class: "text-amber-500",
  interface: "text-green-500",
  variable: "text-purple-500",
  constant: "text-red-500",
  enum: "text-teal-500",
  method: "text-blue-400",
  property: "text-gray-500",
  module: "text-indigo-500",
};
