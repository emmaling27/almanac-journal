import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getGoals = query({
  args: {
    onlyActive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("goals"),
      _creationTime: v.number(),
      userId: v.optional(v.id("users")),
      name: v.string(),
      active: v.boolean(),
      color: v.optional(v.string()),
      description: v.optional(v.string()),
      createdAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const userGoals = await ctx.db
      .query("goals")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (args.onlyActive) {
      return userGoals.filter((g) => g.active);
    }
    return userGoals;
  },
});

export const addGoal = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.id("goals"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: You must be signed in to add goals.");
    }
    const trimmed = args.name.trim();
    if (!trimmed) {
      throw new Error("Goal name cannot be empty");
    }
    return await ctx.db.insert("goals", {
      userId,
      name: trimmed,
      active: true,
      color: args.color,
      description: args.description,
      createdAt: Date.now(),
    });
  },
});

export const toggleGoalActive = mutation({
  args: {
    id: v.id("goals"),
    active: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: You must be signed in to modify goals.");
    }
    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== userId) {
      throw new Error("Unauthorized: Goal not found or access denied.");
    }
    await ctx.db.patch(args.id, { active: args.active });
    return null;
  },
});

export const updateGoal = mutation({
  args: {
    id: v.id("goals"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: You must be signed in to modify goals.");
    }
    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== userId) {
      throw new Error("Unauthorized: Goal not found or access denied.");
    }
    const patch: Record<string, any> = {};
    if (args.name !== undefined) {
      const trimmed = args.name.trim();
      if (!trimmed) throw new Error("Goal name cannot be empty");
      patch.name = trimmed;
    }
    if (args.description !== undefined) {
      patch.description = args.description.trim() || undefined;
    }
    if (args.color !== undefined) {
      patch.color = args.color;
    }
    if (args.active !== undefined) {
      patch.active = args.active;
    }
    await ctx.db.patch(args.id, patch);
    return null;
  },
});

export const deleteGoal = mutation({
  args: {
    id: v.id("goals"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: You must be signed in to delete goals.");
    }
    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== userId) {
      throw new Error("Unauthorized: Goal not found or access denied.");
    }
    await ctx.db.delete(args.id);
    return null;
  },
});
