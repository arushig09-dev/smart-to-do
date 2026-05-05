"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type LinkedHabit = {
  id: number;
  name: string;
  emoji: string | null;
  goal: string | null;
  streak: number;
  completedToday: boolean;
};

export default function HabitSummaryWidget({ sectionId }: { sectionId: number }) {
  const { theme } = useTheme();
  const [habits, setHabits] = useState<LinkedHabit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/habits?sectionId=${sectionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setHabits(Array.isArray(data) ? data : []);
    } catch {
      // silently ignore — widget is optional
    } finally {
      setLoaded(true);
    }
  }, [sectionId]);

  useEffect(() => { load(); }, [load]);

  async function toggle(habitId: number) {
    // Optimistic update
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? { ...h, completedToday: !h.completedToday,
              streak: h.completedToday ? Math.max(0, h.streak - 1) : h.streak + 1 }
          : h
      )
    );
    await fetch(`/api/habits/${habitId}/log`, { method: "POST" });
    load();
  }

  // Render nothing until loaded, or if no habits are linked
  if (!loaded || habits.length === 0) return null;

  const doneCount = habits.filter((h) => h.completedToday).length;

  return (
    <div className={`mx-4 sm:mx-6 mb-3 rounded-xl border ${theme.borderColor} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-3 py-2 text-left
          ${theme.sidebarBg} hover:opacity-90 transition`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🎯</span>
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Today&apos;s habits
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
            doneCount === habits.length
              ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
          }`}>
            {doneCount}/{habits.length}
          </span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`text-zinc-400 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Habit rows */}
      {expanded && (
        <div className={`divide-y ${theme.borderColor} ${theme.mainBg}`}>
          {habits.map((habit) => (
            <div key={habit.id} className="flex items-center gap-3 px-3 py-2">
              {/* Toggle button */}
              <button
                onClick={() => toggle(habit.id)}
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  habit.completedToday
                    ? "border-green-500 bg-green-500"
                    : "border-zinc-300 dark:border-zinc-600 hover:border-green-400"
                }`}
                title={habit.completedToday ? "Mark incomplete" : "Mark complete"}
              >
                {habit.completedToday ? (
                  <svg viewBox="0 0 10 10" fill="none" className="w-3 h-3">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.6"
                          strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span className="text-[10px] leading-none">{habit.emoji ?? "⭐"}</span>
                )}
              </button>

              {/* Name + goal */}
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {habit.name}
                </span>
                {habit.goal && (
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                    <span className="font-semibold">Goal:</span> {habit.goal}
                  </p>
                )}
              </div>

              {/* Streak */}
              {habit.streak > 0 && (
                <span className="flex-shrink-0 text-[10px] font-semibold text-amber-500 dark:text-amber-400">
                  🔥 {habit.streak}d
                </span>
              )}

              {/* Done label */}
              {habit.completedToday && (
                <span className="flex-shrink-0 text-[10px] font-medium text-green-500 dark:text-green-400">
                  Done
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
