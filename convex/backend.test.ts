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

    it("supports partial auto-saving of reflections and goal logs independently", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", { name: "Captain Autosave" });
      });
      const asUser = t.withIdentity({ subject: userId });

      const goalId = await asUser.mutation(api.goals.addGoal, {
        name: "Morning Journaling",
      });

      // 1. Auto-save reflection first (no goal logs provided)
      await asUser.mutation(api.journal.saveEntry, {
        date: "2026-10-25",
        reflection: "Drafting the morning tide observations...",
      });

      let check = await asUser.query(api.journal.getEntryByDate, {
        date: "2026-10-25",
      });
      expect(check.entry?.reflection).toBe("Drafting the morning tide observations...");
      expect(check.goalLogs.length).toBe(0);

      // 2. Auto-save goal log without re-passing reflection
      await asUser.mutation(api.journal.saveEntry, {
        date: "2026-10-25",
        goalLogs: [{ goalId, met: true, note: "Written with morning coffee" }],
      });

      check = await asUser.query(api.journal.getEntryByDate, {
        date: "2026-10-25",
      });
      // Existing reflection must be preserved
      expect(check.entry?.reflection).toBe("Drafting the morning tide observations...");
      expect(check.goalLogs.length).toBe(1);
      expect(check.goalLogs[0].met).toBe(true);
      expect(check.goalLogs[0].note).toBe("Written with morning coffee");
    });

    it("allows reactive goal toggles via setGoalLog with auth gating", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", { name: "First Mate" });
      });

      const goalId = await t.run(async (ctx) => {
        return await ctx.db.insert("goals", {
          name: "Evening Slack Swim",
          active: true,
        });
      });

      // Unauthenticated fails
      await expect(
        t.mutation(api.journal.setGoalLog, {
          date: "2026-10-25",
          goalId,
          met: true,
        })
      ).rejects.toThrow(/Unauthorized/);

      const asUser = t.withIdentity({ subject: userId });

      // Toggle goal on a fresh date with no existing journal entry
      const { entryId, logId } = await asUser.mutation(api.journal.setGoalLog, {
        date: "2026-10-25",
        goalId,
        met: true,
        note: "Swam at 6:00 PM slack tide",
      });
      expect(entryId).toBeDefined();
      expect(logId).toBeDefined();

      const entry = await asUser.query(api.journal.getEntryByDate, {
        date: "2026-10-25",
      });
      expect(entry.entry).not.toBeNull();
      expect(entry.goalLogs[0].met).toBe(true);
      expect(entry.goalLogs[0].note).toBe("Swam at 6:00 PM slack tide");

      // Toggle back to not met
      await asUser.mutation(api.journal.setGoalLog, {
        date: "2026-10-25",
        goalId,
        met: false,
      });

      const updated = await asUser.query(api.journal.getEntryByDate, {
        date: "2026-10-25",
      });
      expect(updated.goalLogs[0].met).toBe(false);
      // Note is preserved when not provided
      expect(updated.goalLogs[0].note).toBe("Swam at 6:00 PM slack tide");
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

    it("does not auto-populate default goals; new users start with empty goals", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", { name: "New Voyager" });
      });

      const asUser = t.withIdentity({ subject: userId });

      // Starts empty
      const initialGoals = await asUser.query(api.goals.getGoals, {});
      expect(initialGoals).toEqual([]);

      // User adds their own custom goals
      const goalId = await asUser.mutation(api.goals.addGoal, {
        name: "Morning Cold Plunge",
        description: "Bay swim before breakfast",
        color: "#059669",
      });

      const goalsAfter = await asUser.query(api.goals.getGoals, {});
      expect(goalsAfter.length).toBe(1);
      expect(goalsAfter[0]._id).toBe(goalId);
      expect(goalsAfter[0].name).toBe("Morning Cold Plunge");
    });

    it("prevents a user from toggling, updating, or deleting another user's goal", async () => {
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

      // User B only sees their own goals (0)
      const userBGoals = await asUserB.query(api.goals.getGoals, {});
      expect(userBGoals.length).toBe(0);

      // Bob tries to modify Alice's goal
      await expect(
        asUserB.mutation(api.goals.toggleGoalActive, {
          id: goalId,
          active: false,
        })
      ).rejects.toThrow(/Unauthorized/);

      // Bob tries to update Alice's goal
      await expect(
        asUserB.mutation(api.goals.updateGoal, {
          id: goalId,
          name: "Hacked",
        })
      ).rejects.toThrow(/Unauthorized/);

      // Bob tries to delete Alice's goal
      await expect(
        asUserB.mutation(api.goals.deleteGoal, {
          id: goalId,
        })
      ).rejects.toThrow(/Unauthorized/);

      // Alice can successfully toggle, update, and delete her own goal
      await asUserA.mutation(api.goals.updateGoal, {
        id: goalId,
        name: "Alice's Published Project",
      });
      let aliceGoals = await asUserA.query(api.goals.getGoals, {});
      expect(aliceGoals[0].name).toBe("Alice's Published Project");

      await asUserA.mutation(api.goals.deleteGoal, {
        id: goalId,
      });
      aliceGoals = await asUserA.query(api.goals.getGoals, {});
      expect(aliceGoals.length).toBe(0);
    });
  });
});
