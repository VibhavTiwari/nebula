/**
 * Security Service — Phase 11
 *
 * Security and privacy hardening for autonomous agent operations.
 * Implements prompt injection controls, secret scanning, tool safety,
 * and data classification enforcement.
 */

export class SecurityService {
  private redactionPatterns: RedactionRule[] = DEFAULT_REDACTION_PATTERNS;

  /**
   * Scan content for secrets
   */
  scanForSecrets(content: string): SecretScanResult {
    const findings: SecretFinding[] = [];

    for (const pattern of SECRET_PATTERNS) {
      const regex = new RegExp(pattern.regex, "gi");
      let match;
      while ((match = regex.exec(content)) !== null) {
        findings.push({
          type: pattern.name,
          severity: pattern.severity,
          line: content.substring(0, match.index).split("\n").length,
          match: match[0].substring(0, 20) + "...",
          suggestion: pattern.suggestion,
        });
      }
    }

    return {
      clean: findings.length === 0,
      findings,
      scannedAt: new Date().toISOString(),
    };
  }

  /**
   * Redact secrets from text (for logs, traces, telemetry)
   */
  redact(content: string): string {
    let redacted = content;
    for (const rule of this.redactionPatterns) {
      const regex = new RegExp(rule.pattern, "gi");
      redacted = redacted.replace(regex, rule.replacement);
    }
    return redacted;
  }

  /**
   * Validate tool call parameters for injection attempts
   */
  validateToolCall(
    _toolId: string,
    parameters: Record<string, unknown>
  ): ToolValidationResult {
    const issues: string[] = [];

    // Check for command injection in string parameters
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === "string") {
        if (containsInjectionPattern(value)) {
          issues.push(
            `Parameter '${key}' contains potential injection pattern`
          );
        }
        if (containsPathTraversal(value)) {
          issues.push(
            `Parameter '${key}' contains path traversal attempt`
          );
        }
      }
    }

    return {
      safe: issues.length === 0,
      issues,
    };
  }

  /**
   * Validate agent output for prompt injection leakage
   */
  validateAgentOutput(output: string): OutputValidationResult {
    const issues: string[] = [];

    // Check for leaked system prompt fragments
    if (output.includes("You are") && output.includes("agent hierarchy")) {
      issues.push("Output may contain leaked system prompt");
    }

    // Check for secrets in output
    const secretScan = this.scanForSecrets(output);
    if (!secretScan.clean) {
      issues.push(
        `Output contains ${secretScan.findings.length} potential secret(s)`
      );
    }

    return {
      safe: issues.length === 0,
      issues,
      redactedOutput: this.redact(output),
    };
  }

  /**
   * Check data classification compliance for model routing
   */
  checkDataClassification(
    data: string,
    classification: DataClassification,
    targetProvider: string,
    allowedClassifications: DataClassification[]
  ): ClassificationCheckResult {
    if (!allowedClassifications.includes(classification)) {
      return {
        allowed: false,
        reason: `Provider '${targetProvider}' is not allowed for '${classification}' data`,
        recommendation: `Route to a provider that accepts '${classification}' data`,
      };
    }

    // Check if data appears more sensitive than classified
    const detectedClassification = detectDataSensitivity(data);
    if (
      CLASSIFICATION_LEVELS[detectedClassification] >
      CLASSIFICATION_LEVELS[classification]
    ) {
      return {
        allowed: false,
        reason: `Data appears to be '${detectedClassification}' but is classified as '${classification}'`,
        recommendation: `Reclassify data to '${detectedClassification}' or redact sensitive content`,
      };
    }

    return {
      allowed: true,
      reason: "Data classification check passed",
    };
  }

  /**
   * Generate security report for a run
   */
  generateSecurityReport(params: {
    secretScanResults: SecretScanResult[];
    toolValidations: ToolValidationResult[];
    outputValidations: OutputValidationResult[];
    classificationChecks: ClassificationCheckResult[];
  }): SecurityReport {
    const totalIssues =
      params.secretScanResults.reduce((sum, r) => sum + r.findings.length, 0) +
      params.toolValidations.reduce((sum, r) => sum + r.issues.length, 0) +
      params.outputValidations.reduce((sum, r) => sum + r.issues.length, 0) +
      params.classificationChecks.filter((c) => !c.allowed).length;

    return {
      timestamp: new Date().toISOString(),
      overallStatus: totalIssues === 0 ? "clean" : "issues-found",
      totalIssues,
      secretsFound: params.secretScanResults.reduce(
        (sum, r) => sum + r.findings.length,
        0
      ),
      injectionAttempts: params.toolValidations.reduce(
        (sum, r) => sum + r.issues.length,
        0
      ),
      outputLeaks: params.outputValidations.reduce(
        (sum, r) => sum + r.issues.length,
        0
      ),
      classificationViolations: params.classificationChecks.filter(
        (c) => !c.allowed
      ).length,
      details: {
        secrets: params.secretScanResults,
        tools: params.toolValidations,
        outputs: params.outputValidations,
        classifications: params.classificationChecks,
      },
    };
  }

  /**
   * Add custom redaction patterns
   */
  addRedactionPattern(rule: RedactionRule): void {
    this.redactionPatterns.push(rule);
  }
}

// ── Types ──

