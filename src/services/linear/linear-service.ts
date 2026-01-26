/**
 * Linear Integration Service
 *
 * Manages integration with Linear for issue tracking.
 * Uses Linear GraphQL API and webhooks.
 */

import type { LinearIssue, LinearEpic } from "@/types/integration";

const LINEAR_API_URL = "https://api.linear.app/graphql";

export class LinearService {
  private apiKey: string;
  private teamId: string;

  constructor(apiKey: string, teamId: string) {
    this.apiKey = apiKey;
    this.teamId = teamId;
  }

  /**
   * Execute a GraphQL query against the Linear API
   */
  private async query<T>(
    gqlQuery: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiKey,
      },
      body: JSON.stringify({ query: gqlQuery, variables }),
    });

    if (!response.ok) {
      throw new Error(`Linear API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(`Linear GraphQL error: ${json.errors[0].message}`);
    }

    return json.data;
  }

  /**
   * Create a Linear issue for a workstream task
   */
  async createIssue(params: {
    title: string;
    description: string;
    priority?: number;
    labels?: string[];
    parentId?: string;
  }): Promise<LinearIssue> {
    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            state { name }
            priority
            url
            createdAt
            updatedAt
          }
        }
      }
    `;

    const result = await this.query<{
      issueCreate: {
        success: boolean;
        issue: {
          id: string;
          identifier: string;
          title: string;
          description: string;
          state: { name: string };
          priority: number;
          url: string;
          createdAt: string;
          updatedAt: string;
        };
      };
    }>(mutation, {
      input: {
        teamId: this.teamId,
        title: params.title,
        description: params.description,
        priority: params.priority || 3,
        parentId: params.parentId,
      },
    });

    const issue = result.issueCreate.issue;
    return {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description || "",
      status: issue.state.name,
      priority: issue.priority,
      labels: [],
      url: issue.url,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    };
  }

  /**
   * Update issue status
   */
  async updateIssueStatus(issueId: string, stateId: string): Promise<void> {
    const mutation = `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
        }
      }
    `;

    await this.query(mutation, {
      id: issueId,
      input: { stateId },
    });
  }

  /**
   * Add a comment to an issue
   */
  async addComment(issueId: string, body: string): Promise<void> {
    const mutation = `
      mutation CreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
        }
      }
    `;

    await this.query(mutation, {
      input: { issueId, body },
    });
  }

  /**
   * Get issues for the team
   */
  async getIssues(filter?: {
    stateNames?: string[];
    limit?: number;
  }): Promise<LinearIssue[]> {
    const query = `
      query Issues($teamId: String!, $first: Int) {
        team(id: $teamId) {
          issues(first: $first) {
            nodes {
              id
              identifier
              title
              description
              state { name }
              priority
              url
              createdAt
              updatedAt
              labels { nodes { name } }
              assignee { name }
            }
          }
        }
      }
    `;

    const result = await this.query<{
      team: {
        issues: {
          nodes: Array<{
            id: string;
            identifier: string;
            title: string;
            description: string;
            state: { name: string };
            priority: number;
            url: string;
            createdAt: string;
            updatedAt: string;
            labels: { nodes: Array<{ name: string }> };
            assignee: { name: string } | null;
          }>;
        };
      };
    }>(query, {
      teamId: this.teamId,
      first: filter?.limit || 50,
    });

    return result.team.issues.nodes.map((issue) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description || "",
      status: issue.state.name,
      priority: issue.priority,
      assignee: issue.assignee?.name,
      labels: issue.labels.nodes.map((l) => l.name),
      url: issue.url,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    }));
  }

  /**
   * Create an epic for a workstream
   */
  async createEpic(name: string, description: string): Promise<string> {
    // Linear uses "Projects" as the equivalent of epics
    const mutation = `
      mutation CreateProject($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          success
          project {
            id
            name
            url
          }
        }
      }
    `;

    const result = await this.query<{
      projectCreate: {
        success: boolean;
        project: { id: string; name: string; url: string };
      };
    }>(mutation, {
      input: {
        name,
        description,
        teamIds: [this.teamId],
      },
    });

    return result.projectCreate.project.id;
  }
}
