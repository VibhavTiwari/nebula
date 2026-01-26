/**
 * Project and workspace types
 */

import type { DataClassification } from "./policy";

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;

  /** Path to project's Obsidian vault directory */
  vaultPath: string;

  /** Associated repositories */
  repositories: ProjectRepository[];

  /** Active workstreams */
  workstreams: string[];

  /** Data classification level */
  dataClassification: DataClassification;

  /** Policy file path (relative to project root) */
  policyPath: string;

  /** Stack pack used */
  stackPack?: string;

  /** Cloud configuration */
  cloud: CloudConfig;

  /** Integration configuration */
  integrations: ProjectIntegrations;
}

export type ProjectStatus = "active" | "archived" | "paused";

export interface ProjectRepository {
  id: string;
  name: string;
  url: string;
  localPath: string;
  defaultBranch: string;
  stackPack: string;
  catalogRef?: string;
}

export interface CloudConfig {
  primary: CloudProvider;
  standby?: CloudProvider;
  failoverEnabled: boolean;
}

export interface CloudProvider {
  provider: "azure" | "aws";
  region: string;
  subscriptionId?: string;
  resourceGroup?: string;
  kubernetes?: KubernetesConfig;
  serverless?: ServerlessConfig;
}

export interface KubernetesConfig {
  clusterName: string;
  namespace: string;
  registryUrl: string;
}

export interface ServerlessConfig {
  functionAppName?: string;
  lambdaPrefix?: string;
}

export interface ProjectIntegrations {
  obsidian: ObsidianConfig;
  linear?: LinearConfig;
  figma?: FigmaConfig;
  modelProviders: ModelProviderConfig[];
}

export interface ObsidianConfig {
  vaultPath: string;
  deepLinkProtocol: string;
}

export interface LinearConfig {
  teamId: string;
  projectId?: string;
  apiKeyRef: string;
}

export interface FigmaConfig {
  projectId: string;
  apiKeyRef: string;
}

export interface ModelProviderConfig {
  id: string;
  name: string;
  provider: "azure-openai" | "openai" | "amazon-bedrock" | "anthropic" | "local" | "custom";
  endpoint?: string;
  apiKeyRef: string;
  models: ModelConfig[];
  dataPolicy: {
    allowedClassifications: DataClassification[];
    retentionDays: number;
  };
}

export interface ModelConfig {
  id: string;
  name: string;
  modelId: string;
  capabilities: ModelCapability[];
  maxTokens: number;
  temperature: number;
}

export type ModelCapability = "chat" | "code" | "vision" | "embedding" | "function-calling";

/**
 * Service catalog entry (Backstage-compatible)
 */
export interface ServiceCatalogEntry {
  apiVersion: "backstage.io/v1alpha1";
  kind: "Component";
  metadata: {
    name: string;
    description: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
    tags: string[];
  };
  spec: {
    type: "service" | "website" | "library";
    lifecycle: "experimental" | "production" | "deprecated";
    owner: string;
    system?: string;
    dependsOn?: string[];
    providesApis?: string[];
    consumesApis?: string[];
  };
}
