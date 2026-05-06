"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import ClaroMark from "@/components/ClaroMark";
import type { Project, ProjectNode, SmartView, ActiveView } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";
import { CLARO_BRAND } from "@/lib/themes";

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
          className={`w-full flex items-center justify-center py-1.5 rounded-md text-base transition-colors ${isActive ? theme.activeNav : `text-zinc-500 dark:text-zinc-400 ${theme.navHover}`}`}
        >
          {node.emoji ?? "📋"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md text-sm transition-colors cursor-pointer ${isActive ? theme.activeNav : `text-zinc-600 dark:text-zinc-400 ${theme.navHover}`}`}
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

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.ok ? r.json() : []),
      fetch("/api/smart-views").then((r) => r.ok ? r.json() : []),
    ]).then(([projs, views]) => {
      setProjects(Array.isArray(projs) ? projs : []);
      setSmartViews(Array.isArray(views) ? views : []);
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
        } ${active ? theme.activeNav : `text-zinc-600 dark:text-zinc-400 ${theme.navHover}`}`}
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
    <aside className={`h-full flex-shrink-0 flex flex-col ${theme.sidebarBg} border-r ${theme.borderColor} overflow-x-hidden transition-all duration-200 ${collapsed ? "w-14" : "w-64"}`}>
      {/* Brand + collapse toggle */}
      <div className={`flex items-center border-b ${theme.borderColor} flex-shrink-0 ${
        collapsed ? "justify-center py-4 px-2" : "px-4 py-4 gap-3"
      }`}
        style={{ background: CLARO_BRAND.panelGradient }}
      >
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center select-none"
            title="Expand sidebar"
          >
            <ClaroMark size={30} />
          </button>
        ) : (
          <>
            <ClaroMark size={28} />
            <span className="font-bold text-white text-xl tracking-tight flex-1 truncate">
              Claro
            </span>
            <button
              onClick={() => setCollapsed(true)}
              className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/70 text-xs select-none flex-shrink-0 transition-colors"
              title="Collapse sidebar"
            >
              ‹‹
            </button>
          </>
        )}
      </div>

      {/* Nav — flex-1 + min-h-0 so it shrinks and scrolls inside the flex column */}
      <nav className={`sidebar-nav flex-1 min-h-0 overflow-y-scroll py-3 space-y-4 ${collapsed ? "px-1" : "px-2"}`}>
        {/* Views — simplified to two top-level items */}
        <div>
          <SectionLabel label="Views" />
          <NavBtn label="Your To-do List"    emoji="✅" view={{ type: "todo" }} />
          <NavBtn label="Daily Habit Tracker" emoji="🎯" view={{ type: "habits" }} />
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

      {/* Profile menu — handles theme, preferences, and logout */}
      <ProfileMenu collapsed={collapsed} />
    </aside>
  );
}

// ─── ProfileMenu ──────────────────────────────────────────────────────────────

