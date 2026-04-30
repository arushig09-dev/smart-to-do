export type Priority = "P0" | "P1" | "P2";

export interface PrioritySuggestion {
  score: number;
  priority: Priority;
  reason: string;
}

interface TaskInput {
  manualPriority: string | null;
  dueAt: Date | null;
  isBlocked: boolean;
  updatedAt: Date;
}

export function suggestPriority(task: TaskInput): PrioritySuggestion {
  const now = new Date();
  const reasons: string[] = [];
  let score = 0;

  if (task.isBlocked) {
    score -= 100;
    reasons.push("Blocked");
  }

  if (task.dueAt) {
    const hoursUntilDue = (task.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue < 0) {
      score += 50;
      reasons.push("Overdue");
    } else if (hoursUntilDue <= 24) {
      score += 35;
      reasons.push("Due in 24h");
    } else if (hoursUntilDue <= 72) {
      score += 20;
      reasons.push("Due in 3 days");
    }
  }

  const ageHours = (now.getTime() - task.updatedAt.getTime()) / (1000 * 60 * 60);
  if (ageHours <= 12) {
    score += 3;
    reasons.push("Recently updated");
  }

  if (task.manualPriority) {
    if (task.manualPriority === "P0") {
      score += 100;
      reasons.push("Manual P0");
    } else if (task.manualPriority === "P1") {
      score += 60;
      reasons.push("Manual P1");
    } else {
      score += 30;
      reasons.push("Manual P2");
    }
  }

  let priority: Priority;
  if (score >= 80) priority = "P0";
  else if (score >= 40) priority = "P1";
  else priority = "P2";

  return {
    score,
    priority,
    reason: reasons.length ? reasons.join(", ") : "No strong signals",
  };
}
