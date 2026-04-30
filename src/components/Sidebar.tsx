"use client";

import { useState } from "react";
import type { ActiveView } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";

export default function Sidebar({
  activeView,
  onViewChange,
}: {
  activeView: ActiveView;
  onViewChange: (v: ActiveView) => void;
}) {
  const { theme, themes, setThemeId } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const NAV_ITEMS: { label: string; emoji: string; view: ActiveView }[] = [
    { label: "Your To-do List",     emoji: "✅", view: { type: "todo" } },
    { label: "Your Habit Tracker",  emoji: "🔥", view: { type: "habits" } },
  ];

  function isActive(view: ActiveView) {
    return activeView.type === view.type;
  }

  return (
    <aside
      className={`flex-shrink-0 flex flex-col bg-stone-100 dark:bg-zinc-900 border-r border-stone-200 dark:border-zinc-800 overflow-hidden transition-all duration-200 ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      {/* Brand + collapse toggle */}
      <div
        className={`flex items-center border-b border-stone-200 dark:border-zinc-800 flex-shrink-0 ${
          collapsed ? "justify-center py-3" : "px-4 py-3.5 gap-2.5"
        }`}
      >
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={`w-7 h-7 rounded-lg ${theme.brand} flex items-center justify-center text-white text-xs font-bold select-none flex-shrink-0`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "ST"}
        </button>
        {!collapsed && (
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight flex-1 truncate">
            Smart Todo
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-1 ${collapsed ? "px-1" : "px-2"}`}>
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Views
          </p>
        )}
        {NAV_ITEMS.map(({ label, emoji, view }) => {
          const active = isActive(view);
          return (
            <button
              key={view.type}
              onClick={() => onViewChange(view)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-2.5 rounded-md text-sm transition-colors ${
                collapsed ? "justify-center py-2 px-1" : "px-3 py-2"
              } ${
                active
                  ? theme.activeNav
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="text-base leading-none flex-shrink-0">{emoji}</span>
              {!collapsed && <span className="truncate font-medium">{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Theme picker */}
      {!collapsed && (
        <div className="px-3 pb-4 pt-2 border-t border-stone-200 dark:border-zinc-800 flex-shrink-0">
          <button
            onClick={() => setShowThemePicker((s) => !s)}
            className="w-full flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition py-1"
          >
            <span className={`w-3 h-3 rounded-full ${theme.brand} flex-shrink-0`} />
            <span>Theme: {theme.name}</span>
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              className={`ml-auto transition-transform ${showThemePicker ? "rotate-180" : ""}`}
            >
              <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {showThemePicker && (
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setThemeId(t.id); setShowThemePicker(false); }}
                  title={t.name}
                  className={`w-6 h-6 rounded-full ${t.brand} transition-transform hover:scale-110 ${
                    theme.id === t.id ? "ring-2 ring-offset-1 ring-zinc-400" : ""
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
