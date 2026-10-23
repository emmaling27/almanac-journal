import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  user_settings: defineTable({
    userId: v.id("users"),
    tideStation: v.string(), // "aquatic-park" | "crane-cove"
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  goals: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    active: v.boolean(),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_active", ["active"])
    .index("by_userId", ["userId"])
    .index("by_userId_and_active", ["userId", "active"]),

  journal_entries: defineTable({
    userId: v.optional(v.id("users")),
    date: v.string(), // YYYY-MM-DD
    reflection: v.string(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_date", ["date"])
    .index("by_userId_and_date", ["userId", "date"]),

  goal_logs: defineTable({
    userId: v.optional(v.id("users")),
    journalEntryId: v.id("journal_entries"),
    goalId: v.id("goals"),
    date: v.string(), // YYYY-MM-DD
    met: v.boolean(),
    note: v.string(),
  })
    .index("by_journalEntryId", ["journalEntryId"])
    .index("by_goalId", ["goalId"])
    .index("by_date", ["date"])
    .index("by_goalId_and_date", ["goalId", "date"])
    .index("by_userId_and_date", ["userId", "date"]),
});
