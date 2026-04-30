"use client";

import { useState, useEffect } from "react";
import type { Project, ProjectNode, SmartView, ActiveView } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";

function buildTree(projects: Project[]): ProjectNode[] {
  const map = new Map<number, ProjectNode>();
  projects.forEach((p) => map.set(p.id, { ...p, childNodes: [] }));
  const roots: ProjectNode[] = [];
  projects.forEach((p) => {
    const node = map.get(p.id)!;
    if (p.parentId !== null && map.has(p.parentId)) {
      map.get(p.parentId)!.childNodes.push(node);
    } else if (p.parentId === null) {
      roots.push(node);
    }
  });
  return roots;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10" fill="none"
      className={`transition-transform duration-150 flex-shrink-0 ${open ? "rotate-90" : ""}`}
    >
      <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProjectTreeNode({
  node, depth, activeView, onSelect, expanded, onToggle, collapsed,
}: {
  node: ProjectNode; depth: number; activeView: ActiveView;
  onSelect: (v: ActiveView) => void; expanded: Set<number>;
  onToggle: (id: number) => void; collapsed: boolean;
}) {
  const { theme } = useTheme();
  const isActive = activeView.type === "project" && activeView.id === node.id;
  const isOpen = expanded.has(node.id);
  const hasChildren = node.childNodes.length > 0;

  if (collapsed) {
    return (
      <div title={node.name}>
        <button
          onClick={() => onSelect({ type: "project", id: node.id, name: node.name, emoji: node.emoji, color: node.color })}
          className={`w-full flex items-center justify-center py-1.5 rounded-md text-base transition-colors ${isActive ? theme.activeNav : "text-zinc-500 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800"}`}
        >
          {node.emoji ?? "📋"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md text-sm transition-colors cursor-pointer ${isActive ? theme.activeNav : "text-zinc-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800"}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => onSelect({ type: "project", id: node.id, name: node.name, emoji: node.emoji, color: node.color })}
      >
        <span
          className="flex-shrink-0 w-4 h-7 flex items-center justify-center text-zinc-400"
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
        >
          {hasChildren ? <ChevronIcon open={isOpen} /> : null}
        </span>
        <span className="flex-shrink-0 text-sm leading-none mr-1">{node.emoji ?? "📋"}</span>
        <span className="truncate py-1.5 pr-3 flex-1">{node.name}</span>
      </div>
      {isOpen && hasChildren && (
        <div>
          {node.childNodes.slice().sort((a, b) => a.order - b.order).map((child) => (
            <ProjectTreeNode key={child.id} node={child} depth={depth + 1}
              activeView={activeView} onSelect={onSelect} expanded={expanded}
              onToggle={onToggle} collapsed={collapsed} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ activeView, onViewChange }: { activeView: ActiveView; onViewChange: (v: ActiveView) => void }) {
  const { theme, themes, setThemeId } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [smartViews, setSmartViews] = useState<SmartView[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/projects").then((r) => r.json()), fetch("/api/smart-views").then((r) => r.json())])
      .then(([projs, views]) => {
        setProjects(projs);
        setSmartViews(views);
        const roots: number[] = projs.filter((p: Project) => p.parentId === null).map((p: Project) => p.id);
        setExpanded(new Set(roots));
      });
  }, []);

  const tree = buildTree(projects);
  const toggle = (id: number) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  function isNavActive(view: ActiveView) {
    if (activeView.type !== view.type) return false;
    if (view.type === "smartview" && activeView.type === "smartview") return activeView.id === (view as { id: number }).id;
    if (view.type === "habits") return true;
    return view.type === "todo" || view.type === "inbox" || view.type === "today" || view.type === "upcoming";
  }

  function NavBtn({ label, emoji, view }: { label: string; emoji: string; view: ActiveView }) {
    const active = isNavActive(view);
    return (
      <button
        onClick={() => onViewChange(view)}
        title={collapsed ? label : undefined}
        className={`w-full flex items-center gap-2.5 rounded-md text-sm transition-colors ${
          collapsed ? "justify-center py-2 px-1" : "px-3 py-1.5"
        } ${active ? theme.activeNav : "text-zinc-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800"}`}
      >
        <span className="text-base leading-none flex-shrink-0">{emoji}</span>
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
    );
  }

  function SectionLabel({ label }: { label: string }) {
    if (collapsed) return null;
    return <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{label}</p>;
  }

  return (
    <aside className={`flex-shrink-0 flex flex-col bg-stone-100 dark:bg-zinc-900 border-r border-stone-200 dark:border-zinc-800 overflow-hidden transition-all duration-200 ${collapsed ? "w-14" : "w-64"}`}>
      {/* Brand + collapse toggle */}
      <div className={`flex items-center border-b border-stone-200 dark:border-zinc-800 flex-shrink-0 ${collapsed ? "justify-center py-3" : "px-4 py-3.5 gap-2.5"}`}>
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

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto py-3 space-y-4 ${collapsed ? "px-1" : "px-2"}`}>
        {/* Views — simplified to two top-level items */}
        <div>
          <SectionLabel label="Views" />
          <NavBtn label="Your To-do List"    emoji="✅" view={{ type: "todo" }} />
          <NavBtn label="Your Habit Tracker" emoji="🔥" view={{ type: "habits" }} />
        </div>

        {/* Favorites / Smart views */}
        {smartViews.length > 0 && (
          <div>
            <SectionLabel label="Favorites" />
            {smartViews.map((sv) => (
              <NavBtn key={sv.id} label={sv.name} emoji={sv.emoji ?? "🔖"}
                view={{ type: "smartview", id: sv.id, name: sv.name, emoji: sv.emoji }} />
            ))}
          </div>
        )}

        {/* Project tree */}
        {tree.length > 0 && (
          <div>
            <SectionLabel label="Projects" />
            {tree.slice().sort((a, b) => a.order - b.order).map((node) => (
              <ProjectTreeNode key={node.id} node={node} depth={0} activeView={activeView}
                onSelect={onViewChange} expanded={expanded} onToggle={toggle} collapsed={collapsed} />
            ))}
          </div>
        )}
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
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`ml-auto transition-transform ${showThemePicker ? "rotate-180" : ""}`}>
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
                  className={`w-6 h-6 rounded-full ${t.brand} transition-transform hover:scale-110 ${theme.id === t.id ? "ring-2 ring-offset-1 ring-zinc-400" : ""}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
