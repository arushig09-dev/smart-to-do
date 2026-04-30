"use client";

import { useState, useEffect } from "react";
import type { Project, ProjectNode, SmartView, ActiveView } from "@/types";

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
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      className={`transition-transform duration-150 ${open ? "rotate-90" : ""}`}
    >
      <path
        d="M3 2l4 3-4 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProjectTreeNode({
  node,
  depth,
  activeView,
  onSelect,
  expanded,
  onToggle,
}: {
  node: ProjectNode;
  depth: number;
  activeView: ActiveView;
  onSelect: (v: ActiveView) => void;
  expanded: Set<number>;
  onToggle: (id: number) => void;
}) {
  const isActive = activeView.type === "project" && activeView.id === node.id;
  const isOpen = expanded.has(node.id);
  const hasChildren = node.childNodes.length > 0;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md text-sm transition-colors cursor-pointer ${
          isActive
            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-medium"
            : "text-zinc-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800"
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() =>
          onSelect({
            type: "project",
            id: node.id,
            name: node.name,
            emoji: node.emoji,
            color: node.color,
          })
        }
      >
        <span
          className="flex-shrink-0 w-4 h-7 flex items-center justify-center text-zinc-400"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
        >
          {hasChildren ? <ChevronIcon open={isOpen} /> : null}
        </span>
        <span className="flex-shrink-0 text-sm leading-none mr-1">
          {node.emoji ?? "📋"}
        </span>
        <span className="truncate py-1.5 pr-3 flex-1">{node.name}</span>
      </div>

      {isOpen && hasChildren && (
        <div>
          {node.childNodes
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((child) => (
              <ProjectTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                activeView={activeView}
                onSelect={onSelect}
                expanded={expanded}
                onToggle={onToggle}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  activeView,
  onViewChange,
}: {
  activeView: ActiveView;
  onViewChange: (v: ActiveView) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [smartViews, setSmartViews] = useState<SmartView[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/smart-views").then((r) => r.json()),
    ]).then(([projs, views]) => {
      setProjects(projs);
      setSmartViews(views);
      const roots: number[] = projs
        .filter((p: Project) => p.parentId === null)
        .map((p: Project) => p.id);
      setExpanded(new Set(roots));
    });
  }, []);

  const tree = buildTree(projects);

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  function NavItem({
    label,
    emoji,
    view,
  }: {
    label: string;
    emoji: string;
    view: ActiveView;
  }) {
    const isActive =
      activeView.type === view.type &&
      (view.type === "inbox" ||
        view.type === "today" ||
        view.type === "upcoming" ||
        (view.type === "smartview" &&
          activeView.type === "smartview" &&
          activeView.id === view.id));

    return (
      <button
        onClick={() => onViewChange(view)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
          isActive
            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-medium"
            : "text-zinc-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800"
        }`}
      >
        <span className="text-base leading-none w-5 flex-shrink-0">{emoji}</span>
        <span className="truncate">{label}</span>
      </button>
    );
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-stone-100 dark:bg-zinc-900 border-r border-stone-200 dark:border-zinc-800 overflow-y-auto">
      {/* Brand */}
      <div className="px-4 py-4 flex items-center gap-2.5 border-b border-stone-200 dark:border-zinc-800">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold select-none">
          ST
        </div>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">
          Smart Todo
        </span>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {/* Views */}
        <div>
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Views
          </p>
          <NavItem label="Inbox" emoji="📥" view={{ type: "inbox" }} />
          <NavItem label="Today" emoji="☀️" view={{ type: "today" }} />
          <NavItem label="Upcoming" emoji="📆" view={{ type: "upcoming" }} />
        </div>

        {/* Smart views / favorites */}
        {smartViews.length > 0 && (
          <div>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Favorites
            </p>
            {smartViews.map((sv) => (
              <NavItem
                key={sv.id}
                label={sv.name}
                emoji={sv.emoji ?? "🔖"}
                view={{ type: "smartview", id: sv.id, name: sv.name, emoji: sv.emoji }}
              />
            ))}
          </div>
        )}

        {/* Project tree */}
        {tree.length > 0 && (
          <div>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Projects
            </p>
            {tree
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((node) => (
                <ProjectTreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  activeView={activeView}
                  onSelect={onViewChange}
                  expanded={expanded}
                  onToggle={toggle}
                />
              ))}
          </div>
        )}
      </nav>
    </aside>
  );
}
