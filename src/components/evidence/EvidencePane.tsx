import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import clsx from "clsx";

type EvidenceTab = "changes" | "tests" | "deployments" | "docs" | "tickets";

const TABS: { id: EvidenceTab; label: string }[] = [
  { id: "changes", label: "Changes" },
  { id: "tests", label: "Tests" },
  { id: "deployments", label: "Deploys" },
  { id: "docs", label: "Docs" },
  { id: "tickets", label: "Tickets" },
];

interface Props {
  onClose: () => void;
}

export function EvidencePane({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<EvidenceTab>("changes");
  const activeWorkstreamId = useProjectStore((s) => s.activeWorkstreamId);
  const workstreams = useProjectStore((s) => s.workstreams);
  const activeWorkstream = workstreams.find((w) => w.id === activeWorkstreamId);

  const evidence = activeWorkstream?.evidence || [];

  return (
    <aside className="w-[var(--evidence-width)] nebula-panel shrink-0">
      <div className="nebula-panel-header flex items-center justify-between">
        <span>Evidence</span>
        <button
          onClick={onClose}
          className="text-surface-dark-4 hover:text-surface-dark-0 text-xs"
        >
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex-1 px-2 py-2 text-xs text-center transition-colors",
              activeTab === tab.id
                ? "text-nebula-700 border-b-2 border-nebula-500 font-medium"
                : "text-surface-dark-4 hover:text-surface-dark-0"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Evidence content */}
      <div className="flex-1 overflow-y-auto p-3">
        {evidence.length === 0 ? (
          <EmptyEvidence tab={activeTab} />
        ) : (
          <div className="space-y-2">
            {evidence
              .filter((e) => matchesTab(e.type, activeTab))
              .map((item) => (
                <EvidenceCard key={item.id} evidence={item} />
              ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function EmptyEvidence({ tab }: { tab: EvidenceTab }) {
  const messages: Record<EvidenceTab, string> = {
    changes: "No code changes yet. Changes will appear here as agents implement features.",
    tests: "No test results yet. Test evidence will appear after the testing phase.",
    deployments: "No deployments yet. Deployment status will be tracked here.",
    docs: "No documentation updates yet. Obsidian notes will be linked here.",
    tickets: "No ticket updates yet. Linear ticket changes will appear here.",
  };

  return (
    <div className="text-xs text-surface-dark-4 text-center py-8">
      {messages[tab]}
    </div>
  );
}

function EvidenceCard({
  evidence,
}: {
  evidence: {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    links: { label: string; url: string; type: string }[];
  };
}) {
  return (
    <div className="rounded-md border border-surface-3 bg-white p-3">
      <div className="flex items-start gap-2">
        <EvidenceTypeIcon type={evidence.type} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{evidence.title}</div>
          <div className="text-xs text-surface-dark-4 mt-0.5">
            {evidence.description}
          </div>
          {evidence.links.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {evidence.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  className="text-xs text-nebula-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    "code-change": "C",
    "test-result": "T",
    deployment: "D",
    documentation: "N",
    "linear-ticket": "L",
    "design-reference": "F",
    "security-scan": "S",
    "performance-report": "P",
  };

  const colors: Record<string, string> = {
    "code-change": "bg-blue-100 text-blue-700",
    "test-result": "bg-green-100 text-green-700",
    deployment: "bg-orange-100 text-orange-700",
    documentation: "bg-purple-100 text-purple-700",
    "linear-ticket": "bg-indigo-100 text-indigo-700",
    "design-reference": "bg-pink-100 text-pink-700",
    "security-scan": "bg-red-100 text-red-700",
    "performance-report": "bg-yellow-100 text-yellow-700",
  };

  return (
    <div
      className={clsx(
        "w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0",
        colors[type] || "bg-gray-100 text-gray-700"
      )}
    >
      {icons[type] || "?"}
    </div>
  );
}

function matchesTab(evidenceType: string, tab: EvidenceTab): boolean {
  const mapping: Record<EvidenceTab, string[]> = {
    changes: ["code-change"],
    tests: ["test-result", "security-scan", "performance-report"],
    deployments: ["deployment"],
    docs: ["documentation"],
    tickets: ["linear-ticket", "design-reference"],
  };
  return mapping[tab]?.includes(evidenceType) ?? false;
}
