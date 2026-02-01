/**
 * UserApprovalPropertiesPanel - Configuration panel for User Approval nodes
 *
 * Features:
 * - Prompt/message textarea
 * - Timeout input (optional)
 * - Approval/rejection actions
 * - Custom button labels
 */

import { useState } from "react";
import clsx from "clsx";

// ── Types ──

interface UserApprovalConfig {
  prompt?: string;
  timeout?: number;
  approveLabel?: string;
  rejectLabel?: string;
  showDetails?: boolean;
  detailsVariable?: string;
  requireReason?: boolean;
  escalationEmail?: string;
}

interface UserApprovalPropertiesPanelProps {
  nodeId: string;
  config: UserApprovalConfig;
  onUpdate: (config: Partial<UserApprovalConfig>) => void;
}

// ── Component ──

export function UserApprovalPropertiesPanel({
  nodeId: _nodeId,
  config,
  onUpdate,
}: UserApprovalPropertiesPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-5">
      {/* Prompt */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Approval Message
        </label>
        <textarea
          value={config.prompt || ""}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          className="nebula-input text-sm resize-none w-full"
          rows={4}
          placeholder="Please review and approve the following action..."
        />
        <p className="text-[10px] text-surface-dark-4 mt-1">
          This message will be shown to the user when requesting approval.
        </p>
      </div>

      {/* Preview card */}
      <div className="border border-surface-3 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-surface-1 border-b border-surface-3">
          <span className="text-[10px] font-medium text-surface-dark-4 uppercase tracking-wider">
            Preview
          </span>
        </div>
        <div className="p-4 bg-white">
          {/* Approval icon */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">
                Approval Required
              </div>
              <div className="text-xs text-surface-dark-4">
                Human-in-the-loop checkpoint
              </div>
            </div>
          </div>

          {/* Message preview */}
          <div className="p-3 bg-surface-1 rounded-lg mb-3 text-sm text-gray-700">
            {config.prompt || "Your approval message will appear here..."}
          </div>

          {/* Action buttons preview */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium opacity-80"
            >
              {config.approveLabel || "Approve"}
            </button>
            <button
              type="button"
              disabled
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium opacity-80"
            >
              {config.rejectLabel || "Reject"}
            </button>
          </div>
        </div>
      </div>

      {/* Button Labels */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Approve Button
          </label>
          <input
            type="text"
            value={config.approveLabel || ""}
            onChange={(e) => onUpdate({ approveLabel: e.target.value })}
            className="nebula-input text-sm w-full"
            placeholder="Approve"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Reject Button
          </label>
          <input
            type="text"
            value={config.rejectLabel || ""}
            onChange={(e) => onUpdate({ rejectLabel: e.target.value })}
            className="nebula-input text-sm w-full"
            placeholder="Reject"
          />
        </div>
      </div>

      {/* Timeout */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Timeout (seconds)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={config.timeout || ""}
            onChange={(e) =>
              onUpdate({
                timeout: e.target.value ? parseInt(e.target.value, 10) : undefined,
              })
            }
            className="nebula-input text-sm flex-1"
            placeholder="e.g. 300 (5 minutes)"
            min={0}
          />
          <span className="text-xs text-surface-dark-4 shrink-0">
            {config.timeout
              ? config.timeout >= 60
                ? `${Math.floor(config.timeout / 60)}m ${config.timeout % 60}s`
                : `${config.timeout}s`
              : "No limit"}
          </span>
        </div>
        <p className="text-[10px] text-surface-dark-4 mt-1">
          Leave empty for no timeout. After timeout, the request will be auto-rejected.
        </p>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-xs text-surface-dark-4 hover:text-gray-700 transition-colors"
      >
        <svg
          className={clsx("w-3 h-3 transition-transform", showAdvanced && "rotate-90")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Advanced Settings
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-4 pl-4 border-l-2 border-surface-2">
          {/* Show Details */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showDetails ?? false}
              onChange={(e) => onUpdate({ showDetails: e.target.checked })}
              className="rounded border-surface-3 text-nebula-600 focus:ring-nebula-500 mt-0.5"
            />
            <div>
              <span className="text-xs text-gray-700">Show execution details</span>
              <p className="text-[10px] text-surface-dark-4">
                Display additional context from the workflow execution.
              </p>
            </div>
          </label>

          {config.showDetails && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Details Variable
              </label>
              <input
                type="text"
                value={config.detailsVariable || ""}
                onChange={(e) => onUpdate({ detailsVariable: e.target.value })}
                className="nebula-input text-sm w-full font-mono"
                placeholder="e.g. executionSummary"
              />
            </div>
          )}

          {/* Require Reason */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.requireReason ?? false}
              onChange={(e) => onUpdate({ requireReason: e.target.checked })}
              className="rounded border-surface-3 text-nebula-600 focus:ring-nebula-500 mt-0.5"
            />
            <div>
              <span className="text-xs text-gray-700">Require rejection reason</span>
              <p className="text-[10px] text-surface-dark-4">
                User must provide a reason when rejecting.
              </p>
            </div>
          </label>

          {/* Escalation Email */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Escalation Email (optional)
            </label>
            <input
              type="email"
              value={config.escalationEmail || ""}
              onChange={(e) => onUpdate({ escalationEmail: e.target.value })}
              className="nebula-input text-sm w-full"
              placeholder="escalation@company.com"
            />
            <p className="text-[10px] text-surface-dark-4 mt-1">
              Send notification if approval is not received within timeout.
            </p>
          </div>
        </div>
      )}

      {/* Output handles */}
      <div className="pt-2 border-t border-surface-3">
        <div className="text-[10px] text-surface-dark-4 mb-2">Output handles:</div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-700">
              {config.approveLabel || "approve"} (approved)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-red-700">
              {config.rejectLabel || "reject"} (rejected)
            </span>
          </div>
          {config.timeout && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-xs text-gray-600">timeout</span>
            </div>
          )}
        </div>
      </div>

      {/* Variables available after approval */}
      <div className="p-3 bg-surface-1 rounded-lg">
        <div className="text-[10px] font-medium text-surface-dark-4 mb-2">
          Variables set after approval:
        </div>
        <div className="flex flex-wrap gap-1.5">
          <code className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-gray-700 border border-surface-3">
            approval_status
          </code>
          <code className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-gray-700 border border-surface-3">
            approval_user
          </code>
          <code className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-gray-700 border border-surface-3">
            approval_timestamp
          </code>
          {config.requireReason && (
            <code className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-gray-700 border border-surface-3">
              rejection_reason
            </code>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserApprovalPropertiesPanel;
