/**
 * Obsidian Integration Service
 *
 * Handles reading/writing to the Obsidian vault, enforcing templates,
 * and building deep links. File-based integration using the vault directory.
 */

import type { ObsidianNote, ObsidianDeepLink } from "@/types/integration";

export class ObsidianService {
  private vaultPath: string;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  /**
   * Read a note from the vault
   */
  async readNote(notePath: string): Promise<ObsidianNote> {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const fullPath = `${this.vaultPath}/${notePath}`;
    const content = await readTextFile(fullPath);
    const { frontmatter, body } = parseFrontmatter(content);

    return {
      path: notePath,
      name: notePath.split("/").pop()?.replace(".md", "") || "",
      content: body,
      frontmatter,
      lastModified: new Date().toISOString(),
    };
  }

  /**
   * Write a note to the vault, enforcing templates
   */
  async writeNote(
    notePath: string,
    frontmatter: Record<string, unknown>,
    content: string
  ): Promise<void> {
    const { writeTextFile, mkdir } = await import("@tauri-apps/plugin-fs");
    const fullPath = `${this.vaultPath}/${notePath}`;

    // Ensure directory exists
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
    try {
      await mkdir(dir, { recursive: true });
    } catch {
      // Directory may already exist
    }

    // Build frontmatter YAML
    const fmYaml = Object.entries(frontmatter)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join("\n");

    const fullContent = `---\n${fmYaml}\n---\n\n${content}`;
    await writeTextFile(fullPath, fullContent);
  }

  /**
   * Write a Level 0 change note
   */
  async writeLevel0Note(params: {
    serviceName: string;
    moduleName: string;
    changeId: string;
    agentId: string;
    workstreamId: string;
    title: string;
    description: string;
    dependencies: string[];
    testsAdded: { name: string; type: string; status: string }[];
    migrationNotes: string;
  }): Promise<string> {
    const notePath = `level-0/${params.serviceName}/${params.changeId}.md`;

    const frontmatter = {
      type: "level-0",
      service: params.serviceName,
      module: params.moduleName,
      change_id: params.changeId,
      created: new Date().toISOString(),
      author_agent: params.agentId,
      workstream: params.workstreamId,
    };

    const testsTable = params.testsAdded
      .map((t) => `| ${t.name} | ${t.type} | ${t.status} |`)
      .join("\n");

    const content = `# ${params.title}

## What Changed

${params.description}

## Dependencies

${params.dependencies.map((d) => `- ${d}`).join("\n") || "- None"}

## Tests Added/Updated

| Test | Type | Status |
|------|------|--------|
${testsTable || "| - | - | - |"}

## Migration Notes

${params.migrationNotes || "No migrations required."}`;

    await this.writeNote(notePath, frontmatter, content);
    return notePath;
  }

  /**
   * Write a Level 1 service note
   */
  async writeLevel1Note(params: {
    serviceName: string;
    domain: string;
    owner: string;
    architecture: string;
    endpoints: { method: string; path: string; auth: string; description: string }[];
    dataStores: { store: string; type: string; purpose: string }[];
  }): Promise<string> {
    const notePath = `level-1/${params.serviceName}.md`;

    const frontmatter = {
      type: "level-1",
      service: params.serviceName,
      domain: params.domain,
      owner: params.owner,
      created: new Date().toISOString(),
      last_consolidated: new Date().toISOString(),
    };

    const endpointsTable = params.endpoints
      .map((e) => `| ${e.method} | ${e.path} | ${e.auth} | ${e.description} |`)
      .join("\n");

    const storesTable = params.dataStores
      .map((s) => `| ${s.store} | ${s.type} | ${s.purpose} |`)
      .join("\n");

    const content = `# ${params.serviceName} — Service Overview

## Architecture

${params.architecture}

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
${endpointsTable || "| - | - | - | - |"}

## Data Stores

| Store | Type | Purpose |
|-------|------|---------|
${storesTable || "| - | - | - |"}

## Runbook

### Health Checks

- Liveness: \`/health/live\`
- Readiness: \`/health/ready\``;

    await this.writeNote(notePath, frontmatter, content);
    return notePath;
  }

  /**
   * Write/update a Level 2 system note
   */
  async writeLevel2Note(params: {
    systemName: string;
    services: { name: string; domain: string; owner: string; status: string }[];
    risks: { risk: string; severity: string; mitigation: string; status: string }[];
  }): Promise<string> {
    const notePath = `level-2/${params.systemName}.md`;

    const frontmatter = {
      type: "level-2",
      system: params.systemName,
      created: new Date().toISOString(),
      last_consolidated: new Date().toISOString(),
    };

    const serviceTable = params.services
      .map((s) => `| ${s.name} | ${s.domain} | ${s.owner} | ${s.status} |`)
      .join("\n");

    const riskTable = params.risks
      .map((r) => `| ${r.risk} | ${r.severity} | ${r.mitigation} | ${r.status} |`)
      .join("\n");

    const content = `# ${params.systemName} — System Architecture

## Service Catalog

| Service | Domain | Owner | Status |
|---------|--------|-------|--------|
${serviceTable || "| - | - | - | - |"}

## Known Risks and Mitigations

| Risk | Severity | Mitigation | Status |
|------|----------|------------|--------|
${riskTable || "| - | - | - | - |"}`;

    await this.writeNote(notePath, frontmatter, content);
    return notePath;
  }

  /**
   * List all notes in a directory
   */
  async listNotes(directory: string): Promise<string[]> {
    const { readDir } = await import("@tauri-apps/plugin-fs");
    const fullPath = `${this.vaultPath}/${directory}`;
    try {
      const entries = await readDir(fullPath);
      return entries
        .filter((e) => e.name?.endsWith(".md"))
        .map((e) => `${directory}/${e.name}`);
    } catch {
      return [];
    }
  }

  /**
   * Build an Obsidian deep link
   */
  buildDeepLink(notePath: string, vaultName?: string): string {
    const vault = vaultName || this.vaultPath.split("/").pop() || "Nebula";
    const encodedVault = encodeURIComponent(vault);
    const encodedFile = encodeURIComponent(notePath);
    return `obsidian://open?vault=${encodedVault}&file=${encodedFile}`;
  }

  /**
   * Open a note in Obsidian using deep link
   */
  async openInObsidian(notePath: string): Promise<void> {
    const { open } = await import("@tauri-apps/plugin-shell");
    const link = this.buildDeepLink(notePath);
    await open(link);
  }
}

/**
 * Parse YAML frontmatter from Markdown content
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  if (!content.startsWith("---")) {
    return { frontmatter: {}, body: content };
  }

  const endIndex = content.indexOf("---", 3);
  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const fmBlock = content.substring(3, endIndex).trim();
  const body = content.substring(endIndex + 3).trim();

  // Simple YAML parsing (key: value pairs)
  const frontmatter: Record<string, unknown> = {};
  for (const line of fmBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim();
      let value: string | unknown = line.substring(colonIdx + 1).trim();
      // Remove quotes
      if (
        typeof value === "string" &&
        value.startsWith('"') &&
        value.endsWith('"')
      ) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}
