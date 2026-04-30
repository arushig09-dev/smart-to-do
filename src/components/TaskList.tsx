"use client";

import { useState, useRef } from "react";
import type { Task, Section, ActiveView } from "@/types";
import TaskRow from "./TaskRow";

function AddTaskInline({
  onAdd,
  placeholder,
}: {
  onAdd: (title: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  function submit() {
    const t = text.trim();
    if (t) {
      onAdd(t);
      setText("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => ref.current?.focus(), 50);
        }}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors group"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="flex-shrink-0"
        >
          <path
            d="M7 2v10M2 7h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span>{placeholder ?? "Add task"}</span>
      </button>
    );
  }

  return (
    <div className="px-4 py-2 flex gap-2 border-t border-stone-100 dark:border-zinc-800">
      <input
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setOpen(false);
            setText("");
          }
        }}
        onBlur={() => {
          if (!text.trim()) {
            setOpen(false);
          }
        }}
        placeholder='Task name…  try "Buy milk tomorrow P1"'
        className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        onClick={submit}
        className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
      >
        Add
      </button>
      <button
        onClick={() => {
          setOpen(false);
          setText("");
        }}
        className="px-2 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        Cancel
      </button>
    </div>
  );
}

const VIEW_LABELS: Record<string, string> = {
  inbox: "Inbox",
  today: "Today",
  upcoming: "Upcoming",
};

export default function TaskList({
  activeView,
  tasks,
  sections,
  selectedId,
  onSelectTask,
  onCompleteTask,
  onDeleteTask,
  onAddTask,
}: {
  activeView: ActiveView;
  tasks: Task[];
  sections: Section[];
  selectedId: number | null;
  onSelectTask: (t: Task) => void;
  onCompleteTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
  onAddTask: (title: string, sectionId?: number) => void;
}) {
  const isProjectView = activeView.type === "project";
  const showProject =
    activeView.type === "smartview" ||
    activeView.type === "inbox" ||
    activeView.type === "today" ||
    activeView.type === "upcoming";

  // Header title + emoji
  let headerTitle = "";
  let headerEmoji = "";
  if (activeView.type === "inbox") { headerTitle = "Inbox"; headerEmoji = "📥"; }
  else if (activeView.type === "today") { headerTitle = "Today"; headerEmoji = "☀️"; }
  else if (activeView.type === "upcoming") { headerTitle = "Upcoming"; headerEmoji = "📆"; }
  else if (activeView.type === "smartview") { headerTitle = activeView.name; headerEmoji = activeView.emoji ?? "🔖"; }
  else if (activeView.type === "project") { headerTitle = activeView.name; headerEmoji = activeView.emoji ?? "📋"; }

  if (isProjectView && sections.length > 0) {
    // Group tasks by section
    const sectionMap = new Map<number, Task[]>();
    const unsectioned: Task[] = [];

    sections.forEach((s) => sectionMap.set(s.id, []));
    tasks.forEach((t) => {
      if (t.sectionId && sectionMap.has(t.sectionId)) {
        sectionMap.get(t.sectionId)!.push(t);
      } else {
        unsectioned.push(t);
      }
    });

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex-shrink-0">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>{headerEmoji}</span>
            <span>{headerTitle}</span>
          </h1>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950">
          {unsectioned.length > 0 && (
            <div className="mb-2">
              {unsectioned.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  isSelected={selectedId === t.id}
                  onSelect={() => onSelectTask(t)}
                  onComplete={() => onCompleteTask(t.id)}
                  onDelete={() => onDeleteTask(t.id)}
                  showProject={false}
                />
              ))}
            </div>
          )}

          {sections.map((sec) => {
            const secTasks = sectionMap.get(sec.id) ?? [];
            return (
              <div key={sec.id} className="mb-4">
                <div className="px-4 py-2 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {sec.name}
                  </span>
                  <span className="text-xs text-zinc-300 dark:text-zinc-600">
                    {secTasks.length > 0 ? secTasks.length : ""}
                  </span>
                </div>

                {secTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    isSelected={selectedId === t.id}
                    onSelect={() => onSelectTask(t)}
                    onComplete={() => onCompleteTask(t.id)}
                    onDelete={() => onDeleteTask(t.id)}
                    showProject={false}
                  />
                ))}

                <AddTaskInline
                  onAdd={(title) => onAddTask(title, sec.id)}
                  placeholder={`Add to ${sec.name}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Flat view (inbox / today / upcoming / smart view)
  const label =
    activeView.type in VIEW_LABELS
      ? VIEW_LABELS[activeView.type as keyof typeof VIEW_LABELS]
      : headerTitle;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex-shrink-0">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span>{headerEmoji}</span>
          <span>{headerTitle}</span>
        </h1>
      </div>

      {/* Quick-add */}
      <div className="px-6 py-3 border-b border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex-shrink-0">
        <AddTaskInline onAdd={(title) => onAddTask(title)} />
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950">
        {tasks.length === 0 ? (
          <p className="p-8 text-center text-zinc-400 text-sm">
            No tasks in {label}
          </p>
        ) : (
          tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              isSelected={selectedId === t.id}
              onSelect={() => onSelectTask(t)}
              onComplete={() => onCompleteTask(t.id)}
              onDelete={() => onDeleteTask(t.id)}
              showProject={showProject}
            />
          ))
        )}
      </div>
    </div>
  );
}
