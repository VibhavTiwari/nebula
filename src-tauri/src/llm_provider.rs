use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<LlmMessage>,
    pub tools: Vec<ToolDefinition>,
    pub temperature: f64,
    pub max_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
    pub tool_calls: Vec<ToolCall>,
    pub model: String,
    pub usage: TokenUsage,
    pub finish_reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub provider: ProviderKind,
    pub api_key: String,
    pub base_url: Option<String>,
    pub default_model: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum ProviderKind {
    OpenAI,
    Anthropic,
    Google,
    Local,
}

#[derive(Debug, thiserror::Error)]
pub enum LlmError {
    #[error("Provider not configured: {0:?}")]
    ProviderNotConfigured(ProviderKind),
    #[error("No API key set for provider: {0:?}")]
    NoApiKey(ProviderKind),
    #[error("HTTP error: {0}")]
    Http(String),
    #[error("Parse error: {0}")]
    Parse(String),
    #[error("Provider error: {0}")]
    ProviderError(String),
}

impl Serialize for LlmError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// ---------------------------------------------------------------------------
// Provider trait
// ---------------------------------------------------------------------------

#[async_trait]
pub trait LlmProvider: Send + Sync {
    async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse, LlmError>;
    fn provider_kind(&self) -> ProviderKind;
}

// ---------------------------------------------------------------------------
// OpenAI Provider
// ---------------------------------------------------------------------------

pub struct OpenAIProvider {
    api_key: String,
    base_url: String,
    client: reqwest::Client,
}

