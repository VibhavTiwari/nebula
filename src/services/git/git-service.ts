/**
 * Git Service — Phase 4
 *
 * Handles all repository operations: branches, commits, diffs, merges.
 * Polyrepo-first approach with policy-gated writes.
 */

export class GitService {
  /**
   * Execute a git command via Tauri shell
   */
  private async exec(args: string[], cwd: string): Promise<GitResult> {
    const { Command } = await import("@tauri-apps/plugin-shell");
    const command = Command.create("git", args, { cwd });
    const output = await command.execute();

    return {
      success: output.code === 0,
      stdout: output.stdout,
      stderr: output.stderr,
      code: output.code || 0,
    };
  }

  /**
   * Initialize a new repository
   */
  async init(path: string): Promise<GitResult> {
    return this.exec(["init"], path);
  }

  /**
   * Clone a repository
   */
  async clone(url: string, path: string): Promise<GitResult> {
    const parentDir = path.substring(0, path.lastIndexOf("/"));
    const dirName = path.substring(path.lastIndexOf("/") + 1);
    return this.exec(["clone", url, dirName], parentDir);
  }

  /**
   * Create a new branch
   */
  async createBranch(
    repoPath: string,
    branchName: string,
    baseBranch: string = "main"
  ): Promise<GitResult> {
    await this.exec(["checkout", baseBranch], repoPath);
    await this.exec(["pull", "origin", baseBranch], repoPath);
    return this.exec(["checkout", "-b", branchName], repoPath);
  }

  /**
   * Checkout an existing branch
   */
  async checkout(repoPath: string, branchName: string): Promise<GitResult> {
    return this.exec(["checkout", branchName], repoPath);
  }

  /**
   * Stage files
   */
  async add(repoPath: string, files: string[]): Promise<GitResult> {
    return this.exec(["add", ...files], repoPath);
  }

  /**
   * Commit staged changes
   */
  async commit(repoPath: string, message: string): Promise<GitResult> {
    return this.exec(["commit", "-m", message], repoPath);
  }

  /**
   * Push to remote
   */
  async push(
    repoPath: string,
    remote: string = "origin",
    branch?: string
  ): Promise<GitResult> {
    const args = ["push", remote];
    if (branch) args.push(branch);
    return this.exec(args, repoPath);
  }

  /**
   * Get diff between two refs
   */
  async diff(
    repoPath: string,
    from: string,
    to: string = "HEAD"
  ): Promise<GitResult> {
    return this.exec(["diff", from, to], repoPath);
  }

  /**
   * Get diff of staged changes
   */
  async diffStaged(repoPath: string): Promise<GitResult> {
    return this.exec(["diff", "--staged"], repoPath);
  }

  /**
   * Get file status
   */
  async status(repoPath: string): Promise<GitResult> {
    return this.exec(["status", "--porcelain"], repoPath);
  }

  /**
   * Get log
   */
  async log(
    repoPath: string,
    limit: number = 20,
    format: string = "%H|%s|%an|%ai"
  ): Promise<GitLogEntry[]> {
    const result = await this.exec(
      ["log", `--format=${format}`, `-${limit}`],
      repoPath
    );

    if (!result.success) return [];

    return result.stdout
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [hash, subject, author, date] = line.split("|");
        return { hash, subject, author, date };
      });
  }

  /**
   * Merge branch to target
   */
  async merge(
    repoPath: string,
    sourceBranch: string,
    targetBranch: string = "main"
  ): Promise<GitResult> {
    await this.exec(["checkout", targetBranch], repoPath);
    return this.exec(["merge", sourceBranch, "--no-ff"], repoPath);
  }

  /**
   * Read file contents at a specific ref
   */
  async showFile(
    repoPath: string,
    filePath: string,
    ref: string = "HEAD"
  ): Promise<string> {
    const result = await this.exec(["show", `${ref}:${filePath}`], repoPath);
    return result.stdout;
  }

  /**
   * List files in the repository
   */
  async listFiles(repoPath: string, ref: string = "HEAD"): Promise<string[]> {
    const result = await this.exec(["ls-tree", "-r", "--name-only", ref], repoPath);
    return result.stdout.split("\n").filter((f) => f.trim());
  }

  /**
   * Get blame for a file
   */
  async blame(repoPath: string, filePath: string): Promise<GitResult> {
    return this.exec(["blame", "--porcelain", filePath], repoPath);
  }

  /**
   * Create a rollback commit (revert)
   */
  async revert(repoPath: string, commitHash: string): Promise<GitResult> {
    return this.exec(["revert", "--no-edit", commitHash], repoPath);
  }

  /**
   * Get current branch name
   */
  async currentBranch(repoPath: string): Promise<string> {
    const result = await this.exec(
      ["rev-parse", "--abbrev-ref", "HEAD"],
      repoPath
    );
    return result.stdout.trim();
  }

  /**
   * Write a file and stage it
   */
  async writeAndStage(
    repoPath: string,
    filePath: string,
    content: string
  ): Promise<void> {
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const fullPath = `${repoPath}/${filePath}`;
    await writeTextFile(fullPath, content);
    await this.add(repoPath, [filePath]);
  }
}

export interface GitResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number;
}

export interface GitLogEntry {
  hash: string;
  subject: string;
  author: string;
  date: string;
}
