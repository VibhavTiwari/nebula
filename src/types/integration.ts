/**
 * Integration types for external services
 */

/**
 * MCP (Model Context Protocol) types
 */
export interface MCPServer {
  id: string;
  name: string;
  description: string;
  type: "nebula-provided" | "user-provided";
  transport: MCPTransport;
  tools: MCPTool[];
  status: "connected" | "disconnected" | "error";
}

export interface MCPTransport {
  type: "stdio" | "sse" | "http";
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

/**
 * Nebula-provided MCP servers
 */
export const NEBULA_MCP_SERVERS = [
  "nebula.repository",
  "nebula.documentation",
  "nebula.linear",
  "nebula.deployment",
  "nebula.observability",
] as const;

export type NebulaMCPServer = (typeof NEBULA_MCP_SERVERS)[number];

/**
 * Linear integration types
 */
export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  assignee?: string;
  labels: string[];
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinearEpic {
  id: string;
  name: string;
  description: string;
  status: string;
  issues: string[];
  url: string;
}

/**
 * Figma integration types
 */
export interface FigmaFile {
  id: string;
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
}

export interface FigmaComponent {
  id: string;
  name: string;
  description: string;
  type: string;
  absoluteBoundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Obsidian integration types
 */
export interface ObsidianNote {
  path: string;
  name: string;
  content: string;
  frontmatter: Record<string, unknown>;
  lastModified: string;
}

export interface ObsidianDeepLink {
  vault: string;
  file: string;
  protocol: string;
}

/**
 * Build an Obsidian deep link URL
 */
export function buildObsidianDeepLink(link: ObsidianDeepLink): string {
  const encodedFile = encodeURIComponent(link.file);
  const encodedVault = encodeURIComponent(link.vault);
  return `obsidian://open?vault=${encodedVault}&file=${encodedFile}`;
}

/**
 * OpenTelemetry configuration types
 */
export interface TelemetryConfig {
  enabled: boolean;
  endpoint: string;
  serviceName: string;
  serviceVersion: string;
  exporters: TelemetryExporter[];
  processors: TelemetryProcessor[];
}

export interface TelemetryExporter {
  type: "otlp" | "console" | "jaeger" | "zipkin";
  endpoint?: string;
  headers?: Record<string, string>;
}

export interface TelemetryProcessor {
  type: "batch" | "simple" | "filter" | "redaction";
  config: Record<string, unknown>;
}