impl OpenAIProvider {
    pub fn new(api_key: String, base_url: Option<String>) -> Self {
        Self {
            api_key,
            base_url: base_url.unwrap_or_else(|| "https://api.openai.com/v1".into()),
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl LlmProvider for OpenAIProvider {
    fn provider_kind(&self) -> ProviderKind {
        ProviderKind::OpenAI
    }

    async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse, LlmError> {
        let mut body = serde_json::json!({
            "model": request.model,
            "messages": request.messages.iter().map(|m| {
                serde_json::json!({ "role": m.role, "content": m.content })
            }).collect::<Vec<_>>(),
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        });

        if !request.tools.is_empty() {
            let tools: Vec<serde_json::Value> = request
                .tools
                .iter()
                .map(|t| {
                    serde_json::json!({
                        "type": "function",
                        "function": {
                            "name": t.name,
                            "description": t.description,
                            "parameters": t.parameters,
                        }
                    })
                })
                .collect();
            body["tools"] = serde_json::Value::Array(tools);
        }

        let resp = self
            .client
            .post(format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| LlmError::Http(e.to_string()))?;

        let status = resp.status();
        let text = resp.text().await.map_err(|e| LlmError::Http(e.to_string()))?;

        if !status.is_success() {
            return Err(LlmError::ProviderError(format!(
                "OpenAI API error {}: {}",
                status, text
            )));
        }

        let json: serde_json::Value =
            serde_json::from_str(&text).map_err(|e| LlmError::Parse(e.to_string()))?;

        let choice = &json["choices"][0];
        let message = &choice["message"];
        let content = message["content"].as_str().unwrap_or("").to_string();
        let finish_reason = choice["finish_reason"]
            .as_str()
            .unwrap_or("stop")
            .to_string();

        let mut tool_calls = Vec::new();
        if let Some(calls) = message["tool_calls"].as_array() {
            for call in calls {
                tool_calls.push(ToolCall {
                    id: call["id"].as_str().unwrap_or("").to_string(),
                    name: call["function"]["name"]
                        .as_str()
                        .unwrap_or("")
                        .to_string(),
                    arguments: serde_json::from_str(
                        call["function"]["arguments"].as_str().unwrap_or("{}"),
                    )
                    .unwrap_or(serde_json::json!({})),
                });
            }
        }

        let usage = TokenUsage {
            prompt_tokens: json["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32,
            completion_tokens: json["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32,
            total_tokens: json["usage"]["total_tokens"].as_u64().unwrap_or(0) as u32,
        };

        Ok(ChatResponse {
            content,
            tool_calls,
            model: request.model.clone(),
            usage,
            finish_reason,
        })
    }
}

// ---------------------------------------------------------------------------
// Anthropic Provider
// ---------------------------------------------------------------------------

pub struct AnthropicProvider {
    api_key: String,
    base_url: String,
    client: reqwest::Client,
}

impl AnthropicProvider {
    pub fn new(api_key: String, base_url: Option<String>) -> Self {
        Self {
            api_key,
            base_url: base_url.unwrap_or_else(|| "https://api.anthropic.com/v1".into()),
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl LlmProvider for AnthropicProvider {
    fn provider_kind(&self) -> ProviderKind {
        ProviderKind::Anthropic
    }

    async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse, LlmError> {
        // Extract system message
        let system_msg = request
            .messages
            .iter()
            .find(|m| m.role == "system")
            .map(|m| m.content.clone())
            .unwrap_or_default();

        let messages: Vec<serde_json::Value> = request
            .messages
            .iter()
            .filter(|m| m.role != "system")
            .map(|m| serde_json::json!({ "role": m.role, "content": m.content }))
            .collect();

        let mut body = serde_json::json!({
            "model": request.model,
            "messages": messages,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
        });

        if !system_msg.is_empty() {
            body["system"] = serde_json::Value::String(system_msg);
        }

        if !request.tools.is_empty() {
            let tools: Vec<serde_json::Value> = request
                .tools
                .iter()
                .map(|t| {
                    serde_json::json!({
                        "name": t.name,
                        "description": t.description,
                        "input_schema": t.parameters,
                    })
                })
                .collect();
            body["tools"] = serde_json::Value::Array(tools);
        }

        let resp = self
            .client
            .post(format!("{}/messages", self.base_url))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| LlmError::Http(e.to_string()))?;

        let status = resp.status();
        let text = resp.text().await.map_err(|e| LlmError::Http(e.to_string()))?;

        if !status.is_success() {
            return Err(LlmError::ProviderError(format!(
                "Anthropic API error {}: {}",
                status, text
            )));
        }

        let json: serde_json::Value =
            serde_json::from_str(&text).map_err(|e| LlmError::Parse(e.to_string()))?;

        let mut content = String::new();
        let mut tool_calls = Vec::new();

        if let Some(blocks) = json["content"].as_array() {
            for block in blocks {
                match block["type"].as_str() {
                    Some("text") => {
                        content.push_str(block["text"].as_str().unwrap_or(""));
                    }
                    Some("tool_use") => {
                        tool_calls.push(ToolCall {
                            id: block["id"].as_str().unwrap_or("").to_string(),
                            name: block["name"].as_str().unwrap_or("").to_string(),
                            arguments: block["input"].clone(),
                        });
                    }
                    _ => {}
                }
            }
        }

        let finish_reason = json["stop_reason"]
            .as_str()
            .unwrap_or("end_turn")
            .to_string();

        let usage = TokenUsage {
            prompt_tokens: json["usage"]["input_tokens"].as_u64().unwrap_or(0) as u32,
            completion_tokens: json["usage"]["output_tokens"].as_u64().unwrap_or(0) as u32,
            total_tokens: (json["usage"]["input_tokens"].as_u64().unwrap_or(0)
                + json["usage"]["output_tokens"].as_u64().unwrap_or(0)) as u32,
        };

        Ok(ChatResponse {
            content,
            tool_calls,
            model: request.model.clone(),
            usage,
            finish_reason,
        })
    }
}

// ---------------------------------------------------------------------------
// Google (Gemini) Provider
// ---------------------------------------------------------------------------

pub struct GoogleProvider {
    api_key: String,
    base_url: String,
    client: reqwest::Client,
}

impl GoogleProvider {
    pub fn new(api_key: String, base_url: Option<String>) -> Self {
        Self {
            api_key,
            base_url: base_url
                .unwrap_or_else(|| "https://generativelanguage.googleapis.com/v1beta".into()),
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl LlmProvider for GoogleProvider {
    fn provider_kind(&self) -> ProviderKind {
        ProviderKind::Google
    }

    async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse, LlmError> {
        let contents: Vec<serde_json::Value> = request
            .messages
            .iter()
            .filter(|m| m.role != "system")
            .map(|m| {
                let role = if m.role == "assistant" { "model" } else { "user" };
                serde_json::json!({
                    "role": role,
                    "parts": [{ "text": m.content }]
                })
            })
            .collect();

        let mut body = serde_json::json!({
            "contents": contents,
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.max_tokens,
            }
        });

        // System instruction
        if let Some(sys) = request.messages.iter().find(|m| m.role == "system") {
            body["systemInstruction"] = serde_json::json!({
                "parts": [{ "text": sys.content }]
            });
        }

        if !request.tools.is_empty() {
            let declarations: Vec<serde_json::Value> = request
                .tools
                .iter()
                .map(|t| {
                    serde_json::json!({
                        "name": t.name,
                        "description": t.description,
                        "parameters": t.parameters,
                    })
                })
                .collect();
            body["tools"] = serde_json::json!([{
                "functionDeclarations": declarations
            }]);
        }

        let url = format!(
            "{}/models/{}:generateContent?key={}",
            self.base_url, request.model, self.api_key
        );

        let resp = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| LlmError::Http(e.to_string()))?;

        let status = resp.status();
        let text = resp.text().await.map_err(|e| LlmError::Http(e.to_string()))?;

        if !status.is_success() {
            return Err(LlmError::ProviderError(format!(
                "Google API error {}: {}",
                status, text
            )));
        }

        let json: serde_json::Value =
            serde_json::from_str(&text).map_err(|e| LlmError::Parse(e.to_string()))?;

        let candidate = &json["candidates"][0];
        let parts = candidate["content"]["parts"].as_array();

        let mut content = String::new();
        let mut tool_calls = Vec::new();

        if let Some(parts) = parts {
            for part in parts {
                if let Some(text) = part["text"].as_str() {
                    content.push_str(text);
                }
                if let Some(fc) = part.get("functionCall") {
                    tool_calls.push(ToolCall {
                        id: uuid::Uuid::new_v4().to_string(),
                        name: fc["name"].as_str().unwrap_or("").to_string(),
                        arguments: fc["args"].clone(),
                    });
                }
            }
        }

        let finish_reason = candidate["finishReason"]
            .as_str()
            .unwrap_or("STOP")
            .to_string();

        let usage = TokenUsage {
            prompt_tokens: json["usageMetadata"]["promptTokenCount"]
                .as_u64()
                .unwrap_or(0) as u32,
            completion_tokens: json["usageMetadata"]["candidatesTokenCount"]
                .as_u64()
                .unwrap_or(0) as u32,
            total_tokens: json["usageMetadata"]["totalTokenCount"]
                .as_u64()
                .unwrap_or(0) as u32,
        };

        Ok(ChatResponse {
            content,
            tool_calls,
            model: request.model.clone(),
            usage,
            finish_reason,
        })
    }
}

// ---------------------------------------------------------------------------
// Provider Manager — manages all configured providers
// ---------------------------------------------------------------------------

pub struct LlmProviderManager {
    configs: Mutex<HashMap<ProviderKind, ProviderConfig>>,
    client: reqwest::Client,
}

impl LlmProviderManager {
    pub fn new() -> Self {
        Self {
            configs: Mutex::new(HashMap::new()),
            client: reqwest::Client::new(),
        }
    }

    pub fn configure_provider(&self, config: ProviderConfig) {
        let mut configs = self.configs.lock().unwrap();
        configs.insert(config.provider.clone(), config);
    }

    pub fn get_provider_config(&self, kind: &ProviderKind) -> Option<ProviderConfig> {
        let configs = self.configs.lock().unwrap();
        configs.get(kind).cloned()
    }

    pub fn list_providers(&self) -> Vec<ProviderConfig> {
        let configs = self.configs.lock().unwrap();
        configs.values().cloned().collect()
    }

    pub fn remove_provider(&self, kind: &ProviderKind) {
        let mut configs = self.configs.lock().unwrap();
        configs.remove(kind);
    }

    fn build_provider(&self, kind: &ProviderKind) -> Result<Box<dyn LlmProvider>, LlmError> {
        let configs = self.configs.lock().unwrap();
        let config = configs
            .get(kind)
            .ok_or_else(|| LlmError::ProviderNotConfigured(kind.clone()))?;

        if config.api_key.is_empty() {
            return Err(LlmError::NoApiKey(kind.clone()));
        }

        let provider: Box<dyn LlmProvider> = match kind {
            ProviderKind::OpenAI | ProviderKind::Local => Box::new(OpenAIProvider::new(
                config.api_key.clone(),
                config.base_url.clone(),
            )),
            ProviderKind::Anthropic => Box::new(AnthropicProvider::new(
                config.api_key.clone(),
                config.base_url.clone(),
            )),
            ProviderKind::Google => Box::new(GoogleProvider::new(
                config.api_key.clone(),
                config.base_url.clone(),
            )),
        };

        Ok(provider)
    }

    /// Send a chat completion using the specified provider
    pub async fn chat(
        &self,
        provider_kind: &ProviderKind,
        request: &ChatRequest,
    ) -> Result<ChatResponse, LlmError> {
        let provider = self.build_provider(provider_kind)?;
        provider.chat(request).await
    }

    /// Send a chat completion using the default provider
    pub async fn chat_default(&self, request: &ChatRequest) -> Result<ChatResponse, LlmError> {
        let configs = self.configs.lock().unwrap();
        let kind = configs
            .iter()
            .find(|(_, c)| c.enabled)
            .map(|(k, _)| k.clone())
            .ok_or(LlmError::ProviderNotConfigured(ProviderKind::OpenAI))?;
        drop(configs);
        self.chat(&kind, request).await
    }
}
