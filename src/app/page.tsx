"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import TaskList from "@/components/TaskList";
import TaskDetail from "@/components/TaskDetail";
import HabitTracker from "@/components/HabitTracker";
import ProjectOverview from "@/components/ProjectOverview";
import { useTheme } from "@/contexts/ThemeContext";
import type { Task, Project, Section, ActiveView } from "@/types";

export default function Home() {
  const { theme } = useTheme();
  const [activeView, setActiveView] = useState<ActiveView>({ type: "todo" });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch flat project list for detail panel dropdowns
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setAllProjects);
  }, []);

  // Fetch tasks whenever the active view changes
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setSelectedTask(null);
    try {
      let url = "/api/tasks";
      if (activeView.type === "project") {
        url += `?projectId=${activeView.id}`;
      } else if (activeView.type === "smartview") {
        const res = await fetch(`/api/smart-views/${activeView.id}/tasks`);
        const data = await res.json();
        setTasks(data.tasks ?? []);
        setLoading(false);
        return;
      } else if (activeView.type !== "todo") {
        url += `?view=${activeView.type}`;
      } else {
        url += `?view=todo`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [activeView]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Load sections when switching to a project view
  useEffect(() => {
    if (activeView.type === "project") {
      const project = allProjects.find((p) => p.id === activeView.id);
      setSections(project?.sections ?? []);
    } else {
      setSections([]);
    }
  }, [activeView, allProjects]);

  async function handleAddTask(title: string, sectionId?: number, projectId?: number) {
    const parseRes = await fetch(
      `/api/parse?text=${encodeURIComponent(title)}`
    );
    const parsed = await parseRes.json();

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: parsed.title ?? title,
        dueAt: parsed.dueAt ?? null,
        manualPriority: parsed.manualPriority ?? null,
        projectId: projectId ?? (activeView.type === "project" ? activeView.id : null),
        sectionId: sectionId ?? null,
      }),
    });

    fetchTasks();
  }

  async function handleCompleteTask(id: number) {
    await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
    if (selectedTask?.id === id) setSelectedTask(null);
    fetchTasks();
  }

  async function handleDeleteTask(id: number) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (selectedTask?.id === id) setSelectedTask(null);
    fetchTasks();
  }

  function handleTaskSaved(updated: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    setSelectedTask(updated);
  }

  function handleTaskDeleted(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTask(null);
  }

  function handleViewChange(view: ActiveView) {
    setActiveView(view);
    setSelectedTask(null);
  }

  // True when the active project is a "folder" — has child projects, no direct tasks
  const currentProject =
    activeView.type === "project"
      ? allProjects.find((p) => p.id === activeView.id) ?? null
      : null;
  const isFolderProject =
    currentProject !== null && (currentProject.children?.length ?? 0) > 0;

  return (
    <div className={`flex h-screen overflow-hidden ${theme.mainBg} text-zinc-900 dark:text-zinc-100`}>

      {/* ── Mobile sidebar backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar — static on desktop, overlay drawer on mobile ── */}
      <div className={`
        fixed inset-y-0 left-0 z-40
        sm:static sm:z-auto sm:h-full
        transition-transform duration-200 ease-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        sm:translate-x-0
      `}>
        <Sidebar
          activeView={activeView}
          onViewChange={(v) => {
            handleViewChange(v);
            setSidebarOpen(false);
          }}
        />
      </div>

      {/* ── Main area ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile-only top bar */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${theme.borderColor} ${theme.sidebarBg} flex-shrink-0 sm:hidden`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-500 active:bg-black/5"
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <span className={`w-6 h-6 rounded-md ${theme.brand} flex items-center justify-center text-white text-[10px] font-bold select-none`}>
            ST
          </span>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate flex-1">
            Smart Todo
          </span>
        </div>

        {activeView.type === "habits" ? (
          <HabitTracker />
        ) : isFolderProject && activeView.type === "project" ? (
          <ProjectOverview
            projectId={activeView.id}
            projectName={activeView.name}
            projectEmoji={activeView.emoji}
            onNavigate={handleViewChange}
          />
        ) : loading && tasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
            Loading…
          </div>
        ) : (
          <TaskList
            activeView={activeView}
            tasks={tasks}
            sections={sections}
            projects={allProjects}
            selectedId={selectedTask?.id ?? null}
            onSelectTask={setSelectedTask}
            onCompleteTask={handleCompleteTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
          />
        )}
      </main>

      {/* ── Task detail — side panel on desktop, full-screen overlay on mobile ── */}
      {selectedTask && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/40 sm:hidden"
            onClick={() => setSelectedTask(null)}
          />
          {/* On mobile: fixed full-screen overlay. On desktop (sm+): sm:contents removes
              this wrapper from layout, letting the aside sit as a normal flex child. */}
          <div className="fixed inset-0 z-40 sm:contents">
            <TaskDetail
              key={selectedTask.id}
              task={selectedTask}
              projects={allProjects}
              onClose={() => setSelectedTask(null)}
              onSaved={handleTaskSaved}
              onDeleted={handleTaskDeleted}
            />
          </div>
        </>
      )}
    </div>
  );
}
