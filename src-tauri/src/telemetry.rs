use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraceSpan {
    pub trace_id: String,
    pub span_id: String,
    pub parent_span_id: Option<String>,
    pub operation: String,
    pub service: String,
    pub status: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub duration_ms: Option<u64>,
    pub attributes: HashMap<String, String>,
    pub events: Vec<SpanEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpanEvent {
    pub name: String,
    pub timestamp: String,
    pub attributes: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricPoint {
    pub name: String,
    pub value: f64,
    pub unit: String,
    pub timestamp: String,
    pub labels: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub service: String,
    pub message: String,
    pub trace_id: Option<String>,
    pub span_id: Option<String>,
    pub attributes: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectorConfig {
    pub receivers: serde_json::Value,
    pub processors: serde_json::Value,
    pub exporters: serde_json::Value,
    pub service_pipelines: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstrumentationConfig {
    pub stack: String,
    pub packages: Vec<String>,
    pub env_vars: HashMap<String, String>,
    pub setup_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceHealthStatus {
    pub service: String,
    pub status: String, // "healthy", "degraded", "unhealthy", "unknown"
    pub last_check: String,
    pub uptime_percent: f64,
    pub error_rate: f64,
    pub p99_latency_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Runbook {
    pub service: String,
    pub title: String,
    pub generated_at: String,
    pub sections: Vec<RunbookSection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunbookSection {
    pub title: String,
    pub content: String,
}

// ---------------------------------------------------------------------------
// Telemetry Engine
// ---------------------------------------------------------------------------

pub struct TelemetryEngine {
    traces: Mutex<Vec<TraceSpan>>,
    metrics: Mutex<Vec<MetricPoint>>,
    logs: Mutex<Vec<LogEntry>>,
    health: Mutex<HashMap<String, ServiceHealthStatus>>,
}

impl TelemetryEngine {
    pub fn new() -> Self {
        Self {
            traces: Mutex::new(Vec::new()),
            metrics: Mutex::new(Vec::new()),
            logs: Mutex::new(Vec::new()),
            health: Mutex::new(HashMap::new()),
        }
    }

    /// Start a new trace span
    pub fn start_span(
        &self,
        operation: &str,
        service: &str,
        parent_span_id: Option<String>,
    ) -> TraceSpan {
        let span = TraceSpan {
            trace_id: uuid::Uuid::new_v4().to_string(),
            span_id: uuid::Uuid::new_v4().to_string(),
            parent_span_id,
            operation: operation.to_string(),
            service: service.to_string(),
            status: "in_progress".into(),
            start_time: chrono::Utc::now().to_rfc3339(),
            end_time: None,
            duration_ms: None,
            attributes: HashMap::new(),
            events: Vec::new(),
        };

        let mut traces = self.traces.lock().unwrap();
        traces.push(span.clone());
        span
    }

    /// End a trace span
    pub fn end_span(&self, span_id: &str, status: &str) {
        let mut traces = self.traces.lock().unwrap();
        if let Some(span) = traces.iter_mut().find(|s| s.span_id == span_id) {
            span.status = status.to_string();
            span.end_time = Some(chrono::Utc::now().to_rfc3339());
            // Calculate duration if possible
            if let Ok(start) = chrono::DateTime::parse_from_rfc3339(&span.start_time) {
                let end = chrono::Utc::now();
                span.duration_ms = Some(
                    (end - start.with_timezone(&chrono::Utc))
                        .num_milliseconds()
                        .unsigned_abs(),
                );
            }
        }
    }

    /// Add an event to a span
    pub fn add_span_event(
        &self,
        span_id: &str,
        event_name: &str,
        attributes: HashMap<String, String>,
    ) {
        let mut traces = self.traces.lock().unwrap();
        if let Some(span) = traces.iter_mut().find(|s| s.span_id == span_id) {
            span.events.push(SpanEvent {
                name: event_name.to_string(),
                timestamp: chrono::Utc::now().to_rfc3339(),
                attributes,
            });
        }
    }

    /// Record a metric point
    pub fn record_metric(
        &self,
        name: &str,
        value: f64,
        unit: &str,
        labels: HashMap<String, String>,
    ) {
        let point = MetricPoint {
            name: name.to_string(),
            value,
            unit: unit.to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            labels,
        };
        let mut metrics = self.metrics.lock().unwrap();
        metrics.push(point);
    }

    /// Record a log entry
    pub fn record_log(
        &self,
        level: &str,
        service: &str,
        message: &str,
        trace_id: Option<String>,
        span_id: Option<String>,
    ) {
        let entry = LogEntry {
            timestamp: chrono::Utc::now().to_rfc3339(),
            level: level.to_string(),
            service: service.to_string(),
            message: message.to_string(),
            trace_id,
            span_id,
            attributes: HashMap::new(),
        };
        let mut logs = self.logs.lock().unwrap();
        logs.push(entry);
    }

    /// Query traces for a service
    pub fn query_traces(&self, service: &str, limit: usize) -> Vec<TraceSpan> {
        let traces = self.traces.lock().unwrap();
        traces
            .iter()
            .filter(|s| s.service == service)
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    /// Query metrics
    pub fn query_metrics(&self, name: &str, limit: usize) -> Vec<MetricPoint> {
        let metrics = self.metrics.lock().unwrap();
        metrics
            .iter()
            .filter(|m| m.name == name)
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    /// Query logs
    pub fn query_logs(
        &self,
        service: &str,
        level: Option<&str>,
        limit: usize,
    ) -> Vec<LogEntry> {
        let logs = self.logs.lock().unwrap();
        logs.iter()
            .filter(|l| {
                l.service == service && level.map_or(true, |lv| l.level == lv)
            })
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    /// Update service health status
    pub fn update_health(&self, service: &str, status: ServiceHealthStatus) {
        let mut health = self.health.lock().unwrap();
        health.insert(service.to_string(), status);
    }

    /// Get service health
    pub fn get_health(&self, service: &str) -> Option<ServiceHealthStatus> {
        let health = self.health.lock().unwrap();
        health.get(service).cloned()
    }

    /// List all service health statuses
    pub fn list_health(&self) -> Vec<ServiceHealthStatus> {
        let health = self.health.lock().unwrap();
        health.values().cloned().collect()
    }

    /// Generate an OpenTelemetry Collector config
    pub fn generate_collector_config(&self) -> CollectorConfig {
        CollectorConfig {
            receivers: serde_json::json!({
                "otlp": {
                    "protocols": {
                        "grpc": { "endpoint": "0.0.0.0:4317" },
                        "http": { "endpoint": "0.0.0.0:4318" }
                    }
                }
            }),
            processors: serde_json::json!({
                "batch": {
                    "send_batch_size": 1024,
                    "timeout": "5s"
                },
                "memory_limiter": {
                    "limit_mib": 512,
                    "spike_limit_mib": 128,
                    "check_interval": "5s"
                },
                "resource": {
                    "attributes": [{
                        "key": "deployment.environment",
                        "value": "production",
                        "action": "insert"
                    }]
                }
            }),
            exporters: serde_json::json!({
                "otlp/jaeger": {
                    "endpoint": "jaeger:4317",
                    "tls": { "insecure": true }
                },
                "prometheus": {
                    "endpoint": "0.0.0.0:8889"
                },
                "loki": {
                    "endpoint": "http://loki:3100/loki/api/v1/push"
                }
            }),
            service_pipelines: serde_json::json!({
                "traces": {
                    "receivers": ["otlp"],
                    "processors": ["memory_limiter", "batch", "resource"],
                    "exporters": ["otlp/jaeger"]
                },
                "metrics": {
                    "receivers": ["otlp"],
                    "processors": ["memory_limiter", "batch"],
                    "exporters": ["prometheus"]
                },
                "logs": {
                    "receivers": ["otlp"],
                    "processors": ["memory_limiter", "batch"],
                    "exporters": ["loki"]
                }
            }),
        }
    }

    /// Generate instrumentation config for a given stack
    pub fn generate_instrumentation_config(&self, stack: &str) -> InstrumentationConfig {
        match stack {
            "typescript-react" | "typescript" => InstrumentationConfig {
                stack: stack.into(),
                packages: vec![
                    "@opentelemetry/api".into(),
                    "@opentelemetry/sdk-node".into(),
                    "@opentelemetry/auto-instrumentations-node".into(),
                    "@opentelemetry/exporter-trace-otlp-grpc".into(),
                    "@opentelemetry/exporter-metrics-otlp-grpc".into(),
                ],
                env_vars: HashMap::from([
                    ("OTEL_SERVICE_NAME".into(), "${SERVICE_NAME}".into()),
                    ("OTEL_EXPORTER_OTLP_ENDPOINT".into(), "http://otel-collector:4317".into()),
                ]),
                setup_code: r#"import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();"#.into(),
            },
            "python-django" | "python" => InstrumentationConfig {
                stack: stack.into(),
                packages: vec![
                    "opentelemetry-api".into(),
                    "opentelemetry-sdk".into(),
                    "opentelemetry-instrumentation-django".into(),
                    "opentelemetry-exporter-otlp".into(),
                ],
                env_vars: HashMap::from([
                    ("OTEL_SERVICE_NAME".into(), "${SERVICE_NAME}".into()),
                    ("OTEL_EXPORTER_OTLP_ENDPOINT".into(), "http://otel-collector:4317".into()),
                    ("DJANGO_SETTINGS_MODULE".into(), "config.settings".into()),
                ]),
                setup_code: r#"from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.django import DjangoInstrumentor

provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter())
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)
DjangoInstrumentor().instrument()"#.into(),
            },
            "rust" => InstrumentationConfig {
                stack: stack.into(),
                packages: vec![
                    "tracing".into(),
                    "tracing-subscriber".into(),
                    "tracing-opentelemetry".into(),
                    "opentelemetry".into(),
                    "opentelemetry-otlp".into(),
                ],
                env_vars: HashMap::from([
                    ("OTEL_SERVICE_NAME".into(), "${SERVICE_NAME}".into()),
                    ("OTEL_EXPORTER_OTLP_ENDPOINT".into(), "http://otel-collector:4317".into()),
                ]),
                setup_code: r#"use opentelemetry::global;
use opentelemetry_otlp::WithExportConfig;
use tracing_subscriber::layer::SubscriberExt;

let tracer = opentelemetry_otlp::new_pipeline()
    .tracing()
    .with_exporter(opentelemetry_otlp::new_exporter().tonic())
    .install_batch(opentelemetry::runtime::Tokio)
    .expect("Failed to install tracer");

let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);
let subscriber = tracing_subscriber::Registry::default().with(telemetry);
tracing::subscriber::set_global_default(subscriber).unwrap();"#.into(),
            },
            "erlang" => InstrumentationConfig {
                stack: stack.into(),
                packages: vec![
                    "opentelemetry".into(),
                    "opentelemetry_api".into(),
                    "opentelemetry_exporter_otlp".into(),
                ],
                env_vars: HashMap::from([
                    ("OTEL_SERVICE_NAME".into(), "${SERVICE_NAME}".into()),
                ]),
                setup_code: r#"{opentelemetry,
  [{sdk, [{sampler, {always_on, #{}}},
          {resource, #{service => #{name => <<"my-service">>}}}]},
   {processors, [{otel_batch_processor, #{}}]}]}."#.into(),
            },
            "elixir" => InstrumentationConfig {
                stack: stack.into(),
                packages: vec![
                    "opentelemetry".into(),
                    "opentelemetry_api".into(),
                    "opentelemetry_exporter_otlp".into(),
                    "opentelemetry_phoenix".into(),
                    "opentelemetry_ecto".into(),
                ],
                env_vars: HashMap::from([
                    ("OTEL_SERVICE_NAME".into(), "${SERVICE_NAME}".into()),
                ]),
                setup_code: r#"config :opentelemetry,
  span_processor: :batch,
  traces_exporter: :otlp

config :opentelemetry_exporter,
  otlp_protocol: :grpc,
  otlp_endpoint: "http://otel-collector:4317""#.into(),
            },
            _ => InstrumentationConfig {
                stack: stack.into(),
                packages: Vec::new(),
                env_vars: HashMap::new(),
                setup_code: "// No instrumentation config for this stack".into(),
            },
        }
    }

    /// Generate a runbook for a service
    pub fn generate_runbook(&self, service: &str) -> Runbook {
        Runbook {
            service: service.to_string(),
            title: format!("{} Operations Runbook", service),
            generated_at: chrono::Utc::now().to_rfc3339(),
            sections: vec![
                RunbookSection {
                    title: "Service Overview".into(),
                    content: format!("## {}\nManaged by Nebula IDE. Auto-generated runbook.", service),
                },
                RunbookSection {
                    title: "Health Checks".into(),
                    content: format!(
                        "- Liveness: `GET /health`\n- Readiness: `GET /ready`\n- Metrics: `GET /metrics`\n\nDashboard: Grafana → {} Service", service
                    ),
                },
                RunbookSection {
                    title: "Common Issues".into(),
                    content: "### High Latency\n1. Check `p99_latency_ms` metric\n2. Review recent traces for slow spans\n3. Check database connection pool\n\n### High Error Rate\n1. Check error logs: `level=error service=<name>`\n2. Review recent deployments\n3. Check dependency health".into(),
                },
                RunbookSection {
                    title: "Scaling".into(),
                    content: "### Scale Up\n```\nkubectl scale deployment <name> --replicas=<N>\n```\n\n### Auto-scaling\nHPA configured: min=2, max=10, target CPU=70%".into(),
                },
                RunbookSection {
                    title: "Rollback".into(),
                    content: "### Quick Rollback\n```\nkubectl argo rollouts undo <name>\n```\n\n### Rollback to Specific Revision\n```\nkubectl argo rollouts undo <name> --to-revision=<N>\n```".into(),
                },
            ],
        }
    }
}
