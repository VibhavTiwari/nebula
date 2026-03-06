use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Mutex;
use tokio::process::Command;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitLogEntry {
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub date: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String, // "modified", "added", "deleted", "untracked", "renamed"
    pub staged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitBranchInfo {
    pub name: String,
    pub current: bool,
    pub remote: Option<String>,
    pub ahead: u32,
    pub behind: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitDiffEntry {
    pub path: String,
    pub additions: u32,
    pub deletions: u32,
    pub diff_text: String,
}

#[derive(Debug, thiserror::Error)]
pub enum GitError {
    #[error("Not a git repository: {0}")]
    NotARepo(String),
    #[error("Git command failed: {0}")]
    CommandFailed(String),
    #[error("IO error: {0}")]
    IoError(String),
    #[error("Parse error: {0}")]
    ParseError(String),
}

impl Serialize for GitError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// ---------------------------------------------------------------------------
// Git Operations Engine
// ---------------------------------------------------------------------------

pub struct GitOpsEngine {
    /// Maps project_id -> repo path
    repos: Mutex<std::collections::HashMap<String, PathBuf>>,
}

impl GitOpsEngine {
    pub fn new() -> Self {
        Self {
            repos: Mutex::new(std::collections::HashMap::new()),
        }
    }

    pub fn register_repo(&self, project_id: &str, path: PathBuf) {
        let mut repos = self.repos.lock().unwrap();
        repos.insert(project_id.to_string(), path);
    }

    pub fn get_repo_path(&self, project_id: &str) -> Option<PathBuf> {
        let repos = self.repos.lock().unwrap();
        repos.get(project_id).cloned()
    }

    async fn run_git(
        &self,
        repo_path: &Path,
        args: &[&str],
    ) -> Result<GitResult, GitError> {
        let output = Command::new("git")
            .args(args)
            .current_dir(repo_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| GitError::IoError(e.to_string()))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let exit_code = output.status.code().unwrap_or(-1);

        Ok(GitResult {
            success: output.status.success(),
            stdout,
            stderr,
            exit_code,
        })
    }

    /// Initialize a new git repository
    pub async fn init(&self, path: &Path) -> Result<GitResult, GitError> {
        self.run_git(path, &["init"]).await
    }

    /// Clone a repository
    pub async fn clone_repo(
        &self,
        url: &str,
        target_path: &Path,
    ) -> Result<GitResult, GitError> {
        let parent = target_path.parent().ok_or_else(|| {
            GitError::IoError("Invalid target path".into())
        })?;
        let dir_name = target_path
            .file_name()
            .ok_or_else(|| GitError::IoError("Invalid target path".into()))?
            .to_string_lossy();

        let output = Command::new("git")
            .args(["clone", url, &dir_name])
            .current_dir(parent)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| GitError::IoError(e.to_string()))?;

        Ok(GitResult {
            success: output.status.success(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code().unwrap_or(-1),
        })
    }

    /// Create a new branch
    pub async fn create_branch(
        &self,
        project_id: &str,
        branch_name: &str,
        from_ref: Option<&str>,
    ) -> Result<GitResult, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;

        let mut args = vec!["checkout", "-b", branch_name];
        if let Some(r) = from_ref {
            args.push(r);
        }
        self.run_git(&path, &args).await
    }

    /// Checkout a branch
    pub async fn checkout(
        &self,
        project_id: &str,
        branch_name: &str,
    ) -> Result<GitResult, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;
        self.run_git(&path, &["checkout", branch_name]).await
    }

    /// Get current branch name
    pub async fn current_branch(&self, project_id: &str) -> Result<String, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;
        let result = self
            .run_git(&path, &["rev-parse", "--abbrev-ref", "HEAD"])
            .await?;
        Ok(result.stdout.trim().to_string())
    }

    /// List branches
    pub async fn list_branches(
        &self,
        project_id: &str,
    ) -> Result<Vec<GitBranchInfo>, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;

        let result = self
            .run_git(&path, &["branch", "-vv", "--no-color"])
            .await?;

        let mut branches = Vec::new();
        for line in result.stdout.lines() {
            let current = line.starts_with('*');
            let trimmed = line.trim_start_matches('*').trim();
            let parts: Vec<&str> = trimmed.splitn(2, char::is_whitespace).collect();
            if let Some(name) = parts.first() {
                branches.push(GitBranchInfo {
                    name: name.to_string(),
                    current,
                    remote: None,
                    ahead: 0,
                    behind: 0,
                });
            }
        }

        Ok(branches)
    }

    /// Stage files
    pub async fn stage(
        &self,
        project_id: &str,
        files: &[&str],
    ) -> Result<GitResult, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;

        let mut args = vec!["add"];
        args.extend_from_slice(files);
        self.run_git(&path, &args).await
    }

    /// Commit staged changes
    pub async fn commit(
        &self,
        project_id: &str,
        message: &str,
    ) -> Result<GitResult, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;
        self.run_git(&path, &["commit", "-m", message]).await
    }

    /// Push to remote
    pub async fn push(
        &self,
        project_id: &str,
        remote: &str,
        branch: &str,
    ) -> Result<GitResult, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;
        self.run_git(&path, &["push", remote, branch]).await
    }

    /// Get file status
    pub async fn status(
        &self,
        project_id: &str,
    ) -> Result<Vec<GitFileStatus>, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;

        let result = self
            .run_git(&path, &["status", "--porcelain=v1"])
            .await?;

        let mut statuses = Vec::new();
        for line in result.stdout.lines() {
            if line.len() < 4 {
                continue;
            }
            let index_status = &line[0..1];
            let worktree_status = &line[1..2];
            let file_path = line[3..].to_string();

            let (status, staged) = match (index_status, worktree_status) {
                ("M", _) => ("modified", true),
                (_, "M") => ("modified", false),
                ("A", _) => ("added", true),
                ("D", _) => ("deleted", true),
                (_, "D") => ("deleted", false),
                ("R", _) => ("renamed", true),
                ("?", "?") => ("untracked", false),
                _ => ("unknown", false),
            };

            statuses.push(GitFileStatus {
                path: file_path,
                status: status.to_string(),
                staged,
            });
        }

        Ok(statuses)
    }

    /// Get diff
    pub async fn diff(
        &self,
        project_id: &str,
        staged: bool,
    ) -> Result<String, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;

        let args = if staged {
            vec!["diff", "--staged"]
        } else {
            vec!["diff"]
        };
        let result = self.run_git(&path, &args).await?;
        Ok(result.stdout)
    }

    /// Get diff between two refs
    pub async fn diff_refs(
        &self,
        project_id: &str,
        from_ref: &str,
        to_ref: &str,
    ) -> Result<String, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;
        let result = self
            .run_git(&path, &["diff", from_ref, to_ref])
            .await?;
        Ok(result.stdout)
    }

    /// Get log
    pub async fn log(
        &self,
        project_id: &str,
        limit: u32,
    ) -> Result<Vec<GitLogEntry>, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;

        let limit_str = format!("-{}", limit);
        let result = self
            .run_git(
                &path,
                &[
                    "log",
                    &limit_str,
                    "--pretty=format:%H|%h|%an|%ai|%s",
                ],
            )
            .await?;

        let mut entries = Vec::new();
        for line in result.stdout.lines() {
            let parts: Vec<&str> = line.splitn(5, '|').collect();
            if parts.len() == 5 {
                entries.push(GitLogEntry {
                    hash: parts[0].to_string(),
                    short_hash: parts[1].to_string(),
                    author: parts[2].to_string(),
                    date: parts[3].to_string(),
                    message: parts[4].to_string(),
                });
            }
        }

        Ok(entries)
    }

    /// Merge a branch
    pub async fn merge(
        &self,
        project_id: &str,
        source_branch: &str,
    ) -> Result<GitResult, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;
        self.run_git(&path, &["merge", source_branch]).await
    }

    /// Revert a commit
    pub async fn revert(
        &self,
        project_id: &str,
        commit_hash: &str,
    ) -> Result<GitResult, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;
        self.run_git(&path, &["revert", "--no-edit", commit_hash])
            .await
    }

    /// Read file at a specific ref
    pub async fn read_file_at_ref(
        &self,
        project_id: &str,
        file_path: &str,
        git_ref: &str,
    ) -> Result<String, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;

        let spec = format!("{}:{}", git_ref, file_path);
        let result = self.run_git(&path, &["show", &spec]).await?;
        if result.success {
            Ok(result.stdout)
        } else {
            Err(GitError::CommandFailed(result.stderr))
        }
    }

    /// Write a file to disk (not a git command, but needed for agent workflows)
    pub async fn write_file(
        &self,
        project_id: &str,
        file_path: &str,
        content: &str,
    ) -> Result<(), GitError> {
        let repo_path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;

        let full_path = repo_path.join(file_path);
        if let Some(parent) = full_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| GitError::IoError(e.to_string()))?;
        }

        tokio::fs::write(&full_path, content)
            .await
            .map_err(|e| GitError::IoError(e.to_string()))?;

        Ok(())
    }

    /// Read a file from disk
    pub async fn read_file(
        &self,
        project_id: &str,
        file_path: &str,
    ) -> Result<String, GitError> {
        let repo_path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;

        let full_path = repo_path.join(file_path);
        tokio::fs::read_to_string(&full_path)
            .await
            .map_err(|e| GitError::IoError(e.to_string()))
    }

    /// Run an arbitrary shell command in the repo directory
    pub async fn run_command(
        &self,
        project_id: &str,
        command: &str,
        timeout_secs: u64,
    ) -> Result<GitResult, GitError> {
        let repo_path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;

        let output = tokio::time::timeout(
            std::time::Duration::from_secs(timeout_secs),
            Command::new("sh")
                .args(["-c", command])
                .current_dir(&repo_path)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output(),
        )
        .await
        .map_err(|_| GitError::CommandFailed("Command timed out".into()))?
        .map_err(|e| GitError::IoError(e.to_string()))?;

        Ok(GitResult {
            success: output.status.success(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code().unwrap_or(-1),
        })
    }

    /// Get blame for a file
    pub async fn blame(
        &self,
        project_id: &str,
        file_path: &str,
    ) -> Result<String, GitError> {
        let path = self
            .get_repo_path(project_id)
            .ok_or_else(|| GitError::NotARepo(project_id.into()))?;
        let result = self.run_git(&path, &["blame", file_path]).await?;
        Ok(result.stdout)
    }
}
