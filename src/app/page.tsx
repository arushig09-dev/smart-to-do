"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Task = {
  id: number;
  title: string;
  notes: string | null;
  dueAt: string | null;
  manualPriority: string | null;
  suggestedPriority: string | null;
  priorityScore: number | null;
  priorityReason: string | null;
  isBlocked: boolean;
  status: string;
  completedAt: string | null;
  createdAt: string;
};

type View = "inbox" | "today" | "upcoming";

const VIEW_LABELS: Record<View, string> = {
  inbox: "Inbox",
  today: "Today",
  upcoming: "Upcoming",
};

const PRIORITY_COLORS: Record<string, string> = {
  P0: "bg-red-500",
  P1: "bg-amber-400",
  P2: "bg-blue-400",
};

function relativeDate(d: string | null): string {
  if (!d) return "";
  const now = new Date();
  const dt = new Date(d);
  const diffH = (dt.getTime() - now.getTime()) / 3600000;
  if (diffH < -24) return `${Math.round(-diffH / 24)}d overdue`;
  if (diffH < 0) return "Overdue today";
  if (diffH < 24) return "Due today";
  if (diffH < 48) return "Tomorrow";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Home() {
  const [view, setView] = useState<View>("inbox");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);
  const [quickText, setQuickText] = useState("");
  const [loading, setLoading] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editBlocked, setEditBlocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?view=${view}`);
      const data = await res.json();
      setTasks(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (selected) {
      setEditTitle(selected.title);
      setEditNotes(selected.notes || "");
      setEditDue(selected.dueAt ? selected.dueAt.slice(0, 16) : "");
      setEditPriority(selected.manualPriority || "");
      setEditBlocked(selected.isBlocked);
    }
  }, [selected]);

  async function addTask() {
    const text = quickText.trim();
    if (!text) return;

    const parseRes = await fetch(`/api/parse?text=${encodeURIComponent(text)}`);
    const parsed = await parseRes.json();

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: parsed.title,
        dueAt: parsed.dueAt,
        manualPriority: parsed.manualPriority,
        isBlocked: false,
      }),
    });

    setQuickText("");
    fetchTasks();
    inputRef.current?.focus();
  }

  async function completeTask(id: number) {
    await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
    if (selected?.id === id) setSelected(null);
    fetchTasks();
  }

  async function deleteTask(id: number) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    fetchTasks();
  }

  async function saveEdits() {
    if (!selected) return;
    await fetch(`/api/tasks/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        notes: editNotes || null,
        dueAt: editDue || null,
        manualPriority: editPriority || null,
        isBlocked: editBlocked,
      }),
    });
    setSelected(null);
    fetchTasks();
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <h1 className="text-xl font-bold tracking-tight">Smart Todo</h1>
        <div className="flex gap-1 ml-auto">
          {(["inbox", "today", "upcoming"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setSelected(null); }}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition ${
                view === v
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Task list */}
        <section className="flex-1 flex flex-col overflow-hidden border-r border-zinc-200 dark:border-zinc-800">
          {/* Quick add */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Add a task… try 'Buy groceries tomorrow P1'"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addTask}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                Add
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading && tasks.length === 0 ? (
              <p className="p-6 text-center text-zinc-400">Loading…</p>
            ) : tasks.length === 0 ? (
              <p className="p-6 text-center text-zinc-400">
                No tasks in {VIEW_LABELS[view]}
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {tasks.map((t) => (
                  <li
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      selected?.id === t.id
                        ? "bg-blue-50 dark:bg-zinc-800"
                        : ""
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        completeTask(t.id);
                      }}
                      className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900 transition"
                      title="Complete"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {t.suggestedPriority && (
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[10px] font-bold text-white rounded ${
                              PRIORITY_COLORS[t.suggestedPriority] || "bg-zinc-400"
                            }`}
                          >
                            {t.suggestedPriority}
                          </span>
                        )}
                        {t.dueAt && (
                          <span className="text-xs text-zinc-400">
                            {relativeDate(t.dueAt)}
                          </span>
                        )}
                        {t.isBlocked && (
                          <span className="text-xs text-red-400 font-medium">
                            Blocked
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask(t.id);
                      }}
                      className="flex-shrink-0 text-zinc-300 hover:text-red-500 transition"
                      title="Delete"
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Detail panel */}
        {selected && (
          <aside className="w-96 flex flex-col bg-white dark:bg-zinc-900 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-sm font-semibold">Task Details</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
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

            <div className="flex flex-col gap-4 p-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Title
                </label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">
                    Due
                  </label>
                  <input
                    type="datetime-local"
                    value={editDue}
                    onChange={(e) => setEditDue(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Auto</option>
                    <option value="P0">P0 – Critical</option>
                    <option value="P1">P1 – High</option>
                    <option value="P2">P2 – Normal</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editBlocked}
                  onChange={(e) => setEditBlocked(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-600"
                />
                Blocked
              </label>

              {selected.priorityReason && (
                <div className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3">
                  <span className="font-medium">Priority reason:</span>{" "}
                  {selected.priorityReason}
                </div>
              )}

              <button
                onClick={saveEdits}
                className="mt-2 w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                Save Changes
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
