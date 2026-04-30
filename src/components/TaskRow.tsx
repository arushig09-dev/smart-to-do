"use client";

import type { Task } from "@/types";

const PRIORITY_CONFIG: Record<string, { bg: string; label: string; stripe: string }> = {
  P0: { bg: "bg-red-500", label: "P0", stripe: "border-l-2 border-red-500" },
  P1: { bg: "bg-amber-400", label: "P1", stripe: "border-l-2 border-amber-400" },
  P2: { bg: "bg-blue-400", label: "P2", stripe: "border-l-2 border-blue-400" },
};

function relativeDate(d: string): string {
  const now = new Date();
  const dt = new Date(d);
  const diffH = (dt.getTime() - now.getTime()) / 3600000;
  if (diffH < -24) return `${Math.round(-diffH / 24)}d overdue`;
  if (diffH < 0) return "Overdue today";
  if (diffH < 24) return "Due today";
  if (diffH < 48) return "Tomorrow";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isDueOverdue(d: string): boolean {
  return new Date(d).getTime() < Date.now();
}

export default function TaskRow({
  task,
  isSelected,
  onSelect,
  onComplete,
  onDelete,
  showProject = false,
}: {
  task: Task;
  isSelected: boolean;
  onSelect: () => void;
  onComplete: () => void;
  onDelete: () => void;
  showProject?: boolean;
}) {
  const priority = task.suggestedPriority ?? task.manualPriority;
  const pConfig = priority ? PRIORITY_CONFIG[priority] : null;
  const overdue = task.dueAt && isDueOverdue(task.dueAt) && task.status !== "completed";

  return (
    <div
      onClick={onSelect}
      className={`group flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-stone-100 dark:border-zinc-800 last:border-0 ${
        pConfig?.stripe ?? "border-l-2 border-transparent"
      } ${
        isSelected
          ? "bg-indigo-50 dark:bg-indigo-900/20"
          : "hover:bg-stone-50 dark:hover:bg-zinc-800/50"
      }`}
    >
      {/* Complete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        className={`mt-0.5 flex-shrink-0 w-4.5 h-4.5 rounded-full border-2 transition-colors ${
          task.status === "completed"
            ? "border-green-500 bg-green-500"
            : "border-zinc-300 dark:border-zinc-600 hover:border-green-500"
        }`}
        style={{ width: 18, height: 18 }}
        title="Complete"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${
            task.status === "completed"
              ? "line-through text-zinc-400"
              : "text-zinc-800 dark:text-zinc-200"
          }`}
        >
          {task.title}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {pConfig && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold text-white rounded ${pConfig.bg}`}
            >
              {pConfig.label}
            </span>
          )}

          {task.dueAt && (
            <span
              className={`text-xs ${
                overdue ? "text-red-500 font-medium" : "text-zinc-400"
              }`}
            >
              {relativeDate(task.dueAt)}
            </span>
          )}

          {task.isBlocked && (
            <span className="text-xs text-red-400 font-medium">Blocked</span>
          )}

          {showProject && task.project && (
            <span className="text-xs text-zinc-400">
              {task.project.emoji ?? "📋"} {task.project.name}
            </span>
          )}

          {(task.labels ?? []).map(({ label }) => (
            <span
              key={label.id}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-stone-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
              style={label.color ? { backgroundColor: label.color + "22", color: label.color } : {}}
            >
              {label.emoji} {label.name}
            </span>
          ))}

          {task.subtasks?.length > 0 && (
            <span className="text-xs text-zinc-400">
              {task.subtasks.filter((s) => s.status === "completed").length}/
              {task.subtasks.length} subtasks
            </span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all"
        title="Delete"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 3l8 8M11 3l-8 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
