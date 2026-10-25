import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const goalLogValidator = v.object({
  _id: v.id("goal_logs"),
  _creationTime: v.number(),
  userId: v.optional(v.id("users")),
  journalEntryId: v.id("journal_entries"),
  goalId: v.id("goals"),
  date: v.string(),
  met: v.boolean(),
  note: v.string(),
});

const journalEntryValidator = v.object({
  _id: v.id("journal_entries"),
  _creationTime: v.number(),
  userId: v.optional(v.id("users")),
  date: v.string(),
  reflection: v.string(),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
});

export const getEntryByDate = query({
  args: {
    date: v.string(),
  },
  returns: v.object({
    entry: v.union(journalEntryValidator, v.null()),
    goalLogs: v.array(goalLogValidator),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { entry: null, goalLogs: [] };
    }

    const entry = await ctx.db
      .query("journal_entries")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();

    if (!entry) {
      return { entry: null, goalLogs: [] };
    }

    const goalLogs = await ctx.db
      .query("goal_logs")
      .withIndex("by_journalEntryId", (q) => q.eq("journalEntryId", entry._id))
      .collect();

    return {
      entry,
      goalLogs,
    };
  },
});

export const saveEntry = mutation({
  args: {
    date: v.string(),
    reflection: v.optional(v.string()),
    goalLogs: v.optional(
      v.array(
        v.object({
          goalId: v.id("goals"),
          met: v.boolean(),
          note: v.string(),
        })
      )
    ),
  },
  returns: v.object({
    entryId: v.id("journal_entries"),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: You must be signed in to save journal entries.");
    }

    const now = Date.now();

    const entry = await ctx.db
      .query("journal_entries")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();

    let entryId = entry?._id;

    if (!entry) {
      entryId = await ctx.db.insert("journal_entries", {
        userId,
        date: args.date,
        reflection: args.reflection ?? "",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const patchData: { updatedAt: number; reflection?: string } = {
        updatedAt: now,
      };
      if (args.reflection !== undefined) {
        patchData.reflection = args.reflection;
      }
      await ctx.db.patch(entry._id, patchData);
    }

    if (args.goalLogs) {
      for (const logInput of args.goalLogs) {
        const existingLog = await ctx.db
          .query("goal_logs")
          .withIndex("by_userId_and_date", (q) =>
            q.eq("userId", userId).eq("date", args.date)
          )
          .filter((q) => q.eq(q.field("goalId"), logInput.goalId))
          .first();

        if (existingLog) {
          await ctx.db.patch(existingLog._id, {
            userId,
            journalEntryId: entryId!,
            met: logInput.met,
            note: logInput.note,
          });
        } else {
          await ctx.db.insert("goal_logs", {
            userId,
            journalEntryId: entryId!,
            goalId: logInput.goalId,
            date: args.date,
            met: logInput.met,
            note: logInput.note,
          });
        }
      }
    }

    return { entryId: entryId! };
  },
});

export const setGoalLog = mutation({
  args: {
    date: v.string(),
    goalId: v.id("goals"),
    met: v.boolean(),
    note: v.optional(v.string()),
  },
  returns: v.object({
    entryId: v.id("journal_entries"),
    logId: v.id("goal_logs"),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: You must be signed in to save goal logs.");
    }

    const now = Date.now();

    let entry = await ctx.db
      .query("journal_entries")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .first();

    let entryId = entry?._id;

    if (!entry) {
      entryId = await ctx.db.insert("journal_entries", {
        userId,
        date: args.date,
        reflection: "",
        createdAt: now,
        updatedAt: now,
      });
    }

    const existingLog = await ctx.db
      .query("goal_logs")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("goalId"), args.goalId))
      .first();

    let logId = existingLog?._id;

    if (existingLog) {
      await ctx.db.patch(existingLog._id, {
        userId,
        journalEntryId: entryId!,
        met: args.met,
        note: args.note !== undefined ? args.note : existingLog.note,
      });
    } else {
      logId = await ctx.db.insert("goal_logs", {
        userId,
        journalEntryId: entryId!,
        goalId: args.goalId,
        date: args.date,
        met: args.met,
        note: args.note ?? "",
      });
    }

    return { entryId: entryId!, logId: logId! };
  },
});

export const getRecentEntries = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      entry: journalEntryValidator,
      goalLogs: v.array(goalLogValidator),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const max = args.limit ?? 30;
    const entries = await ctx.db
      .query("journal_entries")
      .withIndex("by_userId_and_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(max);

    const result = [];
    for (const entry of entries) {
      const logs = await ctx.db
        .query("goal_logs")
        .withIndex("by_journalEntryId", (q) => q.eq("journalEntryId", entry._id))
        .collect();
      result.push({
        entry,
        goalLogs: logs,
      });
    }

    return result;
  },
});

export const getLogsByGoal = query({
  args: {
    goalId: v.id("goals"),
    limit: v.optional(v.number()),
  },
  returns: v.array(goalLogValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    const max = args.limit ?? 100;
    return await ctx.db
      .query("goal_logs")
      .withIndex("by_goalId", (q) => q.eq("goalId", args.goalId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .take(max);
  },
});

export const getAllGoalLogs = query({
  args: {},
  returns: v.array(goalLogValidator),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    return await ctx.db
      .query("goal_logs")
      .withIndex("by_userId_and_date", (q) => q.eq("userId", userId))
      .take(200);
  },
});
