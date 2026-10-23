import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getSettings = query({
  args: {},
  returns: v.union(
    v.object({
      tideStation: v.string(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const settings = await ctx.db
      .query("user_settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!settings) {
      return null;
    }

    return {
      tideStation: settings.tideStation,
      updatedAt: settings.updatedAt,
    };
  },
});

export const setTideStation = mutation({
  args: {
    tideStation: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { success: false };
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("user_settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tideStation: args.tideStation,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("user_settings", {
        userId,
        tideStation: args.tideStation,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

export const currentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      image: user.image,
    };
  },
});