export type DataClassification = "public" | "internal" | "confidential" | "regulated";

const CLASSIFICATION_LEVELS: Record<DataClassification, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  regulated: 3,
};

export interface SecretScanResult {
  clean: boolean;
  findings: SecretFinding[];
  scannedAt: string;
}

export interface SecretFinding {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  line: number;
  match: string;
  suggestion: string;
}

export interface ToolValidationResult {
  safe: boolean;
  issues: string[];
}

export interface OutputValidationResult {
  safe: boolean;
  issues: string[];
  redactedOutput: string;
}

export interface ClassificationCheckResult {
  allowed: boolean;
  reason: string;
  recommendation?: string;
}

export interface RedactionRule {
  name: string;
  pattern: string;
  replacement: string;
}

export interface SecurityReport {
  timestamp: string;
  overallStatus: "clean" | "issues-found";
  totalIssues: number;
  secretsFound: number;
  injectionAttempts: number;
  outputLeaks: number;
  classificationViolations: number;
  details: {
    secrets: SecretScanResult[];
    tools: ToolValidationResult[];
    outputs: OutputValidationResult[];
    classifications: ClassificationCheckResult[];
  };
}

// ── Patterns ──

const SECRET_PATTERNS = [
  {
    name: "AWS Access Key",
    regex: "AKIA[0-9A-Z]{16}",
    severity: "critical" as const,
    suggestion: "Use AWS Secrets Manager or environment variables",
  },
  {
    name: "AWS Secret Key",
    regex: "[0-9a-zA-Z/+]{40}",
    severity: "critical" as const,
    suggestion: "Use AWS Secrets Manager",
  },
  {
    name: "Azure Connection String",
    regex: "DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[^;]+",
    severity: "critical" as const,
    suggestion: "Use Azure Key Vault",
  },
  {
    name: "Generic API Key",
    regex: '(?:api[_-]?key|apikey)\\s*[=:]\\s*["\']?[a-zA-Z0-9_\\-]{20,}',
    severity: "high" as const,
    suggestion: "Store in secrets manager",
  },
  {
    name: "Password in config",
    regex: '(?:password|passwd|pwd)\\s*[=:]\\s*["\']?[^\\s"\']{8,}',
    severity: "high" as const,
    suggestion: "Use secrets manager, never hardcode passwords",
  },
  {
    name: "Private Key",
    regex: "-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----",
    severity: "critical" as const,
    suggestion: "Use key vault, never commit private keys",
  },
  {
    name: "JWT Token",
    regex: "eyJ[a-zA-Z0-9_-]+\\.eyJ[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+",
    severity: "high" as const,
    suggestion: "Never log or commit JWT tokens",
  },
  {
    name: "Connection String",
    regex: "(?:mongodb|postgresql|mysql|redis)://[^\\s]+",
    severity: "high" as const,
    suggestion: "Use environment variables or secrets manager",
  },
];

const DEFAULT_REDACTION_PATTERNS: RedactionRule[] = [
  {
    name: "api-key",
    pattern: '(?:api[_-]?key|apikey)\\s*[=:]\\s*["\']?([a-zA-Z0-9_\\-]{20,})',
    replacement: "***REDACTED_API_KEY***",
  },
  {
    name: "password",
    pattern: '(?:password|passwd|pwd)\\s*[=:]\\s*["\']?([^\\s"\']+)',
    replacement: "***REDACTED_PASSWORD***",
  },
  {
    name: "connection-string",
    pattern: "(?:mongodb|postgresql|mysql|redis)://[^\\s]+",
    replacement: "***REDACTED_CONNECTION_STRING***",
  },
  {
    name: "bearer-token",
    pattern: "Bearer\\s+[a-zA-Z0-9_\\-\\.]+",
    replacement: "Bearer ***REDACTED***",
  },
  {
    name: "private-key",
    pattern: "-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\\s\\S]*?-----END (?:RSA |EC |DSA )?PRIVATE KEY-----",
    replacement: "***REDACTED_PRIVATE_KEY***",
  },
];

function containsInjectionPattern(value: string): boolean {
  const injectionPatterns = [
    /[;&|`$]/, // Shell meta-characters
    /\bexec\b/i,
    /\beval\b/i,
    /\bsystem\b/i,
    /\bspawn\b/i,
    /__import__/,
    /os\.(?:system|popen|exec)/,
    /subprocess\./,
    /child_process/,
  ];
  return injectionPatterns.some((p) => p.test(value));
}

function containsPathTraversal(value: string): boolean {
  return value.includes("../") || value.includes("..\\") || value.includes("/etc/");
}

function detectDataSensitivity(data: string): DataClassification {
  const lower = data.toLowerCase();

  if (
    /\b\d{3}-\d{2}-\d{4}\b/.test(data) || // SSN pattern
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(data) || // Credit card
    lower.includes("social security") ||
    lower.includes("passport number")
  ) {
    return "regulated";
  }

  if (
    lower.includes("confidential") ||
    lower.includes("secret") ||
    lower.includes("private key") ||
    lower.includes("password")
  ) {
    return "confidential";
  }

  if (
    lower.includes("internal") ||
    lower.includes("proprietary") ||
    lower.includes("company")
  ) {
    return "internal";
  }

  return "public";
}
