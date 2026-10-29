import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { JournalEditor } from "./JournalEditor";

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

const mockEntry = {
  entry: {
    _id: "entry_1",
    _creationTime: 123456789,
    date: "2026-10-25",
    reflection: "Calm morning waters.",
  },
  goalLogs: [
    {
      _id: "log_1",
      _creationTime: 123456789,
      journalEntryId: "entry_1",
      goalId: "goal_1",
      date: "2026-10-25",
      met: true,
      note: "Walked along the coast",
    },
  ],
};

let callCount = 0;
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => {
    callCount++;
    if (callCount % 2 === 1) {
      return mockGoals;
    }
    return mockEntry;
  }),
  useMutation: vi.fn(() => vi.fn()),
}));

describe("JournalEditor Component", () => {
  it("does not include AI analysis text", () => {
    const html = renderToString(
      React.createElement(JournalEditor, {
        selectedDate: "2026-10-25",
      })
    );

    expect(html).toContain("Daily Navigational Goals");
    expect(html).toContain("Observations &amp; Context");
    expect(html.toLowerCase()).not.toContain("ai analysis");
    expect(html.toLowerCase()).not.toContain("ai trajectory analysis");
  });
});
