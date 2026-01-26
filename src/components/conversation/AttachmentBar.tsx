interface Props {
  attachments: File[];
  onRemove: (index: number) => void;
}

export function AttachmentBar({ attachments, onRemove }: Props) {
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {attachments.map((file, index) => (
        <div
          key={index}
          className="flex items-center gap-1.5 bg-surface-2 rounded-md px-2 py-1 text-xs"
        >
          <FileIcon type={file.type} />
          <span className="truncate max-w-[120px]">{file.name}</span>
          <span className="text-surface-dark-4">
            ({formatSize(file.size)})
          </span>
          <button
            onClick={() => onRemove(index)}
            className="ml-1 text-surface-dark-4 hover:text-red-500"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}

function FileIcon({ type }: { type: string }) {
  const icon = type.startsWith("image/")
    ? "img"
    : type === "application/pdf"
      ? "pdf"
      : "doc";

  const colors: Record<string, string> = {
    img: "text-green-600",
    pdf: "text-red-600",
    doc: "text-blue-600",
  };

  return <span className={`font-mono font-bold ${colors[icon]}`}>{icon}</span>;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
