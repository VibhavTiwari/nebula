use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentRecord {
    pub id: String,
    pub project_id: String,
    pub service: String,
    pub environment: String,
    pub strategy: DeployStrategy,
    pub status: DeployStatus,
    pub image_tag: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub rollback_revision: Option<String>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeployStrategy {
    Rolling,
    Canary,
    BlueGreen,
    SlotSwap,       // Azure Functions
    TrafficShifting, // AWS Lambda
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeployStatus {
    Pending,
    InProgress,
    Succeeded,
    Failed,
    RolledBack,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct K8sManifest {
    pub deployment_yaml: String,
    pub service_yaml: String,
    pub argo_rollout_yaml: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerlessConfig {
    pub provider: String, // "azure_functions" | "aws_lambda"
    pub function_name: String,
    pub runtime: String,
    pub memory_mb: u32,
    pub timeout_secs: u32,
    pub environment_vars: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewEnvironment {
    pub id: String,
    pub project_id: String,
    pub branch: String,
    pub url: Option<String>,
    pub created_at: String,
    pub ttl_hours: u32,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FailoverConfig {
    pub primary_cloud: String,
    pub standby_cloud: String,
    pub replication_mode: String,
    pub traffic_manager: String,
    pub failover_threshold_secs: u32,
}

#[derive(Debug, thiserror::Error)]
pub enum DeployError {
    #[error("Deployment not found: {0}")]
    NotFound(String),
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
    #[error("Deployment failed: {0}")]
    Failed(String),
    #[error("Gate check failed: {0}")]
    GateFailed(String),
}

impl Serialize for DeployError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// ---------------------------------------------------------------------------
// Deployment Engine
// ---------------------------------------------------------------------------

pub struct DeploymentEngine {
    deployments: Mutex<Vec<DeploymentRecord>>,
    previews: Mutex<Vec<PreviewEnvironment>>,
}

impl DeploymentEngine {
    pub fn new() -> Self {
        Self {
            deployments: Mutex::new(Vec::new()),
            previews: Mutex::new(Vec::new()),
        }
    }

    /// Generate Kubernetes manifests for a deployment
    pub fn generate_k8s_manifests(
        &self,
        service: &str,
        image: &str,
        replicas: u32,
        port: u32,
        strategy: &DeployStrategy,
    ) -> K8sManifest {
        let deployment_yaml = format!(
            r#"apiVersion: apps/v1
kind: Deployment
metadata:
  name: {service}
  labels:
    app: {service}
    managed-by: nebula
spec:
  replicas: {replicas}
  selector:
    matchLabels:
      app: {service}
  template:
    metadata:
      labels:
        app: {service}
    spec:
      containers:
      - name: {service}
        image: {image}
        ports:
        - containerPort: {port}
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: {port}
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: {port}
          initialDelaySeconds: 5
          periodSeconds: 5
"#
        );

        let service_yaml = format!(
            r#"apiVersion: v1
kind: Service
metadata:
  name: {service}
  labels:
    app: {service}
    managed-by: nebula
spec:
  type: ClusterIP
  ports:
  - port: {port}
    targetPort: {port}
    protocol: TCP
  selector:
    app: {service}
"#
        );

        let argo_rollout_yaml = match strategy {
            DeployStrategy::Canary => Some(format!(
                r#"apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: {service}
spec:
  replicas: {replicas}
  selector:
    matchLabels:
      app: {service}
  template:
    metadata:
      labels:
        app: {service}
    spec:
      containers:
      - name: {service}
        image: {image}
        ports:
        - containerPort: {port}
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {{duration: 60}}
      - setWeight: 30
      - pause: {{duration: 60}}
      - setWeight: 60
      - pause: {{duration: 60}}
      - setWeight: 100
      canaryService: {service}-canary
      stableService: {service}-stable
      analysis:
        templates:
        - templateName: success-rate
        startingStep: 1
"#
            )),
            DeployStrategy::BlueGreen => Some(format!(
                r#"apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: {service}
spec:
  replicas: {replicas}
  selector:
    matchLabels:
      app: {service}
  template:
    metadata:
      labels:
        app: {service}
    spec:
      containers:
      - name: {service}
        image: {image}
        ports:
        - containerPort: {port}
  strategy:
    blueGreen:
      activeService: {service}-active
      previewService: {service}-preview
      autoPromotionEnabled: false
      prePromotionAnalysis:
        templates:
        - templateName: success-rate
"#
            )),
            _ => None,
        };

        K8sManifest {
            deployment_yaml,
            service_yaml,
            argo_rollout_yaml,
        }
    }

    /// Generate serverless configuration
    pub fn generate_serverless_config(
        &self,
        provider: &str,
        function_name: &str,
        runtime: &str,
    ) -> ServerlessConfig {
        ServerlessConfig {
            provider: provider.to_string(),
            function_name: function_name.to_string(),
            runtime: runtime.to_string(),
            memory_mb: 256,
            timeout_secs: 30,
            environment_vars: HashMap::new(),
        }
    }

    /// Create a new deployment record
    pub fn create_deployment(
        &self,
        project_id: &str,
        service: &str,
        environment: &str,
        strategy: DeployStrategy,
        image_tag: &str,
    ) -> DeploymentRecord {
        let record = DeploymentRecord {
            id: uuid::Uuid::new_v4().to_string(),
            project_id: project_id.to_string(),
            service: service.to_string(),
            environment: environment.to_string(),
            strategy,
            status: DeployStatus::Pending,
            image_tag: image_tag.to_string(),
            started_at: chrono::Utc::now().to_rfc3339(),
            completed_at: None,
            rollback_revision: None,
            metadata: HashMap::new(),
        };

        let mut deployments = self.deployments.lock().unwrap();
        deployments.push(record.clone());
        record
    }

    /// Update deployment status
    pub fn update_deployment_status(
        &self,
        deployment_id: &str,
        status: DeployStatus,
    ) -> Result<DeploymentRecord, DeployError> {
        let mut deployments = self.deployments.lock().unwrap();
        let deployment = deployments
            .iter_mut()
            .find(|d| d.id == deployment_id)
            .ok_or_else(|| DeployError::NotFound(deployment_id.into()))?;

        deployment.status = status;
        if matches!(
            deployment.status,
            DeployStatus::Succeeded | DeployStatus::Failed | DeployStatus::RolledBack
        ) {
            deployment.completed_at = Some(chrono::Utc::now().to_rfc3339());
        }

        Ok(deployment.clone())
    }

    /// Rollback a deployment
    pub fn rollback_deployment(
        &self,
        deployment_id: &str,
        target_revision: Option<String>,
    ) -> Result<DeploymentRecord, DeployError> {
        let mut deployments = self.deployments.lock().unwrap();
        let deployment = deployments
            .iter_mut()
            .find(|d| d.id == deployment_id)
            .ok_or_else(|| DeployError::NotFound(deployment_id.into()))?;

        deployment.status = DeployStatus::RolledBack;
        deployment.completed_at = Some(chrono::Utc::now().to_rfc3339());
        deployment.rollback_revision = target_revision;

        Ok(deployment.clone())
    }

    /// Get deployment by ID
    pub fn get_deployment(&self, deployment_id: &str) -> Option<DeploymentRecord> {
        let deployments = self.deployments.lock().unwrap();
        deployments.iter().find(|d| d.id == deployment_id).cloned()
    }

    /// List deployments for a project
    pub fn list_deployments(&self, project_id: &str) -> Vec<DeploymentRecord> {
        let deployments = self.deployments.lock().unwrap();
        deployments
            .iter()
            .filter(|d| d.project_id == project_id)
            .cloned()
            .collect()
    }

    /// Create a preview environment
    pub fn create_preview(
        &self,
        project_id: &str,
        branch: &str,
        ttl_hours: u32,
    ) -> PreviewEnvironment {
        let preview = PreviewEnvironment {
            id: uuid::Uuid::new_v4().to_string(),
            project_id: project_id.to_string(),
            branch: branch.to_string(),
            url: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            ttl_hours,
            status: "creating".into(),
        };

        let mut previews = self.previews.lock().unwrap();
        previews.push(preview.clone());
        preview
    }

    /// List preview environments
    pub fn list_previews(&self, project_id: &str) -> Vec<PreviewEnvironment> {
        let previews = self.previews.lock().unwrap();
        previews
            .iter()
            .filter(|p| p.project_id == project_id)
            .cloned()
            .collect()
    }

    /// Destroy a preview environment
    pub fn destroy_preview(&self, preview_id: &str) -> bool {
        let mut previews = self.previews.lock().unwrap();
        if let Some(p) = previews.iter_mut().find(|p| p.id == preview_id) {
            p.status = "destroyed".into();
            true
        } else {
            false
        }
    }

    /// Generate failover configuration
    pub fn generate_failover_config(&self) -> FailoverConfig {
        FailoverConfig {
            primary_cloud: "azure".into(),
            standby_cloud: "aws".into(),
            replication_mode: "logical".into(),
            traffic_manager: "azure_traffic_manager".into(),
            failover_threshold_secs: 300,
        }
    }

    /// Generate a failover drill runbook
    pub fn generate_failover_runbook(&self, service: &str) -> String {
        format!(
            r#"# Failover Drill Runbook — {service}

## Pre-Checks
1. Verify standby (AWS) health: `curl https://standby.{service}/health`
2. Check PostgreSQL replication lag: `SELECT pg_last_wal_replay_lsn();`
3. Verify Azure Traffic Manager is healthy
4. Notify on-call team

## Failover Steps
1. Set Azure Traffic Manager priority: AWS → Primary
2. Verify DNS propagation (TTL: 60s)
3. Confirm traffic routed to AWS
4. Monitor error rates for 5 minutes
5. If stable, proceed; if not, rollback

## Rollback
1. Set Azure Traffic Manager priority: Azure → Primary
2. Verify DNS propagation
3. Confirm traffic restored to Azure

## Post-Drill
1. Record drill results in audit log
2. Update runbook with any issues found
3. Reset Traffic Manager to normal priority
"#
        )
    }
}
