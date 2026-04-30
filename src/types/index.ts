export type Label = {
  id: number;
  name: string;
  emoji: string | null;
  color: string | null;
};

export type Section = {
  id: number;
  name: string;
  order: number;
  projectId: number;
};

export type Project = {
  id: number;
  name: string;
  emoji: string | null;
  color: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  parentId: number | null;
  order: number;
  sections: Section[];
  children: Project[];
};

export type ProjectNode = Project & { childNodes: ProjectNode[] };

export type SmartView = {
  id: number;
  name: string;
  emoji: string | null;
  order: number;
};

export type TaskLabel = {
  label: Label;
};

export type Subtask = {
  id: number;
  title: string;
  status: string;
};

export type Task = {
  id: number;
  title: string;
  notes: string | null;
  status: string;
  dueAt: string | null;
  manualPriority: string | null;
  suggestedPriority: string | null;
  priorityScore: number | null;
  priorityReason: string | null;
  isBlocked: boolean;
  completedAt: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  projectId: number | null;
  sectionId: number | null;
  parentTaskId: number | null;
  project: { id: number; name: string; emoji: string | null; color: string | null } | null;
  section: { id: number; name: string } | null;
  labels: TaskLabel[];
  subtasks: Subtask[];
};

export type ActiveView =
  | { type: "inbox" }
  | { type: "today" }
  | { type: "upcoming" }
  | { type: "smartview"; id: number; name: string; emoji: string | null }
  | { type: "project"; id: number; name: string; emoji: string | null; color: string | null };
