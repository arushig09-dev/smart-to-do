"use client";

import { useState, useEffect } from "react";
import type { Task, Project, Section } from "@/types";

const PRIORITY_OPTIONS = [
  { value: "", label: "Auto (AI)" },
  { value: "P0", label: "P0 — Critical 🔴" },
  { value: "P1", label: "P1 — High 🟠" },
  { value: "P2", label: "P2 — Normal 🔵" },
];

export default function TaskDetail({
  task,
  projects,
  onClose,
  onSaved,
  onDeleted,
}: {
  task: Task;
  projects: Project[];
  onClose: () => void;
  onSaved: (updated: Task) => void;
  onDeleted: (id: number) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [dueAt, setDueAt] = useState(task.dueAt ? task.dueAt.slice(0, 16) : "");
  const [priority, setPriority] = useState(task.manualPriority ?? "");
  const [isBlocked, setIsBlocked] = useState(task.isBlocked);
  const [projectId, setProjectId] = useState<string>(task.projectId?.toString() ?? "");
  const [sectionId, setSectionId] = useState<string>(task.sectionId?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  // When task changes (selecting a different task), reset form
  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes ?? "");
    setDueAt(task.dueAt ? task.dueAt.slice(0, 16) : "");
    setPriority(task.manualPriority ?? "");
    setIsBlocked(task.isBlocked);
    setProjectId(task.projectId?.toString() ?? "");
    setSectionId(task.sectionId?.toString() ?? "");
  }, [task.id]);

  // Sections for selected project
  const selectedProject = projects.find((p) => p.id.toString() === projectId);
  const sections: Section[] = selectedProject?.sections ?? [];

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          notes: notes.trim() || null,
          dueAt: dueAt || null,
          manualPriority: priority || null,
          isBlocked,
          projectId: projectId || null,
          sectionId: sectionId || null,
        }),
      });
      const updated = await res.json();
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask() {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    onDeleted(task.id);
  }

  return (
    <aside className="w-96 flex-shrink-0 flex flex-col bg-white dark:bg-zinc-900 border-l border-stone-200 dark:border-zinc-800 overflow-y-auto">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-zinc-800 flex-shrink-0">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Task Details
        </h2>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-5 p-5 flex-1">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add notes…"
            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
          />
        </div>

        {/* Due + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Due date
            </label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Project + Section */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setSectionId("");
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id.toString()}>
                  {p.emoji ?? "📋"} {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Section
            </label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={sections.length === 0}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
            >
              <option value="">No section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id.toString()}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Blocked toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isBlocked}
            onChange={(e) => setIsBlocked(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 accent-indigo-600"
          />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Blocked / waiting
          </span>
        </label>

        {/* AI priority reason */}
        {task.priorityReason && (
          <div className="text-xs text-zinc-400 bg-stone-50 dark:bg-zinc-800 rounded-lg px-3 py-2.5 leading-relaxed">
            <span className="font-medium text-zinc-500">AI:</span>{" "}
            {task.priorityReason}
          </div>
        )}

        {/* Labels */}
        {task.labels.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Labels
            </p>
            <div className="flex flex-wrap gap-1.5">
              {task.labels.map(({ label }) => (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-stone-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                  style={
                    label.color
                      ? { backgroundColor: label.color + "22", color: label.color }
                      : {}
                  }
                >
                  {label.emoji} {label.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Subtasks */}
        {task.subtasks.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Subtasks ({task.subtasks.filter((s) => s.status === "completed").length}/
              {task.subtasks.length})
            </p>
            <div className="space-y-1">
              {task.subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                      s.status === "completed"
                        ? "border-green-500 bg-green-500"
                        : "border-zinc-300 dark:border-zinc-600"
                    }`}
                  />
                  <span
                    className={
                      s.status === "completed"
                        ? "line-through text-zinc-400"
                        : "text-zinc-700 dark:text-zinc-300"
                    }
                  >
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 p-5 border-t border-stone-200 dark:border-zinc-800 flex-shrink-0">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={deleteTask}
          className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          title="Delete task"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M3 3.5h9M5.5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M6 6.5v4M9 6.5v4M4 3.5l.5 8a.5.5 0 00.5.5h5a.5.5 0 00.5-.5l.5-8"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </aside>
  );
}
