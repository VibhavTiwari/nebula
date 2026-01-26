/**
 * Audit-related hooks
 */

import { useCallback, useEffect, useState } from "react";
import { AuditService } from "@/services/audit/audit-service";
import type { AuditEvent, RunRecord } from "@/types/audit";

// Singleton audit service
const auditService = new AuditService();

/**
 * Hook for audit operations
 */
export function useAudit(projectId: string | null) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [runs, setRuns] = useState<RunRecord[]>([]);

  useEffect(() => {
    if (!projectId) {
      setEvents([]);
      setRuns([]);
      return;
    }

    setEvents(auditService.getProjectEvents(projectId));
    setRuns(auditService.getProjectRuns(projectId));

    const unsubscribe = auditService.subscribe((event) => {
      if (event.projectId === projectId) {
        setEvents(auditService.getProjectEvents(projectId));
        setRuns(auditService.getProjectRuns(projectId));
      }
    });

    return unsubscribe;
  }, [projectId]);

  const startRun = useCallback(
    (workstreamId: string, userRequest: string) => {
      if (!projectId) return null;
      return auditService.startRun(projectId, workstreamId, userRequest);
    },
    [projectId]
  );

  const completeRun = useCallback((runId: string, success: boolean) => {
    auditService.completeRun(runId, success);
  }, []);

  const getRun = useCallback((runId: string) => {
    return auditService.getRun(runId);
  }, []);

  return {
    events,
    runs,
    startRun,
    completeRun,
    getRun,
    auditService,
  };
}

export { auditService };
