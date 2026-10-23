import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  goals: defineTable({
    name: v.string(),
    active: v.boolean(),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  }).index("by_active", ["active"]),

  journal_entries: defineTable({
    date: v.string(), // YYYY-MM-DD
    reflection: v.string(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_date", ["date"]),

  goal_logs: defineTable({
    journalEntryId: v.id("journal_entries"),
    goalId: v.id("goals"),
    date: v.string(), // YYYY-MM-DD
    met: v.boolean(),
    note: v.string(),
  })
    .index("by_journalEntryId", ["journalEntryId"])
    .index("by_goalId", ["goalId"])
    .index("by_date", ["date"])
    .index("by_goalId_and_date", ["goalId", "date"]),
});
