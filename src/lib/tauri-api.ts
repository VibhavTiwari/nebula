/**
 * Tauri IPC bridge — typed wrappers around invoke() calls.
 * This module is the single point of contact between frontend and Rust backend.
 */

import { invoke } from "@tauri-apps/api/core";

// ── Projects ──

export interface ProjectData {
  id: string;
  name: string;
  description: string;
  created_at: string;
  status: string;
  vault_path: string;
  workstreams: string[];
}

export async function getProjects(): Promise<ProjectData[]> {
  return invoke<ProjectData[]>("get_projects");
}

export async function createProject(
  name: string,
  description: string,
  vaultPath: string
): Promise<ProjectData> {
  return invoke<ProjectData>("create_project", {
    name,
    description,
    vaultPath,
  });
}

export async function getProject(projectId: string): Promise<ProjectData | null> {
  return invoke<ProjectData | null>("get_project", { projectId });
}

// ── Workstreams ──

export interface WorkstreamData {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  user_request: string;
  current_phase: string;
  messages: MessageData[];
}

export interface MessageData {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  agent_id: string | null;
  agent_name: string | null;
}

export async function getWorkstreams(projectId: string): Promise<WorkstreamData[]> {
  return invoke<WorkstreamData[]>("get_workstreams", { projectId });
}

export async function createWorkstream(
  projectId: string,
  title: string,
  userRequest: string
): Promise<WorkstreamData> {
  return invoke<WorkstreamData>("create_workstream", {
    projectId,
    title,
    userRequest,
  });
}

export async function sendMessage(
  workstreamId: string,
  content: string
): Promise<MessageData> {
  return invoke<MessageData>("send_message", { workstreamId, content });
}

// ── Audit ──

export interface AuditEvent {
  id: string;
  timestamp: string;
  run_id: string;
  workstream_id: string;
  project_id: string;
  event_type: string;
  actor: {
    actor_type: string;
    id: string;
    role: string | null;
    name: string;
  };
  payload: Record<string, unknown>;
  parent_event_id: string | null;
  span_id: string | null;
  trace_id: string | null;
}

export interface RunRecord {
  id: string;
  project_id: string;
  workstream_id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  user_request: string;
  events: AuditEvent[];
  summary: RunSummary | null;
}

export interface RunSummary {
  total_events: number;
  agent_decisions: number;
  tool_calls: number;
  code_changes: number;
  tests_run: number;
  tests_passed: number;
  tests_failed: number;
  gates_passed: number;
  gates_failed: number;
  deployments_completed: number;
  documentation_updates: number;
  linear_updates: number;
  duration: number;
}

export async function getAuditLog(
  projectId: string,
  limit?: number
): Promise<AuditEvent[]> {
  return invoke<AuditEvent[]>("get_audit_log", { projectId, limit });
}

export async function getRunRecord(runId: string): Promise<RunRecord | null> {
  return invoke<RunRecord | null>("get_run_record", { runId });
}

// ── Policy ──

export async function getPolicy(projectId: string): Promise<unknown> {
  return invoke("get_policy", { projectId });
}

export async function updatePolicy(projectId: string, policy: unknown): Promise<void> {
  return invoke("update_policy", { projectId, policy });
}

// ── Vault ──

export interface VaultNote {
  path: string;
  name: string;
  content: string;
  frontmatter: Record<string, unknown>;
  last_modified: string;
}

export interface VaultNoteEntry {
  path: string;
  name: string;
  last_modified: string;
}

export async function readVaultNote(
  projectId: string,
  notePath: string
): Promise<VaultNote> {
  return invoke<VaultNote>("read_vault_note", { projectId, notePath });
}

export async function writeVaultNote(
  projectId: string,
  notePath: string,
  frontmatter: Record<string, unknown>,
  content: string
): Promise<void> {
  return invoke("write_vault_note", {
    projectId,
    notePath,
    frontmatter,
    content,
  });
}

export async function listVaultNotes(
  projectId: string,
  directory: string
): Promise<VaultNoteEntry[]> {
  return invoke<VaultNoteEntry[]>("list_vault_notes", { projectId, directory });
}
