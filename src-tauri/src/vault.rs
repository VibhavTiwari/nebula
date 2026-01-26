use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Vault manager — handles reading/writing to the Obsidian vault.
/// Enforces template compliance for Level 0/1/2 notes.
pub struct VaultManager {
    vault_paths: Mutex<HashMap<String, PathBuf>>,
}

impl VaultManager {
    pub fn new() -> Self {
        Self {
            vault_paths: Mutex::new(HashMap::new()),
        }
    }

    /// Register a project's vault path
    pub fn register_vault(&self, project_id: &str, vault_path: PathBuf) {
        let mut paths = self.vault_paths.lock().unwrap();
        paths.insert(project_id.to_string(), vault_path);
    }

    /// Read a note from the vault
    pub fn read_note(&self, project_id: &str, note_path: &str) -> Result<VaultNote, VaultError> {
        let paths = self.vault_paths.lock().unwrap();
        let vault_path = paths
            .get(project_id)
            .ok_or(VaultError::VaultNotFound(project_id.to_string()))?;

        let full_path = vault_path.join(note_path);
        if !full_path.exists() {
            return Err(VaultError::NoteNotFound(note_path.to_string()));
        }

        let content =
            std::fs::read_to_string(&full_path).map_err(|e| VaultError::IoError(e.to_string()))?;

        let (frontmatter, body) = parse_frontmatter(&content);

        Ok(VaultNote {
            path: note_path.to_string(),
            name: full_path
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            content: body,
            frontmatter,
            last_modified: std::fs::metadata(&full_path)
                .ok()
                .and_then(|m| m.modified().ok())
                .map(|t| {
                    chrono::DateTime::<chrono::Utc>::from(t)
                        .to_rfc3339()
                })
                .unwrap_or_default(),
        })
    }

    /// Write a note to the vault
    pub fn write_note(
        &self,
        project_id: &str,
        note_path: &str,
        frontmatter: &HashMap<String, serde_json::Value>,
        content: &str,
    ) -> Result<(), VaultError> {
        let paths = self.vault_paths.lock().unwrap();
        let vault_path = paths
            .get(project_id)
            .ok_or(VaultError::VaultNotFound(project_id.to_string()))?;

        let full_path = vault_path.join(note_path);

        // Ensure parent directory exists
        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| VaultError::IoError(e.to_string()))?;
        }

        // Build frontmatter YAML
        let fm_yaml =
            serde_json::to_string_pretty(frontmatter).unwrap_or_else(|_| "{}".to_string());
        let full_content = format!("---\n{}\n---\n\n{}", fm_yaml, content);

        std::fs::write(&full_path, full_content).map_err(|e| VaultError::IoError(e.to_string()))?;

        Ok(())
    }

    /// List all notes in a vault directory
    pub fn list_notes(
        &self,
        project_id: &str,
        directory: &str,
    ) -> Result<Vec<VaultNoteEntry>, VaultError> {
        let paths = self.vault_paths.lock().unwrap();
        let vault_path = paths
            .get(project_id)
            .ok_or(VaultError::VaultNotFound(project_id.to_string()))?;

        let dir_path = vault_path.join(directory);
        if !dir_path.exists() {
            return Ok(Vec::new());
        }

        let mut entries = Vec::new();
        Self::collect_notes(&dir_path, &vault_path, &mut entries)?;

        Ok(entries)
    }

    fn collect_notes(
        dir: &Path,
        vault_root: &Path,
        entries: &mut Vec<VaultNoteEntry>,
    ) -> Result<(), VaultError> {
        let read_dir =
            std::fs::read_dir(dir).map_err(|e| VaultError::IoError(e.to_string()))?;

        for entry in read_dir {
            let entry = entry.map_err(|e| VaultError::IoError(e.to_string()))?;
            let path = entry.path();

            if path.is_dir() {
                Self::collect_notes(&path, vault_root, entries)?;
            } else if path.extension().map_or(false, |ext| ext == "md") {
                let relative = path
                    .strip_prefix(vault_root)
                    .unwrap_or(&path)
                    .to_string_lossy()
                    .to_string();

                entries.push(VaultNoteEntry {
                    path: relative,
                    name: path
                        .file_stem()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string(),
                    last_modified: std::fs::metadata(&path)
                        .ok()
                        .and_then(|m| m.modified().ok())
                        .map(|t| {
                            chrono::DateTime::<chrono::Utc>::from(t)
                                .to_rfc3339()
                        })
                        .unwrap_or_default(),
                });
            }
        }

        Ok(())
    }

    /// Build an Obsidian deep link URL
    pub fn build_deep_link(&self, vault_name: &str, note_path: &str) -> String {
        let encoded_vault = urlencoding::encode(vault_name);
        let encoded_file = urlencoding::encode(note_path);
        format!(
            "obsidian://open?vault={}&file={}",
            encoded_vault, encoded_file
        )
    }
}

fn parse_frontmatter(content: &str) -> (HashMap<String, serde_json::Value>, String) {
    if content.starts_with("---") {
        if let Some(end) = content[3..].find("---") {
            let fm_str = &content[3..end + 3];
            let body = &content[end + 6..];

            // Parse as JSON (simplified — production would use YAML parser)
            let frontmatter: HashMap<String, serde_json::Value> =
                serde_json::from_str(fm_str).unwrap_or_default();

            return (frontmatter, body.trim().to_string());
        }
    }
    (HashMap::new(), content.to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultNote {
    pub path: String,
    pub name: String,
    pub content: String,
    pub frontmatter: HashMap<String, serde_json::Value>,
    pub last_modified: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultNoteEntry {
    pub path: String,
    pub name: String,
    pub last_modified: String,
}

#[derive(Debug, thiserror::Error)]
pub enum VaultError {
    #[error("Vault not found for project: {0}")]
    VaultNotFound(String),
    #[error("Note not found: {0}")]
    NoteNotFound(String),
    #[error("IO error: {0}")]
    IoError(String),
}

impl Serialize for VaultError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
