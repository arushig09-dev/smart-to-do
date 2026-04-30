"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import TaskList from "@/components/TaskList";
import TaskDetail from "@/components/TaskDetail";
import HabitTracker from "@/components/HabitTracker";
import type { Task, Project, Section, ActiveView } from "@/types";

export default function Home() {
  const [activeView, setActiveView] = useState<ActiveView>({ type: "inbox" });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

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
      } else {
        url += `?view=${activeView.type}`;
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

  async function handleAddTask(title: string, sectionId?: number) {
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
        projectId:
          activeView.type === "project" ? activeView.id : null,
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

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Sidebar activeView={activeView} onViewChange={handleViewChange} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeView.type === "habits" ? (
          <HabitTracker />
        ) : loading && tasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
            Loading…
          </div>
        ) : (
          <TaskList
            activeView={activeView}
            tasks={tasks}
            sections={sections}
            selectedId={selectedTask?.id ?? null}
            onSelectTask={setSelectedTask}
            onCompleteTask={handleCompleteTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
          />
        )}
      </main>

      {selectedTask && (
        <TaskDetail
          key={selectedTask.id}
          task={selectedTask}
          projects={allProjects}
          onClose={() => setSelectedTask(null)}
          onSaved={handleTaskSaved}
          onDeleted={handleTaskDeleted}
        />
      )}
    </div>
  );
}
