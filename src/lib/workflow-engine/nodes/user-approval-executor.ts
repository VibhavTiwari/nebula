/**
 * User Approval Node Executor
 *
 * Pauses workflow execution and waits for user approval.
 * Can be resumed with approval or rejection.
 */

import {
  ExecutionContextInterface,
  NodeDefinition,
  NodeExecutionResult,
  NodeExecutor,
  UserApprovalNodeConfig,
  ValidationError,
  ValidationResult,
} from '../types';

export interface ApprovalState {
  nodeId: string;
  message: string;
  approveLabel: string;
  rejectLabel: string;
  requestedAt: number;
  timeout?: number;
  status: 'waiting' | 'approved' | 'rejected' | 'timed_out';
  resolvedAt?: number;
  resolvedBy?: string;
}

export class UserApprovalExecutor implements NodeExecutor<UserApprovalNodeConfig> {
  readonly nodeType = 'user-approval' as const;

  // Store for pending approvals - in a real implementation, this would be persistent
  private static pendingApprovals: Map<string, ApprovalState> = new Map();

  async execute(
    node: NodeDefinition,
    context: ExecutionContextInterface,
    config: UserApprovalNodeConfig
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeId = node.id;

    context.log('info', `Executing user-approval node: ${node.label ?? nodeId}`, {
      message: config.message,
      timeout: config.timeout,
    });

    // Interpolate variables in the message
    const interpolatedMessage = this.interpolateMessage(config.message, context);

    const inputs = {
      message: interpolatedMessage,
      approveLabel: config.approveLabel ?? 'Approve',
      rejectLabel: config.rejectLabel ?? 'Reject',
      timeout: config.timeout,
    };

    try {
      // Check if there's already a pending approval for this node
      const existingApproval = UserApprovalExecutor.pendingApprovals.get(nodeId);

      if (existingApproval) {
        // Check if approval has been resolved
        if (existingApproval.status === 'approved') {
          context.log('info', 'User approved the request');

          // Clean up
          UserApprovalExecutor.pendingApprovals.delete(nodeId);

          // Set approval result in context
          context.setVariable('_approvalResult', 'approved');
          context.setOutput('approved', true);

          return {
            nodeId,
            nodeType: 'user-approval',
            status: 'completed',
            inputs,
            outputs: {
              approved: true,
              status: 'approved',
              resolvedAt: existingApproval.resolvedAt,
            },
            startTime,
            endTime: Date.now(),
          };
        }

        if (existingApproval.status === 'rejected') {
          context.log('info', 'User rejected the request');

          // Clean up
          UserApprovalExecutor.pendingApprovals.delete(nodeId);

          // Set approval result in context
          context.setVariable('_approvalResult', 'rejected');
          context.setOutput('approved', false);

          return {
            nodeId,
            nodeType: 'user-approval',
            status: 'completed',
            inputs,
            outputs: {
              approved: false,
              status: 'rejected',
              resolvedAt: existingApproval.resolvedAt,
            },
            startTime,
            endTime: Date.now(),
          };
        }

        // Check for timeout
        if (existingApproval.timeout) {
          const elapsed = Date.now() - existingApproval.requestedAt;
          if (elapsed >= existingApproval.timeout) {
            context.log('warn', 'Approval request timed out');

            // Handle timeout action
            const timeoutAction = config.timeoutAction ?? 'fail';
            UserApprovalExecutor.pendingApprovals.delete(nodeId);

            if (timeoutAction === 'approve') {
              context.setVariable('_approvalResult', 'approved');
              context.setOutput('approved', true);

              return {
                nodeId,
                nodeType: 'user-approval',
                status: 'completed',
                inputs,
                outputs: {
                  approved: true,
                  status: 'timed_out_approved',
                  reason: 'timeout',
                },
                startTime,
                endTime: Date.now(),
              };
            }

            if (timeoutAction === 'reject') {
              context.setVariable('_approvalResult', 'rejected');
              context.setOutput('approved', false);

              return {
                nodeId,
                nodeType: 'user-approval',
                status: 'completed',
                inputs,
                outputs: {
                  approved: false,
                  status: 'timed_out_rejected',
                  reason: 'timeout',
                },
                startTime,
                endTime: Date.now(),
              };
            }

            // Fail
            return {
              nodeId,
              nodeType: 'user-approval',
              status: 'failed',
              inputs,
              outputs: {},
              error: {
                code: 'APPROVAL_TIMEOUT',
                message: 'User approval request timed out',
                nodeId,
              },
              startTime,
              endTime: Date.now(),
            };
          }
        }

        // Still waiting
        context.log('debug', 'Still waiting for user approval');

        return {
          nodeId,
          nodeType: 'user-approval',
          status: 'waiting',
          inputs,
          outputs: {
            status: 'waiting',
            requestedAt: existingApproval.requestedAt,
            timeRemaining: existingApproval.timeout
              ? existingApproval.timeout - (Date.now() - existingApproval.requestedAt)
              : undefined,
          },
          startTime,
          endTime: Date.now(),
          metadata: {
            approvalState: existingApproval,
          },
        };
      }

      // Create new approval request
      const approvalState: ApprovalState = {
        nodeId,
        message: interpolatedMessage,
        approveLabel: config.approveLabel ?? 'Approve',
        rejectLabel: config.rejectLabel ?? 'Reject',
        requestedAt: Date.now(),
        timeout: config.timeout,
        status: 'waiting',
      };

      UserApprovalExecutor.pendingApprovals.set(nodeId, approvalState);

      context.log('info', 'Waiting for user approval', {
        message: interpolatedMessage,
      });

      // Set waiting status in context
      context.setVariable('_approvalStatus', 'waiting');

      return {
        nodeId,
        nodeType: 'user-approval',
        status: 'waiting',
        inputs,
        outputs: {
          status: 'waiting',
          requestedAt: approvalState.requestedAt,
        },
        startTime,
        endTime: Date.now(),
        metadata: {
          approvalState,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.log('error', `User approval execution failed: ${errorMessage}`, {
        nodeId,
        error: errorMessage,
      });

      return {
        nodeId,
        nodeType: 'user-approval',
        status: 'failed',
        inputs,
        outputs: {},
        error: {
          code: 'USER_APPROVAL_ERROR',
          message: errorMessage,
          nodeId,
          stack: error instanceof Error ? error.stack : undefined,
        },
        startTime,
        endTime: Date.now(),
      };
    }
  }

  validate(config: UserApprovalNodeConfig): ValidationResult {
    const errors: ValidationError[] = [];

    if (!config.message || config.message.trim() === '') {
      errors.push({
        field: 'message',
        message: 'Approval message is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (config.timeout !== undefined) {
      if (config.timeout < 1000) {
        errors.push({
          field: 'timeout',
          message: 'Timeout must be at least 1000ms (1 second)',
          code: 'INVALID_RANGE',
        });
      }
      if (config.timeout > 86400000) {
        errors.push({
          field: 'timeout',
          message: 'Timeout cannot exceed 86400000ms (24 hours)',
          code: 'INVALID_RANGE',
        });
      }
    }

    if (config.timeoutAction) {
      const validActions = ['approve', 'reject', 'fail'];
      if (!validActions.includes(config.timeoutAction)) {
        errors.push({
          field: 'timeoutAction',
          message: `Invalid timeout action. Must be one of: ${validActions.join(', ')}`,
          code: 'INVALID_VALUE',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private interpolateMessage(
    message: string,
    context: ExecutionContextInterface
  ): string {
    return message.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const value = context.getVariable(varName.trim());

      if (value === undefined || value === null) {
        return match;
      }

      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  // ============================================================================
  // Static Methods for External Approval Management
  // ============================================================================

  /**
   * Approve a pending approval request
   */
  static approve(nodeId: string, resolvedBy?: string): boolean {
    const approval = UserApprovalExecutor.pendingApprovals.get(nodeId);
    if (!approval || approval.status !== 'waiting') {
      return false;
    }

    approval.status = 'approved';
    approval.resolvedAt = Date.now();
    approval.resolvedBy = resolvedBy;

    return true;
  }

  /**
   * Reject a pending approval request
   */
  static reject(nodeId: string, resolvedBy?: string): boolean {
    const approval = UserApprovalExecutor.pendingApprovals.get(nodeId);
    if (!approval || approval.status !== 'waiting') {
      return false;
    }

    approval.status = 'rejected';
    approval.resolvedAt = Date.now();
    approval.resolvedBy = resolvedBy;

    return true;
  }

  /**
   * Get the status of a pending approval
   */
  static getApprovalState(nodeId: string): ApprovalState | undefined {
    return UserApprovalExecutor.pendingApprovals.get(nodeId);
  }

  /**
   * Get all pending approvals
   */
  static getPendingApprovals(): ApprovalState[] {
    return Array.from(UserApprovalExecutor.pendingApprovals.values()).filter(
      (a) => a.status === 'waiting'
    );
  }

  /**
   * Clear a pending approval
   */
  static clearApproval(nodeId: string): boolean {
    return UserApprovalExecutor.pendingApprovals.delete(nodeId);
  }

  /**
   * Clear all pending approvals
   */
  static clearAllApprovals(): void {
    UserApprovalExecutor.pendingApprovals.clear();
  }
}
