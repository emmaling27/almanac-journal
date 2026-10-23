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
    const entry = await ctx.db
      .query("journal_entries")
      .withIndex("by_date", (q) => q.eq("date", args.date))
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
    reflection: v.string(),
    goalLogs: v.array(
      v.object({
        goalId: v.id("goals"),
        met: v.boolean(),
        note: v.string(),
      })
    ),
  },
  returns: v.object({
    entryId: v.id("journal_entries"),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const userId = await getAuthUserId(ctx);

    const entry = await ctx.db
      .query("journal_entries")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    let entryId = entry?._id;

    if (!entry) {
      entryId = await ctx.db.insert("journal_entries", {
        userId: userId ?? undefined,
        date: args.date,
        reflection: args.reflection,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(entry._id, {
        ...(userId && !entry.userId ? { userId } : {}),
        reflection: args.reflection,
        updatedAt: now,
      });
    }

    for (const logInput of args.goalLogs) {
      const existingLog = await ctx.db
        .query("goal_logs")
        .withIndex("by_goalId_and_date", (q) =>
          q.eq("goalId", logInput.goalId).eq("date", args.date)
        )
        .first();

      if (existingLog) {
        await ctx.db.patch(existingLog._id, {
          ...(userId && !existingLog.userId ? { userId } : {}),
          journalEntryId: entryId!,
          met: logInput.met,
          note: logInput.note,
        });
      } else {
        await ctx.db.insert("goal_logs", {
          userId: userId ?? undefined,
          journalEntryId: entryId!,
          goalId: logInput.goalId,
          date: args.date,
          met: logInput.met,
          note: logInput.note,
        });
      }
    }

    return { entryId: entryId! };
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
    const max = args.limit ?? 30;
    const entries = await ctx.db
      .query("journal_entries")
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
    const max = args.limit ?? 100;
    return await ctx.db
      .query("goal_logs")
      .withIndex("by_goalId", (q) => q.eq("goalId", args.goalId))
      .take(max);
  },
});

export const getAllGoalLogs = query({
  args: {},
  returns: v.array(goalLogValidator),
  handler: async (ctx) => {
    return await ctx.db.query("goal_logs").take(200);
  },
});
