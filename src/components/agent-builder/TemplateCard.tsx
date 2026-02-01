/**
 * TemplateCard - Template card component for the templates grid
 *
 * Displays template preview with "Use Template" action.
 */

import clsx from "clsx";
import type { WorkflowTemplate } from "@/stores/workflowStore";

interface TemplateCardProps {
  template: WorkflowTemplate;
  onUseTemplate: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  headset: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  database: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  ),
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Support: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Research: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Data: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

export function TemplateCard({ template, onUseTemplate }: TemplateCardProps) {
  const categoryStyle = CATEGORY_COLORS[template.category] || {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
  };

  return (
    <div
      className={clsx(
        "group relative bg-white border border-surface-3 rounded-xl p-4",
        "transition-all duration-200",
        "hover:shadow-lg hover:shadow-nebula-100/50 hover:border-nebula-200"
      )}
    >
      {/* Top row: Icon and category */}
      <div className="flex items-start justify-between mb-3">
        {/* Template icon */}
        <div
          className={clsx(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            categoryStyle.bg,
            categoryStyle.text
          )}
        >
          {ICON_MAP[template.icon] || (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          )}
        </div>

        {/* Category badge */}
        <span
          className={clsx(
            "text-[10px] font-medium px-2 py-0.5 rounded-full border",
            categoryStyle.bg,
            categoryStyle.text,
            categoryStyle.border
          )}
        >
          {template.category}
        </span>
      </div>

      {/* Template name */}
      <h3 className="text-sm font-semibold text-gray-800 mb-1">
        {template.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-surface-dark-4 line-clamp-2 mb-4">
        {template.description}
      </p>

      {/* Node count indicator */}
      <div className="flex items-center gap-1.5 text-[11px] text-surface-dark-4 mb-4">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <span>{template.nodes.length} nodes</span>
      </div>

      {/* Use Template button */}
      <button
        onClick={onUseTemplate}
        className={clsx(
          "w-full py-2 px-3 rounded-lg text-xs font-medium",
          "bg-nebula-50 text-nebula-700 border border-nebula-200",
          "transition-all duration-200",
          "hover:bg-nebula-100 hover:border-nebula-300",
          "group-hover:bg-nebula-600 group-hover:text-white group-hover:border-nebula-600"
        )}
      >
        Use Template
      </button>
    </div>
  );
}
