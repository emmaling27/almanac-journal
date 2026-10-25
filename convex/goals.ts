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

export const initDefaultGoals = mutation({
  args: {},
  returns: v.array(v.id("goals")),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    const existing = await ctx.db
      .query("goals")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(1);
    if (existing.length > 0) {
      return [];
    }
    const defaults = [
      { name: "Creativity", color: "#3B82F6", description: "Making, expressing, composing, or generating new ideas" },
      { name: "Curiosity", color: "#10B981", description: "Learning, asking questions, exploring unknown waters" },
      { name: "Receptivity", color: "#F59E0B", description: "Attentive listening, presence, openness to shifting tides" },
    ];
    const ids = [];
    for (const g of defaults) {
      const id = await ctx.db.insert("goals", {
        userId,
        name: g.name,
        active: true,
        color: g.color,
        description: g.description,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});
