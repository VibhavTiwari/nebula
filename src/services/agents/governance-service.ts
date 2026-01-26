/**
 * Governance Service — Phase 9
 *
 * New Service Proposal governance workflow.
 * Prevents service sprawl while preserving full autonomy.
 * State machine: proposed → necessity-check → approved/rejected → deployed
 */

import type { ServiceCatalogEntry } from "@/types/project";

export class GovernanceService {
  private proposals: Map<string, ServiceProposal> = new Map();
  private catalog: Map<string, ServiceCatalogEntry> = new Map();

  /**
   * Evaluate whether a new service is necessary
   * (Bias toward extending existing services)
   */
  evaluateServiceProposal(proposal: ServiceProposal): NecessityCheckResult {
    const existingServices = Array.from(this.catalog.values());
    const similarServices: Array<{ name: string; reason: string }> = [];

    for (const service of existingServices) {
      const similarity = computeSimilarity(proposal.domain, service.spec.system || "");
      if (similarity > 0.3) {
        similarServices.push({
          name: service.metadata.name,
          reason: `Same or similar domain: ${service.spec.system}`,
        });
      }
    }

    // Update proposal state
    proposal.state = "necessity-check";
    this.proposals.set(proposal.id, proposal);

    if (similarServices.length > 0) {
      return {
        necessary: false,
        recommendation: "extend-existing",
        similarServices,
        justification: `Found ${similarServices.length} existing service(s) in the same domain. Consider extending one of them instead of creating a new service.`,
      };
    }

    return {
      necessary: true,
      recommendation: "approve",
      similarServices: [],
      justification: "No existing services found in this domain. New service creation is justified.",
    };
  }

  /**
   * Compile proposal artifacts (contracts, docs, deployment stubs)
   */
  compileProposalArtifacts(proposal: ServiceProposal): ProposalArtifacts {
    const openApiSpec = this.generateOpenAPIStub(proposal);
    const asyncApiSpec = this.generateAsyncAPIStub(proposal);
    const cloudEventsSchema = this.generateCloudEventsStub(proposal);
    const catalogEntry = this.generateServiceCatalogEntry(proposal);
    const level1Doc = this.generateLevel1DocStub(proposal);

    return {
      proposalId: proposal.id,
      openApiSpec,
      asyncApiSpec,
      cloudEventsSchema,
      catalogEntry: JSON.stringify(catalogEntry, null, 2),
      level1DocPath: `level-1/${proposal.serviceName}.md`,
      level1DocContent: level1Doc,
      deploymentConfigPath: `k8s/${proposal.serviceName}/`,
    };
  }

  /**
   * Register a service in the Backstage-style catalog
   */
  registerInCatalog(entry: ServiceCatalogEntry): void {
    this.catalog.set(entry.metadata.name, entry);
  }

  /**
   * Generate a Backstage-compatible service catalog entry
   */
  generateServiceCatalogEntry(proposal: ServiceProposal): ServiceCatalogEntry {
    return {
      apiVersion: "backstage.io/v1alpha1",
      kind: "Component",
      metadata: {
        name: proposal.serviceName,
        description: proposal.purpose,
        labels: {
          "nebula/domain": proposal.domain,
          "nebula/stack-pack": proposal.stackPack,
        },
        annotations: {
          "nebula/proposal-id": proposal.id,
          "nebula/created-at": new Date().toISOString(),
        },
        tags: [proposal.domain, proposal.stackPack],
      },
      spec: {
        type: "service",
        lifecycle: "experimental",
        owner: proposal.owner,
        system: proposal.domain,
        dependsOn: proposal.dependencies,
        providesApis: [`${proposal.serviceName}-api`],
        consumesApis: [],
      },
    };
  }

  /**
   * Enforce that new repos can only be created via this workflow
   */
  enforceProposalWorkflow(action: string, serviceName: string): WorkflowEnforcementResult {
    if (action === "create-repository") {
      const proposal = Array.from(this.proposals.values()).find(
        (p) => p.serviceName === serviceName && p.state === "approved"
      );

      if (!proposal) {
        return {
          allowed: false,
          reason: `No approved service proposal found for '${serviceName}'. Create a New Service Proposal first.`,
        };
      }

      return {
        allowed: true,
        reason: `Approved via proposal ${proposal.id}`,
        proposalId: proposal.id,
      };
    }

    return { allowed: true, reason: "Action does not require proposal" };
  }

