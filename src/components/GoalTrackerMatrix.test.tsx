import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { GoalTrackerMatrix } from "./GoalTrackerMatrix";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

const mockGoals = [
  {
    _id: "goal_1",
    _creationTime: 123456789,
    name: "Morning Walk",
    active: true,
    color: "#10B981",
  },
];

const mockLogs = [
  {
    _id: "log_1",
    _creationTime: 123456789,
    journalEntryId: "entry_1",
    goalId: "goal_1",
    date: "2026-10-25",
    met: true,
    note: "Great pace",
  },
];

let callCount = 0;
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => {
    callCount++;
    if (callCount % 2 === 1) {
      return mockGoals;
    }
    return mockLogs;
  }),
}));

describe("GoalTrackerMatrix Component", () => {
  it("renders Habit Matrix header without total recorded badge", () => {
    const html = renderToString(
      React.createElement(GoalTrackerMatrix, {
        selectedDate: "2026-10-25",
        todayStr: "2026-10-25",
        onSelectDate: vi.fn(),
      })
    );

    expect(html).toContain("Habit Matrix");
    expect(html).toContain("14-Day Trajectory");
    expect(html).toContain("Morning Walk");
    expect(html).not.toContain("Total Recorded");
  });
});
