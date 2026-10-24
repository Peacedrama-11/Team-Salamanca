import { pgTable, text, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod/v4";

// Only public vacancy metadata is persisted. No profile/contact data goes here.
export const jobBoardsCache = pgTable("job_boards_cache", {
  key: text("key").primaryKey(),
  provider: text("provider").notNull(),
  company: text("company").notNull(),
  jobs: jsonb("jobs").notNull().default([]),
  state: text("state").notNull().default("pending"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }),
  count: integer("count").notNull().default(0),
});
export const insertJobBoardSchema = createInsertSchema(jobBoardsCache);
export type InsertJobBoard = z.infer<typeof insertJobBoardSchema>;
export type CachedJobBoard = typeof jobBoardsCache.$inferSelect;

export const jobCollectionControl = pgTable("job_collection_control", {
  key: text("key").primaryKey(),
  token: text("token"),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
});
export const insertJobControlSchema = createInsertSchema(jobCollectionControl);
export type InsertJobControl = z.infer<typeof insertJobControlSchema>;
