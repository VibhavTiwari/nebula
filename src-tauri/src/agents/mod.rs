pub mod cto;
pub mod engineering;
pub mod testing_agent;
pub mod devops;
pub mod security_agent;
pub mod scribing;

use crate::agent_runtime::{AgentDefinition, AgentLevel, AgentRole, AgentRuntime};

/// Register all default Nebula agents with the runtime.
pub fn register_all_agents(runtime: &AgentRuntime) {
    // Level 1: CTO Agent
    runtime.register_agent(cto::definition());

    // Level 2: Department Heads
    runtime.register_agent(engineering::definition());
    runtime.register_agent(testing_agent::definition());
    runtime.register_agent(devops::definition());
    runtime.register_agent(security_agent::definition());
    runtime.register_agent(scribing::definition());

    // Level 3: Worker agents (dynamically created per-task, but pre-register defaults)
    runtime.register_agent(AgentDefinition {
        id: "worker-frontend".into(),
        name: "Frontend Worker".into(),
        role: AgentRole::FrontendWorker,
        level: AgentLevel::L3Worker,
        system_prompt: "You are a frontend development specialist. You write React, Next.js, and TypeScript code. Follow component-based architecture, use proper TypeScript types, and write accessible, responsive UI. You receive tasks from the Engineering Head and return completed code.".into(),
        model: "gpt-4o".into(),
        provider: "openai".into(),
        temperature: 0.3,
        max_tokens: 4096,
        allowed_tools: vec![
            "nebula.repository.read_file".into(),
            "nebula.repository.write_file".into(),
            "nebula.repository.diff".into(),
            "nebula.repository.run_command".into(),
        ],
        max_iterations: 10,
    });

    runtime.register_agent(AgentDefinition {
        id: "worker-backend".into(),
        name: "Backend Worker".into(),
        role: AgentRole::BackendWorker,
        level: AgentLevel::L3Worker,
        system_prompt: "You are a backend development specialist. You write Python/Django, Rust, Erlang, and Elixir code. Follow service-oriented architecture, write proper API endpoints with validation, and ensure database schemas are well-designed. You receive tasks from the Engineering Head and return completed code.".into(),
        model: "gpt-4o".into(),
        provider: "openai".into(),
        temperature: 0.3,
        max_tokens: 4096,
        allowed_tools: vec![
            "nebula.repository.read_file".into(),
            "nebula.repository.write_file".into(),
            "nebula.repository.diff".into(),
            "nebula.repository.run_command".into(),
        ],
        max_iterations: 10,
    });

    runtime.register_agent(AgentDefinition {
        id: "worker-fullstack".into(),
        name: "Full-Stack Worker".into(),
        role: AgentRole::FullstackWorker,
        level: AgentLevel::L3Worker,
        system_prompt: "You are a full-stack development specialist. You handle both frontend (React/Next.js/TypeScript) and backend (Python/Rust/Elixir) tasks. You can work across the entire stack, from database schemas to API endpoints to UI components.".into(),
        model: "gpt-4o".into(),
        provider: "openai".into(),
        temperature: 0.3,
        max_tokens: 4096,
        allowed_tools: vec![
            "nebula.repository.read_file".into(),
            "nebula.repository.write_file".into(),
            "nebula.repository.diff".into(),
            "nebula.repository.run_command".into(),
        ],
        max_iterations: 10,
    });

    runtime.register_agent(AgentDefinition {
        id: "worker-unit-test".into(),
        name: "Unit Test Worker".into(),
        role: AgentRole::UnitTestWorker,
        level: AgentLevel::L3Worker,
        system_prompt: "You are a unit testing specialist. You write and execute unit tests for all supported stacks (TypeScript/Vitest, Python/pytest, Rust/cargo test, Erlang/EUnit, Elixir/ExUnit). Ensure high coverage and meaningful assertions.".into(),
        model: "gpt-4o".into(),
        provider: "openai".into(),
        temperature: 0.2,
        max_tokens: 4096,
        allowed_tools: vec![
            "nebula.repository.read_file".into(),
            "nebula.repository.run_command".into(),
            "nebula.repository.diff".into(),
        ],
        max_iterations: 8,
    });

    runtime.register_agent(AgentDefinition {
        id: "worker-integration-test".into(),
        name: "Integration Test Worker".into(),
        role: AgentRole::IntegrationTestWorker,
        level: AgentLevel::L3Worker,
        system_prompt: "You are an integration testing specialist. You write and run integration tests, E2E tests (Playwright), and API contract tests. Verify that services work correctly together.".into(),
        model: "gpt-4o".into(),
        provider: "openai".into(),
        temperature: 0.2,
        max_tokens: 4096,
        allowed_tools: vec![
            "nebula.repository.read_file".into(),
            "nebula.repository.run_command".into(),
            "nebula.repository.diff".into(),
        ],
        max_iterations: 8,
    });

    runtime.register_agent(AgentDefinition {
        id: "worker-documentation".into(),
        name: "Documentation Worker".into(),
        role: AgentRole::DocumentationWorker,
        level: AgentLevel::L3Worker,
        system_prompt: "You are a documentation specialist. You write Level 0 change notes, Level 1 service notes, and Level 2 system notes following the Obsidian vault templates. Use proper frontmatter, link related notes, and maintain the documentation lattice.".into(),
        model: "gpt-4o".into(),
        provider: "openai".into(),
        temperature: 0.4,
        max_tokens: 4096,
        allowed_tools: vec![
            "nebula.documentation.read_note".into(),
            "nebula.documentation.write_note".into(),
            "nebula.documentation.list_notes".into(),
            "nebula.repository.read_file".into(),
        ],
        max_iterations: 6,
    });
}
