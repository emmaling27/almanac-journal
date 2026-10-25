import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.*s");

describe("Convex Tidelog Backend", () => {
  describe("User Settings & Tide Station Preferences", () => {
    it("returns null for unauthenticated settings lookup", async () => {
      const t = convexTest(schema, modules);
      const settings = await t.query(api.settings.getSettings, {});
      expect(settings).toBeNull();
    });

    it("saves and retrieves tide station preference when authenticated", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          name: "Captain Emma",
          email: "emma@tidelog.com",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      // Initially no settings
      const initial = await asUser.query(api.settings.getSettings, {});
      expect(initial).toBeNull();

      // Set to Crane Cove
      await asUser.mutation(api.settings.setTideStation, {
        tideStation: "crane-cove",
      });

      const updated = await asUser.query(api.settings.getSettings, {});
      expect(updated).not.toBeNull();
      expect(updated?.tideStation).toBe("crane-cove");

      // Update to Aquatic Park
      await asUser.mutation(api.settings.setTideStation, {
        tideStation: "aquatic-park",
      });

      const aquatic = await asUser.query(api.settings.getSettings, {});
      expect(aquatic?.tideStation).toBe("aquatic-park");
    });
  });

  describe("Journal Authentication Gating", () => {
    it("prevents unauthenticated users from saving journal entries", async () => {
      const t = convexTest(schema, modules);
      await expect(
        t.mutation(api.journal.saveEntry, {
          date: "2026-10-25",
          reflection: "Trying to write anonymously...",
          goalLogs: [],
        })
      ).rejects.toThrow(/Unauthorized/);
    });

    it("returns empty entry for unauthenticated requests", async () => {
      const t = convexTest(schema, modules);
      const result = await t.query(api.journal.getEntryByDate, {
        date: "2026-10-25",
      });
      expect(result.entry).toBeNull();
      expect(result.goalLogs).toEqual([]);
    });

    it("saves and reads journal entries and goal logs for authenticated users", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          name: "Captain Jack",
          email: "jack@tidelog.com",
        });
      });

      const asUser = t.withIdentity({ subject: userId });

      // Add a goal first
      const goalId = await asUser.mutation(api.goals.addGoal, {
        name: "Morning Swim at Aquatic Park",
        description: "Cold plunge at flood slack",
      });

      // Save an entry
      const { entryId } = await asUser.mutation(api.journal.saveEntry, {
        date: "2026-10-25",
        reflection: "Clear skies and calm water across Aquatic Park cove.",
        goalLogs: [
          {
            goalId,
            met: true,
            note: "Water temperature 58°F, glassy conditions",
          },
        ],
      });
      expect(entryId).toBeDefined();

      // Read back entry
      const result = await asUser.query(api.journal.getEntryByDate, {
        date: "2026-10-25",
      });
      expect(result.entry).not.toBeNull();
      expect(result.entry?.reflection).toContain("Aquatic Park cove");
      expect(result.goalLogs.length).toBe(1);
      expect(result.goalLogs[0].met).toBe(true);
      expect(result.goalLogs[0].note).toBe("Water temperature 58°F, glassy conditions");
    });

    it("enforces multi-user isolation on journal entries", async () => {
      const t = convexTest(schema, modules);

      // Create two distinct users
      const userA = await t.run(async (ctx) => {
        return await ctx.db.insert("users", { name: "User A", email: "a@test.com" });
      });
      const userB = await t.run(async (ctx) => {
        return await ctx.db.insert("users", { name: "User B", email: "b@test.com" });
      });

      const asUserA = t.withIdentity({ subject: userA });
      const asUserB = t.withIdentity({ subject: userB });

      // User A writes an entry
      await asUserA.mutation(api.journal.saveEntry, {
        date: "2026-10-25",
        reflection: "User A's confidential voyage notes",
        goalLogs: [],
      });

      // User B queries the same date - must NOT see User A's entry
      const userBResult = await asUserB.query(api.journal.getEntryByDate, {
        date: "2026-10-25",
      });
      expect(userBResult.entry).toBeNull();
      expect(userBResult.goalLogs).toEqual([]);

      // User A queries the date - sees their own entry
      const userAResult = await asUserA.query(api.journal.getEntryByDate, {
        date: "2026-10-25",
      });
      expect(userAResult.entry?.reflection).toBe("User A's confidential voyage notes");
    });

    it("enforces isolation on recent entries and habit logs", async () => {
      const t = convexTest(schema, modules);

      const userA = await t.run(async (ctx) => {
        return await ctx.db.insert("users", { name: "User A" });
      });
      const userB = await t.run(async (ctx) => {
        return await ctx.db.insert("users", { name: "User B" });
      });

      const asUserA = t.withIdentity({ subject: userA });
      const asUserB = t.withIdentity({ subject: userB });

      const goalId = await asUserA.mutation(api.goals.addGoal, {
        name: "Morning Run",
      });

      await asUserA.mutation(api.journal.saveEntry, {
        date: "2026-10-24",
        reflection: "Day 1 reflection",
        goalLogs: [{ goalId, met: true, note: "5 miles" }],
      });

      // User A sees their recent entries and logs
      const recentA = await asUserA.query(api.journal.getRecentEntries, {});
      const logsA = await asUserA.query(api.journal.getAllGoalLogs, {});
      expect(recentA.length).toBe(1);
      expect(logsA.length).toBe(1);

      // User B sees zero entries and logs
      const recentB = await asUserB.query(api.journal.getRecentEntries, {});
      const logsB = await asUserB.query(api.journal.getAllGoalLogs, {});
      expect(recentB.length).toBe(0);
      expect(logsB.length).toBe(0);
    });
  });

  describe("Goals Management & Ownership", () => {
    it("prevents unauthenticated goal additions", async () => {
      const t = convexTest(schema, modules);
      await expect(
        t.mutation(api.goals.addGoal, {
          name: "Unauthenticated Goal",
        })
      ).rejects.toThrow(/Unauthorized/);
    });

    it("seeds default nautical goals when a new user checks goals", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", { name: "New Voyager" });
      });

      const asUser = t.withIdentity({ subject: userId });

      // Initial query seeds defaults
      await asUser.mutation(api.goals.initDefaultGoals, {});
      const goals = await asUser.query(api.goals.getGoals, {});

      expect(goals.length).toBe(3);
      const names = goals.map((g) => g.name);
      expect(names).toContain("Creativity");
      expect(names).toContain("Curiosity");
      expect(names).toContain("Receptivity");

      // Calling again is idempotent and doesn't duplicate goals
      const secondCall = await asUser.mutation(api.goals.initDefaultGoals, {});
      expect(secondCall).toEqual([]);
      const goalsAfter = await asUser.query(api.goals.getGoals, {});
      expect(goalsAfter.length).toBe(3);
    });

    it("prevents a user from toggling another user's goal", async () => {
      const t = convexTest(schema, modules);

      const userA = await t.run(async (ctx) => {
        return await ctx.db.insert("users", { name: "Alice" });
      });
      const userB = await t.run(async (ctx) => {
        return await ctx.db.insert("users", { name: "Bob" });
      });

      const asUserA = t.withIdentity({ subject: userA });
      const asUserB = t.withIdentity({ subject: userB });

      const goalId = await asUserA.mutation(api.goals.addGoal, {
        name: "Alice's Secret Project",
      });

      // Bob tries to modify Alice's goal
      await expect(
        asUserB.mutation(api.goals.toggleGoalActive, {
          id: goalId,
          active: false,
        })
      ).rejects.toThrow(/Unauthorized/);
    });
  });
});
