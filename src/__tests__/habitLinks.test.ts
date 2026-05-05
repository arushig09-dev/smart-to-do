import { describe, it, expect } from "vitest";
import {
  suggestHabitLink,
  resolveLink,
  buildLinkOptions,
  ALL_LINK_RULES,
} from "@/lib/habitLinks";

// Fake user project/section tree — mirrors what the DB returns for a real user
const USER_PROJECTS = [
  {
    id: 10,
    name: "Fitness & Wellness",
    sections: [
      { id: 101, name: "Workouts" },
      { id: 102, name: "Nutrition & Meal Prep" },
      { id: 103, name: "Sleep & Recovery" },
      { id: 104, name: "Self-care" },
    ],
  },
  {
    id: 20,
    name: "Books & Podcasts",
    sections: [{ id: 201, name: "On the List" }],
  },
  {
    id: 30,
    name: "Courses & Skills",
    sections: [{ id: 301, name: "In Progress" }],
  },
  {
    id: 40,
    name: "Personal Goals",
    sections: [{ id: 401, name: "Long-term Goals" }],
  },
  {
    id: 50,
    name: "Day-to-day Logistics",
    sections: [{ id: 501, name: "Home & Supplies" }],
  },
];

describe("suggestHabitLink — keyword matching", () => {
  it("'Meditation' → Fitness & Wellness › Self-care", () => {
    const r = suggestHabitLink("Meditation");
    expect(r).not.toBeNull();
    expect(r!.projectName).toBe("Fitness & Wellness");
    expect(r!.sectionName).toBe("Self-care");
  });

  it("'workout' → Fitness & Wellness › Workouts", () => {
    const r = suggestHabitLink("workout");
    expect(r!.sectionName).toBe("Workouts");
  });

  it("'Steps' (walking) → Workouts", () => {
    const r = suggestHabitLink("Steps");
    expect(r!.sectionName).toBe("Workouts");
  });

  it("'Hydration' → Nutrition & Meal Prep", () => {
    const r = suggestHabitLink("Hydration");
    expect(r!.sectionName).toBe("Nutrition & Meal Prep");
  });

  it("'sleep' → Sleep & Recovery", () => {
    const r = suggestHabitLink("sleep");
    expect(r!.sectionName).toBe("Sleep & Recovery");
  });

  it("'no phone' → Sleep & Recovery", () => {
    const r = suggestHabitLink("no phone");
    expect(r!.sectionName).toBe("Sleep & Recovery");
  });

  it("'Reading' → Books & Podcasts › On the List", () => {
    const r = suggestHabitLink("Reading");
    expect(r!.projectName).toBe("Books & Podcasts");
    expect(r!.sectionName).toBe("On the List");
  });

  it("'language' (Duolingo-style) → Courses & Skills › In Progress", () => {
    const r = suggestHabitLink("language");
    expect(r!.projectName).toBe("Courses & Skills");
    expect(r!.sectionName).toBe("In Progress");
  });

  it("'cooking' → Day-to-day Logistics › Home & Supplies", () => {
    const r = suggestHabitLink("cooking");
    expect(r!.projectName).toBe("Day-to-day Logistics");
  });

  it("returns null when no keyword matches", () => {
    expect(suggestHabitLink("")).toBeNull();
    expect(suggestHabitLink("My custom habit XYZ")).toBeNull();
  });

  it("matching is case-insensitive", () => {
    expect(suggestHabitLink("MEDITATION")).not.toBeNull();
    expect(suggestHabitLink("Workout")).not.toBeNull();
  });

  it("returns only name-based info — no projectId or sectionId fields", () => {
    const r = suggestHabitLink("workout");
    expect(r).not.toHaveProperty("projectId");
    expect(r).not.toHaveProperty("sectionId");
  });
});

describe("resolveLink — maps names → real IDs from user data", () => {
  it("resolves a known project + section to correct IDs", () => {
    const suggestion = suggestHabitLink("Meditation")!;
    const resolved = resolveLink(suggestion, USER_PROJECTS);
    expect(resolved).not.toBeNull();
    expect(resolved!.projectId).toBe(10);
    expect(resolved!.sectionId).toBe(104); // Self-care
  });

  it("resolves workouts correctly", () => {
    const resolved = resolveLink(
      { projectName: "Fitness & Wellness", sectionName: "Workouts", label: "Fitness & Wellness › Workouts" },
      USER_PROJECTS
    );
    expect(resolved!.sectionId).toBe(101);
  });

  it("returns null when project name is not in user data", () => {
    const resolved = resolveLink(
      { projectName: "Nonexistent Project", sectionName: "Workouts", label: "X" },
      USER_PROJECTS
    );
    expect(resolved).toBeNull();
  });

  it("returns null when section name is not in the matched project", () => {
    const resolved = resolveLink(
      { projectName: "Fitness & Wellness", sectionName: "Ghost Section", label: "X" },
      USER_PROJECTS
    );
    expect(resolved).toBeNull();
  });

  it("is case-insensitive for both project and section name", () => {
    const resolved = resolveLink(
      { projectName: "fitness & wellness", sectionName: "workouts", label: "X" },
      USER_PROJECTS
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.projectId).toBe(10);
  });

  it("preserves the original label string in the resolved object", () => {
    const suggestion = suggestHabitLink("Reading")!;
    const resolved = resolveLink(suggestion, USER_PROJECTS)!;
    expect(resolved.label).toBe("Books & Podcasts › On the List");
  });
});

describe("buildLinkOptions — builds live picker options from user projects", () => {
  it("returns an array of ResolvedLinks for each matching project/section", () => {
    const opts = buildLinkOptions(USER_PROJECTS);
    expect(opts.length).toBeGreaterThan(0);
    opts.forEach((o) => {
      expect(o).toHaveProperty("projectId");
      expect(o).toHaveProperty("sectionId");
      expect(o).toHaveProperty("label");
    });
  });

  it("includes all resolvable sections from ALL_LINK_RULES", () => {
    // ALL_LINK_RULES has 8 unique rules; all should resolve with our full user project set
    const opts = buildLinkOptions(USER_PROJECTS);
    expect(opts.length).toBe(ALL_LINK_RULES.length);
  });

  it("omits rules whose project doesn't exist in the user's data", () => {
    const limitedProjects = [USER_PROJECTS[0]]; // Only Fitness & Wellness
    const opts = buildLinkOptions(limitedProjects);
    // Only Fitness & Wellness sections should appear
    expect(opts.every((o) => o.projectId === 10)).toBe(true);
  });

  it("returns empty array if user has no matching projects", () => {
    const opts = buildLinkOptions([
      { id: 99, name: "Shopping", sections: [{ id: 999, name: "To Buy" }] },
    ]);
    expect(opts).toHaveLength(0);
  });

  it("each option has correct IDs from the user's actual data, not hardcoded values", () => {
    // Simulate a second user whose IDs are completely different
    const otherUser = [
      { id: 500, name: "Fitness & Wellness", sections: [{ id: 5001, name: "Workouts" }] },
    ];
    const opts = buildLinkOptions(otherUser);
    expect(opts[0].projectId).toBe(500);
    expect(opts[0].sectionId).toBe(5001);
  });
});
