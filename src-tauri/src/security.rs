use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecretFinding {
    pub pattern_name: String,
    pub file_path: String,
    pub line_number: u32,
    pub matched_text: String,
    pub severity: String, // "critical", "high", "medium", "low"
    pub redacted: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InjectionFinding {
    pub attack_type: String,
    pub input_source: String,
    pub matched_pattern: String,
    pub severity: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityScanResult {
    pub scan_id: String,
    pub timestamp: String,
    pub project_id: String,
    pub secrets_found: Vec<SecretFinding>,
    pub injections_found: Vec<InjectionFinding>,
    pub tool_violations: Vec<ToolViolation>,
    pub classification_violations: Vec<ClassificationViolation>,
    pub passed: bool,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolViolation {
    pub tool_name: String,
    pub parameter: String,
    pub violation_type: String, // "path_traversal", "command_injection", "sql_injection"
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassificationViolation {
    pub field: String,
    pub classification: String,
    pub target_provider: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityReport {
    pub project_id: String,
    pub generated_at: String,
    pub total_scans: u32,
    pub secrets_found: u32,
    pub injections_blocked: u32,
    pub tool_violations: u32,
    pub risk_level: String,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataClassification {
    pub level: String, // "public", "internal", "confidential", "regulated"
    pub allowed_providers: Vec<String>,
    pub requires_encryption: bool,
    pub retention_days: u32,
}

// ---------------------------------------------------------------------------
// Secret patterns
// ---------------------------------------------------------------------------

struct SecretPattern {
    name: &'static str,
    pattern: &'static str,
    severity: &'static str,
}

const SECRET_PATTERNS: &[SecretPattern] = &[
    SecretPattern {
        name: "AWS Access Key",
        pattern: r"AKIA[0-9A-Z]{16}",
        severity: "critical",
    },
    SecretPattern {
        name: "AWS Secret Key",
        pattern: r"(?i)aws[_\-]?secret[_\-]?access[_\-]?key\s*[=:]\s*[A-Za-z0-9/+=]{40}",
        severity: "critical",
    },
    SecretPattern {
        name: "GitHub Token",
        pattern: r"gh[pousr]_[A-Za-z0-9_]{36,}",
        severity: "critical",
    },
    SecretPattern {
        name: "Generic API Key",
        pattern: r#"(?i)(api[_\-]?key|apikey)\s*[=:]\s*['"]?[A-Za-z0-9\-_]{20,}['"]?"#,
        severity: "high",
    },
    SecretPattern {
        name: "JWT Token",
        pattern: r"eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+",
        severity: "high",
    },
    SecretPattern {
        name: "Private Key",
        pattern: r"-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----",
        severity: "critical",
    },
    SecretPattern {
        name: "Connection String",
        pattern: r"(?i)(mongodb|postgres|mysql|redis)://[^\s]+",
        severity: "high",
    },
    SecretPattern {
        name: "Password Assignment",
        pattern: r#"(?i)(password|passwd|pwd)\s*[=:]\s*['"][^'"]{8,}['"]"#,
        severity: "high",
    },
    SecretPattern {
        name: "Slack Token",
        pattern: r"xox[baprs]-[0-9A-Za-z\-]+",
        severity: "high",
    },
    SecretPattern {
        name: "Azure Storage Key",
        pattern: r"(?i)DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]+",
        severity: "critical",
    },
    SecretPattern {
        name: "OpenAI API Key",
        pattern: r"sk-[A-Za-z0-9]{20,}",
        severity: "high",
    },
    SecretPattern {
        name: "Anthropic API Key",
        pattern: r"sk-ant-[A-Za-z0-9\-]{20,}",
        severity: "high",
    },
];

// ---------------------------------------------------------------------------
// Prompt injection patterns
// ---------------------------------------------------------------------------

struct InjectionPattern {
    name: &'static str,
    pattern: &'static str,
    severity: &'static str,
    description: &'static str,
}

const INJECTION_PATTERNS: &[InjectionPattern] = &[
    InjectionPattern {
        name: "System Prompt Override",
        pattern: r"(?i)(ignore|forget|disregard)\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|context)",
        severity: "critical",
        description: "Attempt to override system prompt instructions",
    },
    InjectionPattern {
        name: "Role Hijacking",
        pattern: r"(?i)(you are now|act as|pretend to be|from now on you|your new role)",
        severity: "high",
        description: "Attempt to change the agent's role or identity",
    },
    InjectionPattern {
        name: "Instruction Injection",
        pattern: r"(?i)(system|admin|root)\s*:\s*(execute|run|do|perform)",
        severity: "high",
        description: "Attempt to inject system-level instructions",
    },
    InjectionPattern {
        name: "Prompt Leakage Request",
        pattern: r"(?i)(show|reveal|print|output|display|tell me)\s+(your|the)\s+(system|initial|original)\s+(prompt|instructions|message)",
        severity: "medium",
        description: "Attempt to extract system prompt contents",
    },
    InjectionPattern {
        name: "Delimiter Injection",
        pattern: r"(\[SYSTEM\]|\[INST\]|<\|im_start\|>|<\|endoftext\|>)",
        severity: "high",
        description: "Attempt to inject model-specific delimiters",
    },
    InjectionPattern {
        name: "Command Injection via Tool",
        pattern: r"(?i)(;\s*rm\s|;\s*curl\s|;\s*wget\s|\|\s*sh\s|`.*`|\$\(.*\))",
        severity: "critical",
        description: "Shell command injection attempt in tool parameters",
    },
    InjectionPattern {
        name: "Path Traversal",
        pattern: r"(\.\./|\.\.\\){2,}",
        severity: "high",
        description: "Path traversal attempt to access files outside allowed scope",
    },
    InjectionPattern {
        name: "SQL Injection",
        pattern: r"(?i)(union\s+select|or\s+1\s*=\s*1|drop\s+table|insert\s+into|delete\s+from)",
        severity: "high",
        description: "SQL injection attempt in input data",
    },
];

// ---------------------------------------------------------------------------
// Security Engine
// ---------------------------------------------------------------------------

pub struct SecurityEngine {
    scan_history: Mutex<Vec<SecurityScanResult>>,
    classification_rules: Mutex<HashMap<String, DataClassification>>,
}

impl SecurityEngine {
    pub fn new() -> Self {
        let mut rules = HashMap::new();
        rules.insert(
            "public".into(),
            DataClassification {
                level: "public".into(),
                allowed_providers: vec![
                    "openai".into(),
                    "anthropic".into(),
                    "google".into(),
                    "local".into(),
                ],
                requires_encryption: false,
                retention_days: 365,
            },
        );
        rules.insert(
            "internal".into(),
            DataClassification {
                level: "internal".into(),
                allowed_providers: vec![
                    "anthropic".into(),
                    "google".into(),
                    "local".into(),
                ],
                requires_encryption: false,
                retention_days: 180,
            },
        );
        rules.insert(
            "confidential".into(),
            DataClassification {
                level: "confidential".into(),
                allowed_providers: vec!["local".into()],
                requires_encryption: true,
                retention_days: 90,
            },
        );
        rules.insert(
            "regulated".into(),
            DataClassification {
                level: "regulated".into(),
                allowed_providers: vec!["local".into()],
                requires_encryption: true,
                retention_days: 30,
            },
        );

        Self {
            scan_history: Mutex::new(Vec::new()),
            classification_rules: Mutex::new(rules),
        }
    }

    /// Scan text content for secrets
    pub fn scan_secrets(&self, content: &str, file_path: &str) -> Vec<SecretFinding> {
        let mut findings = Vec::new();

        for pattern_def in SECRET_PATTERNS {
            if let Ok(re) = Regex::new(pattern_def.pattern) {
                for (line_idx, line) in content.lines().enumerate() {
                    for m in re.find_iter(line) {
                        let matched = m.as_str().to_string();
                        let redacted = redact_secret(&matched);
                        findings.push(SecretFinding {
                            pattern_name: pattern_def.name.to_string(),
                            file_path: file_path.to_string(),
                            line_number: (line_idx + 1) as u32,
                            matched_text: matched,
                            severity: pattern_def.severity.to_string(),
                            redacted,
                        });
                    }
                }
            }
        }

        findings
    }

    /// Scan text for prompt injection attempts
    pub fn scan_injection(&self, input: &str, source: &str) -> Vec<InjectionFinding> {
        let mut findings = Vec::new();

        for pattern_def in INJECTION_PATTERNS {
            if let Ok(re) = Regex::new(pattern_def.pattern) {
                if let Some(m) = re.find(input) {
                    findings.push(InjectionFinding {
                        attack_type: pattern_def.name.to_string(),
                        input_source: source.to_string(),
                        matched_pattern: m.as_str().to_string(),
                        severity: pattern_def.severity.to_string(),
                        description: pattern_def.description.to_string(),
                    });
                }
            }
        }

        findings
    }

    /// Validate tool call parameters for injection attempts
    pub fn validate_tool_params(
        &self,
        tool_name: &str,
        params: &serde_json::Value,
    ) -> Vec<ToolViolation> {
        let mut violations = Vec::new();

        if let Some(obj) = params.as_object() {
            for (key, value) in obj {
                if let Some(val_str) = value.as_str() {
                    // Check for command injection
                    if let Ok(re) =
                        Regex::new(r"(?i)(;\s*rm\s|;\s*curl\s|;\s*wget\s|\|\s*sh\s|`.*`|\$\(.*\))")
                    {
                        if re.is_match(val_str) {
                            violations.push(ToolViolation {
                                tool_name: tool_name.to_string(),
                                parameter: key.clone(),
                                violation_type: "command_injection".into(),
                                description: format!(
                                    "Potential command injection in parameter '{}'",
                                    key
                                ),
                            });
                        }
                    }

                    // Check for path traversal
                    if let Ok(re) = Regex::new(r"(\.\./|\.\.\\){2,}") {
                        if re.is_match(val_str) {
                            violations.push(ToolViolation {
                                tool_name: tool_name.to_string(),
                                parameter: key.clone(),
                                violation_type: "path_traversal".into(),
                                description: format!(
                                    "Path traversal attempt in parameter '{}'",
                                    key
                                ),
                            });
                        }
                    }

                    // Check for SQL injection
                    if let Ok(re) = Regex::new(
                        r"(?i)(union\s+select|or\s+1\s*=\s*1|drop\s+table|;\s*delete\s+from)",
                    ) {
                        if re.is_match(val_str) {
                            violations.push(ToolViolation {
                                tool_name: tool_name.to_string(),
                                parameter: key.clone(),
                                violation_type: "sql_injection".into(),
                                description: format!(
                                    "Potential SQL injection in parameter '{}'",
                                    key
                                ),
                            });
                        }
                    }
                }
            }
        }

        violations
    }

    /// Validate data classification for a provider
    pub fn validate_classification(
        &self,
        data_level: &str,
        target_provider: &str,
    ) -> Option<ClassificationViolation> {
        let rules = self.classification_rules.lock().unwrap();
        if let Some(classification) = rules.get(data_level) {
            if !classification
                .allowed_providers
                .iter()
                .any(|p| p == target_provider)
            {
                return Some(ClassificationViolation {
                    field: "data".into(),
                    classification: data_level.into(),
                    target_provider: target_provider.into(),
                    reason: format!(
                        "Data classified as '{}' cannot be sent to provider '{}'. Allowed: {:?}",
                        data_level, target_provider, classification.allowed_providers
                    ),
                });
            }
        }
        None
    }

    /// Redact sensitive data from text
    pub fn redact_text(&self, text: &str) -> String {
        let mut result = text.to_string();
        for pattern_def in SECRET_PATTERNS {
            if let Ok(re) = Regex::new(pattern_def.pattern) {
                result = re
                    .replace_all(&result, |caps: &regex::Captures| {
                        redact_secret(caps.get(0).map_or("", |m| m.as_str()))
                    })
                    .to_string();
            }
        }
        result
    }

    /// Run a full security scan on content
    pub fn full_scan(
        &self,
        project_id: &str,
        files: &[(String, String)], // (path, content)
        user_inputs: &[(String, String)], // (source, input)
    ) -> SecurityScanResult {
        let mut all_secrets = Vec::new();
        let mut all_injections = Vec::new();
        let all_tool_violations = Vec::new();
        let all_classification_violations = Vec::new();

        // Scan each file for secrets
        for (path, content) in files {
            let secrets = self.scan_secrets(content, path);
            all_secrets.extend(secrets);
        }

        // Scan user inputs for injection
        for (source, input) in user_inputs {
            let injections = self.scan_injection(input, source);
            all_injections.extend(injections);
        }

        let passed = all_secrets.is_empty()
            && all_injections.is_empty()
            && all_tool_violations.is_empty()
            && all_classification_violations.is_empty();

        let summary = if passed {
            "Security scan passed — no issues found".into()
        } else {
            format!(
                "Security scan found {} secret(s), {} injection attempt(s), {} tool violation(s)",
                all_secrets.len(),
                all_injections.len(),
                all_tool_violations.len()
            )
        };

        let result = SecurityScanResult {
            scan_id: uuid::Uuid::new_v4().to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            project_id: project_id.to_string(),
            secrets_found: all_secrets,
            injections_found: all_injections,
            tool_violations: all_tool_violations,
            classification_violations: all_classification_violations,
            passed,
            summary,
        };

        // Store scan result
        let mut history = self.scan_history.lock().unwrap();
        history.push(result.clone());

        result
    }

    /// Generate a security report
    pub fn generate_report(&self, project_id: &str) -> SecurityReport {
        let history = self.scan_history.lock().unwrap();
        let project_scans: Vec<_> = history
            .iter()
            .filter(|s| s.project_id == project_id)
            .collect();

        let total_secrets: u32 = project_scans.iter().map(|s| s.secrets_found.len() as u32).sum();
        let total_injections: u32 = project_scans
            .iter()
            .map(|s| s.injections_found.len() as u32)
            .sum();
        let total_violations: u32 = project_scans
            .iter()
            .map(|s| s.tool_violations.len() as u32)
            .sum();

        let risk_level = if total_secrets > 0 || total_injections > 0 {
            "high"
        } else if total_violations > 0 {
            "medium"
        } else {
            "low"
        };

        let mut recommendations = Vec::new();
        if total_secrets > 0 {
            recommendations.push("Rotate any exposed secrets immediately".into());
            recommendations.push("Add secret scanning to pre-commit hooks".into());
            recommendations.push("Use environment variables or Key Vault for secrets".into());
        }
        if total_injections > 0 {
            recommendations.push("Review input validation on all user-facing endpoints".into());
            recommendations.push("Enable strict content security policies".into());
        }
        if total_violations > 0 {
            recommendations.push("Review tool parameter validation rules".into());
        }
        if recommendations.is_empty() {
            recommendations.push("No issues found — maintain current security posture".into());
        }

        SecurityReport {
            project_id: project_id.to_string(),
            generated_at: chrono::Utc::now().to_rfc3339(),
            total_scans: project_scans.len() as u32,
            secrets_found: total_secrets,
            injections_blocked: total_injections,
            tool_violations: total_violations,
            risk_level: risk_level.to_string(),
            recommendations,
        }
    }

    pub fn get_scan_history(&self, project_id: &str) -> Vec<SecurityScanResult> {
        let history = self.scan_history.lock().unwrap();
        history
            .iter()
            .filter(|s| s.project_id == project_id)
            .cloned()
            .collect()
    }
}

/// Redact a secret by keeping first/last 4 chars
fn redact_secret(secret: &str) -> String {
    if secret.len() <= 8 {
        return "***REDACTED***".to_string();
    }
    let prefix = &secret[..4];
    let suffix = &secret[secret.len() - 4..];
    format!("{}...{}***", prefix, suffix)
}