function ProfileMenu({ collapsed }: { collapsed: boolean }) {
  const { data: session } = useSession();
  const { theme, themes, setThemeId } = useTheme();
  const [open, setOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "deleting" | "deleted">("idle");
  const ref = useRef<HTMLDivElement>(null);

  // Preferences stored in localStorage
  const [defaultView, setDefaultViewState] = useState("todo");
  const [weekStart, setWeekStartState]     = useState("monday");
  const [compact, setCompactState]         = useState(false);

  useEffect(() => {
    setDefaultViewState(localStorage.getItem("pref_defaultView") ?? "todo");
    setWeekStartState(localStorage.getItem("pref_weekStart")    ?? "monday");
    setCompactState((localStorage.getItem("pref_compact") ?? "false") === "true");
  }, []);

  const setPref = (key: string, value: string) => {
    localStorage.setItem(key, value);
    if (key === "pref_defaultView") setDefaultViewState(value);
    if (key === "pref_weekStart")   setWeekStartState(value);
    if (key === "pref_compact")     setCompactState(value === "true");
  };

  const handleDeleteAccount = async () => {
    setDeleteStep("deleting");
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (res.ok) {
        setDeleteStep("deleted");
        setTimeout(() => signOut({ callbackUrl: "/login" }), 1800);
      } else {
        setDeleteStep("confirm");
        alert("Something went wrong. Please try again.");
      }
    } catch {
      setDeleteStep("confirm");
      alert("Something went wrong. Please try again.");
    }
  };

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) setDeleteStep("idle");
  }, [open]);

  const user = session?.user;
  if (!user) return null;

  const initials = (user.name ?? user.email ?? "?")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div ref={ref} className={`relative border-t ${theme.borderColor} flex-shrink-0`}>

      {/* Popover panel */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 mx-2 z-50 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">

          {/* Identity header */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
            <div             className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 overflow-hidden"
              style={{ background: CLARO_BRAND.accentGradient }}>
              {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{user.name ?? "You"}</p>
              <p className="text-xs text-zinc-400 truncate">{user.email}</p>
            </div>
          </div>

          {/* Appearance */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">Appearance</p>
            <div className="flex gap-2 flex-wrap">
              {themes.map((t) => (
                <button key={t.id} onClick={() => setThemeId(t.id)} title={t.name}
                  className={`flex flex-col items-center gap-1 transition-transform hover:scale-105 ${theme.id === t.id ? "opacity-100" : "opacity-60 hover:opacity-100"}`}>
                  <span className={`w-9 h-6 rounded-md overflow-hidden flex ring-2 ${theme.id === t.id ? "ring-indigo-500" : "ring-transparent"}`}>
                    <span className={`w-2/5 ${t.swatchSidebar}`} />
                    <span className={`w-3/5 ${t.swatchMain}`} />
                  </span>
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-400 leading-none">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Preferences</p>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Open app to</span>
              <select value={defaultView} onChange={(e) => setPref("pref_defaultView", e.target.value)}
                className="text-xs px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="todo">Your To-do List</option>
                <option value="today">Today</option>
                <option value="high-priority">High Priority</option>
                <option value="inbox">Inbox</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Week starts on</span>
              <div className="flex rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700 text-xs">
                {(["monday", "sunday"] as const).map((d) => (
                  <button key={d} onClick={() => setPref("pref_weekStart", d)}
                    className={`px-2.5 py-1 transition-colors ${weekStart === d ? "bg-indigo-600 text-white" : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700"}`}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Compact task rows</span>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Fits more tasks on screen</p>
              </div>
              <button onClick={() => setPref("pref_compact", compact ? "false" : "true")}
                style={{ minWidth: "2rem", height: "1.125rem" }}
                className={`relative rounded-full transition-colors flex-shrink-0 ${compact ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-700"}`}>
                <span style={{ width: "0.875rem", height: "0.875rem" }}
                  className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform ${compact ? "translate-x-3.5" : ""}`} />
              </button>
            </div>
          </div>

          {/* Log Out */}
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log Out
          </button>

          {/* Delete Account */}
          {deleteStep === "idle" && (
            <button onClick={() => setDeleteStep("confirm")}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-medium text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-zinc-100 dark:border-zinc-800">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Delete account
            </button>
          )}

          {/* Confirmation panel */}
          {deleteStep === "deleted" && (
            <div className="px-4 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 flex flex-col items-center gap-1.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Account deleted</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Redirecting you out…</p>
            </div>
          )}

          {(deleteStep === "confirm" || deleteStep === "deleting") && (
            <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-red-50 dark:bg-red-900/20">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Delete your account?</p>
              <p className="text-[11px] text-red-600/80 dark:text-red-400/70 mb-3 leading-snug">
                This permanently removes all your tasks, projects, and data. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteStep("idle")} disabled={deleteStep === "deleting"}
                  className="flex-1 text-xs py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleDeleteAccount} disabled={deleteStep === "deleting"}
                  className="flex-1 text-xs py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {deleteStep === "deleting" ? (
                    <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Deleting…</>
                  ) : "Yes, delete everything"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Avatar trigger */}
      {collapsed ? (
        <div className="flex justify-center py-3">
          <button onClick={() => setOpen((o) => !o)} title="Profile & settings"
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold overflow-hidden hover:ring-2 hover:ring-violet-400 transition"
            style={{ background: CLARO_BRAND.accentGradient }}>
            {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : initials}
          </button>
        </div>
      ) : (
        <button onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden"
            style={{ background: CLARO_BRAND.accentGradient }}>
            {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100 truncate leading-tight">{user.name ?? "You"}</p>
            <p className="text-[10px] text-zinc-400 truncate leading-tight">{user.email}</p>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            className={`text-zinc-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M2 4.5l4 3 4-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
