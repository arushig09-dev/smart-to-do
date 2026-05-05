"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import type { ActiveView } from "@/types";
import type { OverviewCard, ProjectOverviewData } from "@/app/api/project-overview/[id]/route";

// ── Colour palette for cards without an explicit project colour ────────────────
const CARD_ACCENTS = [
  { bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-200 dark:border-violet-800", dot: "bg-violet-400" },
  { bg: "bg-sky-50 dark:bg-sky-900/20",       border: "border-sky-200 dark:border-sky-800",       dot: "bg-sky-400" },
  { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-400" },
  { bg: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-200 dark:border-amber-800",   dot: "bg-amber-400" },
  { bg: "bg-rose-50 dark:bg-rose-900/20",     border: "border-rose-200 dark:border-rose-800",     dot: "bg-rose-400" },
  { bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-200 dark:border-indigo-800", dot: "bg-indigo-400" },
  { bg: "bg-teal-50 dark:bg-teal-900/20",     border: "border-teal-200 dark:border-teal-800",     dot: "bg-teal-400" },
  { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", dot: "bg-orange-400" },
];

function getAccent(idx: number) {
  return CARD_ACCENTS[idx % CARD_ACCENTS.length];
}

// ── Section chip ──────────────────────────────────────────────────────────────
function SectionChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium
      bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300 whitespace-nowrap">
      {name}
    </span>
  );
}

// ── Single overview card ───────────────────────────────────────────────────────
function OverviewCardTile({
  card,
  index,
  onClick,
}: {
  card: OverviewCard;
  index: number;
  onClick: () => void;
}) {
  const accent = getAccent(index);

  return (
    <button
      onClick={onClick}
      className={`
        group text-left w-full rounded-2xl border p-5 flex flex-col gap-3
        transition-all duration-150 cursor-pointer
        hover:-translate-y-0.5 hover:shadow-md active:translate-y-0
        ${accent.bg} ${accent.border}
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {card.emoji ? (
            <span className="text-xl leading-none flex-shrink-0">{card.emoji}</span>
          ) : (
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${accent.dot}`} />
          )}
          <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 truncate">
            {card.name}
          </span>
        </div>

        {/* Task count badge */}
        {card.taskCount > 0 && (
          <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full
            bg-white/70 dark:bg-zinc-900/40 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            {card.taskCount} task{card.taskCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
        {card.description}
      </p>

      {/* Section chips (for project cards that have sections) */}
      {card.sectionNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.sectionNames.slice(0, 4).map((s) => (
            <SectionChip key={s} name={s} />
          ))}
          {card.sectionNames.length > 4 && (
            <SectionChip name={`+${card.sectionNames.length - 4} more`} />
          )}
        </div>
      )}

      {/* Top task previews */}
      {card.topTasks.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-black/5 dark:border-white/5 pt-2.5">
          {card.topTasks.map((t) => (
            <li key={t.id} className="flex items-start gap-1.5 min-w-0">
              <span className="mt-[3px] w-3 h-3 flex-shrink-0 rounded-full border border-zinc-300 dark:border-zinc-600" />
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {t.title}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA arrow — shown on hover */}
      <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 group-hover:text-zinc-600
        dark:group-hover:text-zinc-300 transition-colors mt-auto pt-1">
        <span>Open</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6h7m-3-3 3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 flex flex-col gap-3 animate-pulse">
      <div className="flex gap-2 items-center">
        <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-3.5 w-28 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-3 w-4/5 rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="flex gap-1 mt-1">
        <div className="h-4 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-4 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ProjectOverview({
  projectId,
  projectName,
  projectEmoji,
  onNavigate,
}: {
  projectId: number;
  projectName: string;
  projectEmoji: string | null;
  onNavigate: (view: ActiveView) => void;
}) {
  const { theme } = useTheme();
  const [data, setData] = useState<ProjectOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetch(`/api/project-overview/${projectId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  function handleCardClick(card: OverviewCard) {
    if (card.type === "project") {
      onNavigate({
        type: "project",
        id: card.id,
        name: card.name,
        emoji: card.emoji,
        color: card.color,
      });
    } else {
      // Section card — navigate back to the same project; TaskList handles section rendering
      onNavigate({
        type: "project",
        id: projectId,
        name: projectName,
        emoji: projectEmoji,
        color: null,
      });
    }
  }

  return (
    <div className={`flex flex-col h-full overflow-hidden ${theme.mainBg}`}>
      {/* ── Page header ── */}
      <div className={`px-4 sm:px-8 py-6 border-b ${theme.borderColor} flex-shrink-0`}>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
          {projectEmoji && <span className="text-2xl">{projectEmoji}</span>}
          {projectName}
        </h1>
        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
          {loading
            ? "Loading sections…"
            : data
            ? `${data.cards.length} section${data.cards.length !== 1 ? "s" : ""} · click any card to open`
            : ""}
        </p>
      </div>

      {/* ── Card grid ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : !data || data.cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-400">
            <span className="text-5xl">📂</span>
            <p className="text-sm">No sections yet in {projectName}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.cards.map((card, i) => (
              <OverviewCardTile
                key={`${card.type}-${card.id}`}
                card={card}
                index={i}
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
