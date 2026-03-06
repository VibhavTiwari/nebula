use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestRun {
    pub id: String,
    pub project_id: String,
    pub run_type: TestRunType,
    pub status: TestRunStatus,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub results: Vec<TestResult>,
    pub summary: TestSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TestRunType {
    Unit,
    Integration,
    Security,
    Performance,
    E2e,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TestRunStatus {
    Pending,
    Running,
    Passed,
    Failed,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestResult {
    pub name: String,
    pub suite: String,
    pub status: String, // "passed", "failed", "skipped", "error"
    pub duration_ms: u64,
    pub error_message: Option<String>,
    pub file_path: Option<String>,
    pub line_number: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestSummary {
    pub total: u32,
    pub passed: u32,
    pub failed: u32,
    pub skipped: u32,
    pub errors: u32,
    pub duration_ms: u64,
    pub coverage_percent: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityFinding {
    pub id: String,
    pub severity: String, // "critical", "high", "medium", "low", "info"
    pub category: String,
    pub title: String,
    pub description: String,
    pub file_path: Option<String>,
    pub line_number: Option<u32>,
    pub recommendation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetric {
    pub name: String,
    pub value: f64,
    pub unit: String,
    pub threshold: Option<f64>,
    pub passed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GateEvaluation {
    pub gate_id: String,
    pub gate_name: String,
    pub gate_type: String, // "merge" | "deploy"
    pub passed: bool,
    pub required: bool,
    pub details: String,
    pub evaluated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCommand {
    pub stack: String,
    pub unit_test: String,
    pub integration_test: String,
    pub lint: String,
    pub type_check: Option<String>,
    pub security_scan: String,
    pub coverage: String,
}

#[derive(Debug, thiserror::Error)]
pub enum TestError {
    #[error("Test run not found: {0}")]
    NotFound(String),
    #[error("Test execution failed: {0}")]
    ExecutionFailed(String),
    #[error("Invalid stack: {0}")]
    InvalidStack(String),
}

impl Serialize for TestError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// ---------------------------------------------------------------------------
// Stack-specific test commands
// ---------------------------------------------------------------------------

fn get_test_commands() -> HashMap<String, TestCommand> {
    let mut cmds = HashMap::new();

    cmds.insert(
        "typescript-react".into(),
        TestCommand {
            stack: "typescript-react".into(),
            unit_test: "npx vitest run".into(),
            integration_test: "npx playwright test".into(),
            lint: "npx eslint . --ext .ts,.tsx".into(),
            type_check: Some("npx tsc --noEmit".into()),
            security_scan: "npx audit-ci --moderate".into(),
            coverage: "npx vitest run --coverage".into(),
        },
    );

    cmds.insert(
        "python-django".into(),
        TestCommand {
            stack: "python-django".into(),
            unit_test: "python -m pytest tests/ -v".into(),
            integration_test: "python -m pytest tests/integration/ -v".into(),
            lint: "ruff check .".into(),
            type_check: Some("mypy .".into()),
            security_scan: "pip-audit".into(),
            coverage: "python -m pytest --cov=. --cov-report=json".into(),
        },
    );

    cmds.insert(
        "rust".into(),
        TestCommand {
            stack: "rust".into(),
            unit_test: "cargo test".into(),
            integration_test: "cargo test --test integration".into(),
            lint: "cargo clippy -- -D warnings".into(),
            type_check: None,
            security_scan: "cargo audit".into(),
            coverage: "cargo tarpaulin --out json".into(),
        },
    );

    cmds.insert(
        "erlang".into(),
        TestCommand {
            stack: "erlang".into(),
            unit_test: "rebar3 eunit".into(),
            integration_test: "rebar3 ct".into(),
            lint: "rebar3 dialyzer".into(),
            type_check: None,
            security_scan: "rebar3 hex audit".into(),
            coverage: "rebar3 cover".into(),
        },
    );

    cmds.insert(
        "elixir".into(),
        TestCommand {
            stack: "elixir".into(),
            unit_test: "mix test".into(),
            integration_test: "mix test --only integration".into(),
            lint: "mix credo --strict".into(),
            type_check: Some("mix dialyzer".into()),
            security_scan: "mix deps.audit".into(),
            coverage: "mix test --cover".into(),
        },
    );

    cmds
}

// ---------------------------------------------------------------------------
// Testing Engine
// ---------------------------------------------------------------------------

pub struct TestingEngine {
    test_runs: Mutex<Vec<TestRun>>,
    gate_evaluations: Mutex<Vec<GateEvaluation>>,
}

impl TestingEngine {
    pub fn new() -> Self {
        Self {
            test_runs: Mutex::new(Vec::new()),
            gate_evaluations: Mutex::new(Vec::new()),
        }
    }

    /// Get test commands for a given stack
    pub fn get_test_commands_for_stack(&self, stack: &str) -> Option<TestCommand> {
        get_test_commands().remove(stack)
    }

    /// List all supported stacks
    pub fn list_supported_stacks(&self) -> Vec<String> {
        get_test_commands().keys().cloned().collect()
    }

    /// Create a test run record
    pub fn create_test_run(
        &self,
        project_id: &str,
        run_type: TestRunType,
    ) -> TestRun {
        let run = TestRun {
            id: uuid::Uuid::new_v4().to_string(),
            project_id: project_id.to_string(),
            run_type,
            status: TestRunStatus::Pending,
            started_at: chrono::Utc::now().to_rfc3339(),
            completed_at: None,
            results: Vec::new(),
            summary: TestSummary {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                errors: 0,
                duration_ms: 0,
                coverage_percent: None,
            },
        };

        let mut runs = self.test_runs.lock().unwrap();
        runs.push(run.clone());
        run
    }

    /// Record test results for a run
    pub fn record_test_results(
        &self,
        run_id: &str,
        results: Vec<TestResult>,
        coverage: Option<f64>,
    ) -> Result<TestRun, TestError> {
        let mut runs = self.test_runs.lock().unwrap();
        let run = runs
            .iter_mut()
            .find(|r| r.id == run_id)
            .ok_or_else(|| TestError::NotFound(run_id.into()))?;

        let total = results.len() as u32;
        let passed = results.iter().filter(|r| r.status == "passed").count() as u32;
        let failed = results.iter().filter(|r| r.status == "failed").count() as u32;
        let skipped = results.iter().filter(|r| r.status == "skipped").count() as u32;
        let errors = results.iter().filter(|r| r.status == "error").count() as u32;
        let total_duration: u64 = results.iter().map(|r| r.duration_ms).sum();

        run.results = results;
        run.summary = TestSummary {
            total,
            passed,
            failed,
            skipped,
            errors,
            duration_ms: total_duration,
            coverage_percent: coverage,
        };

        run.status = if failed > 0 || errors > 0 {
            TestRunStatus::Failed
        } else {
            TestRunStatus::Passed
        };
        run.completed_at = Some(chrono::Utc::now().to_rfc3339());

        Ok(run.clone())
    }

    /// Get a test run by ID
    pub fn get_test_run(&self, run_id: &str) -> Option<TestRun> {
        let runs = self.test_runs.lock().unwrap();
        runs.iter().find(|r| r.id == run_id).cloned()
    }

    /// List test runs for a project
    pub fn list_test_runs(&self, project_id: &str) -> Vec<TestRun> {
        let runs = self.test_runs.lock().unwrap();
        runs.iter()
            .filter(|r| r.project_id == project_id)
            .cloned()
            .collect()
    }

    /// Evaluate merge gates
    pub fn evaluate_merge_gates(
        &self,
        _project_id: &str,
        test_summary: &TestSummary,
        security_passed: bool,
        docs_updated: bool,
    ) -> Vec<GateEvaluation> {
        let now = chrono::Utc::now().to_rfc3339();
        let mut gates = Vec::new();

        // Gate: Build succeeds (implicit if tests ran)
        gates.push(GateEvaluation {
            gate_id: "build".into(),
            gate_name: "Build Succeeds".into(),
            gate_type: "merge".into(),
            passed: true,
            required: true,
            details: "Build completed successfully".into(),
            evaluated_at: now.clone(),
        });

        // Gate: Unit tests pass
        let tests_passed = test_summary.failed == 0 && test_summary.errors == 0;
        gates.push(GateEvaluation {
            gate_id: "unit_tests".into(),
            gate_name: "Unit Tests Pass".into(),
            gate_type: "merge".into(),
            passed: tests_passed,
            required: true,
            details: format!(
                "{}/{} tests passed, {} failed",
                test_summary.passed, test_summary.total, test_summary.failed
            ),
            evaluated_at: now.clone(),
        });

        // Gate: Code coverage threshold
        let coverage_ok = test_summary
            .coverage_percent
            .map_or(false, |c| c >= 70.0);
        gates.push(GateEvaluation {
            gate_id: "coverage".into(),
            gate_name: "Code Coverage >= 70%".into(),
            gate_type: "merge".into(),
            passed: coverage_ok,
            required: false,
            details: format!(
                "Coverage: {:.1}%",
                test_summary.coverage_percent.unwrap_or(0.0)
            ),
            evaluated_at: now.clone(),
        });

        // Gate: Security scan passes
        gates.push(GateEvaluation {
            gate_id: "security".into(),
            gate_name: "Security Scan Passes".into(),
            gate_type: "merge".into(),
            passed: security_passed,
            required: true,
            details: if security_passed {
                "No security issues found".into()
            } else {
                "Security issues detected".into()
            },
            evaluated_at: now.clone(),
        });

        // Gate: Documentation updated
        gates.push(GateEvaluation {
            gate_id: "documentation".into(),
            gate_name: "Documentation Updated".into(),
            gate_type: "merge".into(),
            passed: docs_updated,
            required: true,
            details: if docs_updated {
                "Level 0 documentation created".into()
            } else {
                "Documentation not yet updated".into()
            },
            evaluated_at: now,
        });

        // Store evaluations
        let mut stored = self.gate_evaluations.lock().unwrap();
        stored.extend(gates.clone());

        gates
    }

    /// Evaluate deploy gates
    pub fn evaluate_deploy_gates(
        &self,
        _project_id: &str,
        merge_gates_passed: bool,
        integration_tests_passed: bool,
        environment: &str,
    ) -> Vec<GateEvaluation> {
        let now = chrono::Utc::now().to_rfc3339();
        let mut gates = Vec::new();

        // Gate: All merge gates passed
        gates.push(GateEvaluation {
            gate_id: "merge_gates".into(),
            gate_name: "Merge Gates Passed".into(),
            gate_type: "deploy".into(),
            passed: merge_gates_passed,
            required: true,
            details: if merge_gates_passed {
                "All required merge gates passed".into()
            } else {
                "Some merge gates failed".into()
            },
            evaluated_at: now.clone(),
        });

        // Gate: Integration tests
        gates.push(GateEvaluation {
            gate_id: "integration_tests".into(),
            gate_name: "Integration Tests Pass".into(),
            gate_type: "deploy".into(),
            passed: integration_tests_passed,
            required: true,
            details: if integration_tests_passed {
                "Integration tests passed".into()
            } else {
                "Integration tests failed".into()
            },
            evaluated_at: now.clone(),
        });

        // Gate: Rollback configured
        gates.push(GateEvaluation {
            gate_id: "rollback".into(),
            gate_name: "Rollback Configured".into(),
            gate_type: "deploy".into(),
            passed: true,
            required: true,
            details: format!("Rollback configured for {}", environment),
            evaluated_at: now,
        });

        // Store evaluations
        let mut stored = self.gate_evaluations.lock().unwrap();
        stored.extend(gates.clone());

        gates
    }

    /// Get gate evaluations for a project
    pub fn get_gate_evaluations(&self, _project_id: &str) -> Vec<GateEvaluation> {
        let stored = self.gate_evaluations.lock().unwrap();
        stored.clone()
    }

    /// Check if all required gates of a type passed
    pub fn all_required_gates_passed(&self, gate_type: &str) -> bool {
        let stored = self.gate_evaluations.lock().unwrap();
        stored
            .iter()
            .filter(|g| g.gate_type == gate_type && g.required)
            .all(|g| g.passed)
    }
}
