"use client";

import { useState } from "react";
import type { Task } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";

const PRIORITY_CONFIG: Record<string, { bg: string; label: string; stripe: string }> = {
  P0: { bg: "bg-red-500",   label: "P0", stripe: "border-l-[3px] border-red-500" },
  P1: { bg: "bg-amber-400", label: "P1", stripe: "border-l-[3px] border-amber-400" },
  P2: { bg: "bg-sky-400",   label: "P2", stripe: "border-l-[3px] border-sky-400" },
};

function relativeDate(d: string): string {
  const now = new Date();
  const dt = new Date(d);
  const diffH = (dt.getTime() - now.getTime()) / 3600000;
  if (diffH < -48) return `${Math.round(-diffH / 24)}d overdue`;
  if (diffH < 0) return "Overdue";
  if (diffH < 24) return "Due today";
  if (diffH < 48) return "Tomorrow";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isDueOverdue(d: string) { return new Date(d).getTime() < Date.now(); }

export default function TaskRow({
  task, isSelected, onSelect, onComplete, onDelete, showProject = false,
}: {
  task: Task; isSelected: boolean; onSelect: () => void;
  onComplete: () => void; onDelete: () => void; showProject?: boolean;
}) {
  const { theme } = useTheme();
  const [completing, setCompleting] = useState(false);

  const priority = task.suggestedPriority ?? task.manualPriority;
  const pConfig = priority ? PRIORITY_CONFIG[priority] : null;
  const overdue = task.dueAt && isDueOverdue(task.dueAt) && task.status !== "completed";

  function handleComplete() {
    setCompleting(true);
    setTimeout(() => { onComplete(); setCompleting(false); }, 350);
  }

  return (
    <div
      onClick={onSelect}
      className={`group flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all border-b border-stone-100 dark:border-zinc-800/60 last:border-0 ${
        pConfig?.stripe ?? "border-l-[3px] border-transparent"
      } ${completing ? "opacity-40 scale-[0.99]" : ""} ${
        isSelected ? "bg-stone-100 dark:bg-zinc-800/60" : "hover:bg-stone-50 dark:hover:bg-zinc-800/40"
      }`}
    >
      {/* Complete button with pulse animation */}
      <button
        onClick={(e) => { e.stopPropagation(); handleComplete(); }}
        className={`mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 transition-all duration-300 ${
          task.status === "completed" || completing
            ? "border-green-500 bg-green-500 scale-110"
            : "border-zinc-300 dark:border-zinc-600 hover:border-green-400 hover:scale-110"
        }`}
        title="Complete"
      >
        {(task.status === "completed" || completing) && (
          <svg viewBox="0 0 10 10" fill="none" className="w-full h-full p-[2px]">
            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${
          task.status === "completed" ? "line-through text-zinc-400" : "text-zinc-800 dark:text-zinc-200"
        }`}>
          {task.title}
        </p>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {pConfig && (
            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold text-white rounded ${pConfig.bg}`}>
              {pConfig.label}
            </span>
          )}
          {task.dueAt && (
            <span className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-zinc-400"}`}>
              {relativeDate(task.dueAt)}
            </span>
          )}
          {task.isBlocked && <span className="text-xs text-red-400 font-medium">⛔ Blocked</span>}
          {showProject && task.project && (
            <span className="text-xs text-zinc-400">{task.project.emoji ?? "📋"} {task.project.name}</span>
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
          {(task.subtasks ?? []).length > 0 && (
            <span className="text-xs text-zinc-400">
              {task.subtasks.filter((s) => s.status === "completed").length}/{task.subtasks.length} subtasks
            </span>
          )}
        </div>
      </div>

      {/* Delete (hover reveal) */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className={`flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 ${theme.buttonOutline} rounded p-0.5 transition-all`}
        title="Delete"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