  /**
   * Approve a proposal
   */
  approveProposal(proposalId: string, reason: string): void {
    const proposal = this.proposals.get(proposalId);
    if (proposal) {
      proposal.state = "approved";
      proposal.approvalReason = reason;
      proposal.approvedAt = new Date().toISOString();
    }
  }

  /**
   * Reject a proposal
   */
  rejectProposal(proposalId: string, reason: string): void {
    const proposal = this.proposals.get(proposalId);
    if (proposal) {
      proposal.state = "rejected";
      proposal.approvalReason = reason;
    }
  }

  /**
   * Get all catalog entries
   */
  getCatalog(): ServiceCatalogEntry[] {
    return Array.from(this.catalog.values());
  }

  // ── Private generation methods ──

  private generateOpenAPIStub(proposal: ServiceProposal): string {
    return `openapi: "3.1.0"
info:
  title: ${proposal.serviceName} API
  version: "0.1.0"
  description: ${proposal.purpose}
servers:
  - url: https://${proposal.serviceName}.internal
    description: Internal
paths:
  /health:
    get:
      operationId: healthCheck
      summary: Health check endpoint
      responses:
        "200":
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: healthy
  /api/v1:
    get:
      operationId: getRoot
      summary: API root
      responses:
        "200":
          description: OK`;
  }

  private generateAsyncAPIStub(proposal: ServiceProposal): string {
    return `asyncapi: "3.0.0"
info:
  title: ${proposal.serviceName} Events
  version: "0.1.0"
  description: Async events for ${proposal.serviceName}
channels:
  ${proposal.serviceName}.events:
    messages:
      serviceEvent:
        payload:
          type: object
          properties:
            id:
              type: string
            type:
              type: string
            timestamp:
              type: string
              format: date-time
            data:
              type: object`;
  }

  private generateCloudEventsStub(proposal: ServiceProposal): string {
    return `{
  "specversion": "1.0",
  "type": "com.nebula.${proposal.serviceName}.event",
  "source": "/${proposal.domain}/${proposal.serviceName}",
  "id": "unique-event-id",
  "time": "2024-01-01T00:00:00Z",
  "datacontenttype": "application/json",
  "data": {}
}`;
  }

  private generateLevel1DocStub(proposal: ServiceProposal): string {
    return `---
type: level-1
service: "${proposal.serviceName}"
domain: "${proposal.domain}"
owner: "${proposal.owner}"
created: "${new Date().toISOString()}"
---

# ${proposal.serviceName} — Service Overview

## Architecture

${proposal.purpose}

## Endpoints

See OpenAPI specification.

## Data Stores

To be determined during implementation.

## Runbook

### Health Checks

- Liveness: \`/health\`
- Readiness: \`/health\`
`;
  }
}

// ── Types ──

export interface ServiceProposal {
  id: string;
  serviceName: string;
  purpose: string;
  domain: string;
  owner: string;
  stackPack: string;
  dependencies: string[];
  state: ProposalState;
  justification: string;
  createdAt: string;
  approvedAt?: string;
  approvalReason?: string;
}

export type ProposalState = "proposed" | "necessity-check" | "approved" | "rejected" | "deployed";

export interface NecessityCheckResult {
  necessary: boolean;
  recommendation: "approve" | "extend-existing" | "reject";
  similarServices: Array<{ name: string; reason: string }>;
  justification: string;
}

export interface ProposalArtifacts {
  proposalId: string;
  openApiSpec: string;
  asyncApiSpec: string;
  cloudEventsSchema: string;
  catalogEntry: string;
  level1DocPath: string;
  level1DocContent: string;
  deploymentConfigPath: string;
}

export interface WorkflowEnforcementResult {
  allowed: boolean;
  reason: string;
  proposalId?: string;
}

/**
 * Simple string similarity for domain matching
 */
function computeSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  if (aLower === bLower) return 1;
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.7;

  const aWords = new Set(aLower.split(/[\s\-_]+/));
  const bWords = new Set(bLower.split(/[\s\-_]+/));
  let common = 0;
  for (const word of aWords) {
    if (bWords.has(word)) common++;
  }
  return common / Math.max(aWords.size, bWords.size);
}
