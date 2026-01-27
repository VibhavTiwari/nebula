/**
 * Audit Service — Phase 0/8
 *
 * Client-side audit log management. Records every action and produces
 * complete audit trails for agent runs.
 */

import type {
  AuditEvent,
  RunRecord,
  RunSummary,
} from "@/types/audit";
import { createAuditEvent, createRunRecord } from "@/types/audit";

export class AuditService {
  private events: AuditEvent[] = [];
  private runs: Map<string, RunRecord> = new Map();
  private listeners: Set<(event: AuditEvent) => void> = new Set();

  /**
   * Record an audit event
   */
  record(params: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
    const event = createAuditEvent(params);
    this.events.push(event);

    // Add to run record
    const run = this.runs.get(event.runId);
    if (run) {
      run.events.push(event);
    }

    // Notify listeners
    for (const listener of this.listeners) {
      listener(event);
    }

    return event;
  }

  /**
   * Start a new run
   */
  startRun(projectId: string, workstreamId: string, userRequest: string): RunRecord {
    const run = createRunRecord(projectId, workstreamId, userRequest);
    this.runs.set(run.id, run);

    this.record({
      runId: run.id,
      workstreamId,
      projectId,
      type: "run.started",
      actor: { type: "user", id: "user", name: "User" },
      payload: { kind: "run", status: "started", input: userRequest },
    });

    return run;
  }

  /**
   * Complete a run
   */
  completeRun(runId: string, success: boolean): void {
    const run = this.runs.get(runId);
    if (!run) return;

    run.completedAt = new Date().toISOString();
    run.status = success ? "completed" : "failed";
    run.summary = this.computeSummary(run.events);

    this.record({
      runId,
      workstreamId: run.workstreamId,
      projectId: run.projectId,
      type: success ? "run.completed" : "run.failed",
      actor: { type: "agent", id: "cto-agent", name: "CTO Agent" },
      payload: {
        kind: "run",
        status: success ? "completed" : "failed",
        duration: run.summary.duration,
      },
    });
  }

  /**
   * Get events for a project
   */
  getProjectEvents(projectId: string, limit: number = 100): AuditEvent[] {
    return this.events
      .filter((e) => e.projectId === projectId)
      .slice(-limit);
  }

  /**
   * Get events for a run
   */
  getRunEvents(runId: string): AuditEvent[] {
    return this.events.filter((e) => e.runId === runId);
  }

  /**
   * Get a run record
   */
  getRun(runId: string): RunRecord | undefined {
    return this.runs.get(runId);
  }

  /**
   * Get all runs for a project
   */
  getProjectRuns(projectId: string): RunRecord[] {
    return Array.from(this.runs.values()).filter(
      (r) => r.projectId === projectId
    );
  }

  /**
   * Subscribe to audit events
   */
  subscribe(listener: (event: AuditEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Export audit log as JSON (for compliance)
   */
  exportLog(projectId: string): string {
    const events = this.getProjectEvents(projectId, Infinity);
    return JSON.stringify(events, null, 2);
  }

  private computeSummary(events: AuditEvent[]): RunSummary {
    const summary: RunSummary = {
      totalEvents: events.length,
      agentDecisions: 0,
      toolCalls: 0,
      codeChanges: 0,
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      gatesPassed: 0,
      gatesFailed: 0,
      deploymentsCompleted: 0,
      documentationUpdates: 0,
      linearUpdates: 0,
      duration: 0,
    };

    const startEvent = events.find((e) => e.type === "run.started");
    const endEvent = [...events].reverse().find(
      (e: AuditEvent) => e.type === "run.completed" || e.type === "run.failed"
    );

    if (startEvent && endEvent) {
      summary.duration =
        new Date(endEvent.timestamp).getTime() -
        new Date(startEvent.timestamp).getTime();
    }

    for (const event of events) {
      switch (event.type) {
        case "agent.decision":
          summary.agentDecisions++;
          break;
        case "tool.call":
          summary.toolCalls++;
          break;
        case "code.write":
        case "code.commit":
          summary.codeChanges++;
          break;
        case "test.started":
          summary.testsRun++;
          break;
        case "test.passed":
          summary.testsPassed++;
          break;
        case "test.failed":
          summary.testsFailed++;
          break;
        case "gate.passed":
          summary.gatesPassed++;
          break;
        case "gate.failed":
          summary.gatesFailed++;
          break;
        case "deploy.completed":
          summary.deploymentsCompleted++;
          break;
        case "documentation.write":
          summary.documentationUpdates++;
          break;
        case "linear.issue.created":
        case "linear.issue.updated":
          summary.linearUpdates++;
          break;
      }
    }

    return summary;
  }
}
