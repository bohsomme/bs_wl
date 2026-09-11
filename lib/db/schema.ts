import {
  pgTable,
  text,
  boolean,
  integer,
  serial,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core"

// ── Better Auth tables ──────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }),
  updatedAt: timestamp("updatedAt", { withTimezone: true }),
})

// ── App tables ──────────────────────────────────────────────────────────────

export const exercise = pgTable("exercise", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  muscleGroup: text("muscleGroup"),
  description: text("description"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
})

export const personalBest = pgTable("personal_best", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  exerciseId: integer("exerciseId").notNull(),
  weight: numeric("weight", { precision: 8, scale: 2 }).notNull(),
  reps: integer("reps").notNull().default(1),
  setAt: timestamp("setAt", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
})

export const program = pgTable("program", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("isActive").notNull().default(false),
  startDate: text("startDate"),
  assignedAt: timestamp("assignedAt", { withTimezone: true }),
  totalWeeks: integer("totalWeeks").notNull().default(1),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
})

export const workoutTemplate = pgTable("workout_template", {
  id: serial("id").primaryKey(),
  programId: integer("programId").notNull(),
  name: text("name").notNull(),
  weekNumber: integer("weekNumber").notNull().default(1),
  dayNumber: integer("dayOfWeek").notNull(), // Program day 1?7; legacy column name
  orderInDay: integer("orderInDay").notNull().default(0),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
})

// weightType: 'fixed' | 'pb_percent' | 'rpe'
export const templateExercise = pgTable("template_exercise", {
  id: serial("id").primaryKey(),
  workoutTemplateId: integer("workoutTemplateId").notNull(),
  exerciseId: integer("exerciseId").notNull(),
  orderIndex: integer("orderIndex").notNull().default(0),
  setsMin: integer("setsMin").notNull().default(3),
  setsMax: integer("setsMax"),
  repsMin: integer("repsMin").notNull().default(5),
  repsMax: integer("repsMax"),
  weightType: text("weightType").notNull().default("fixed"), // 'fixed' | 'pb_percent' | 'rpe'
  weightValue: numeric("weightValue", { precision: 8, scale: 2 }),
  rpeTarget: numeric("rpeTarget", { precision: 4, scale: 1 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
})

export const workoutLog = pgTable("workout_log", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  workoutTemplateId: integer("workoutTemplateId"),
  programId: integer("programId"),
  name: text("name").notNull(),
  startedAt: timestamp("startedAt", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completedAt", { withTimezone: true }),
  readiness: integer("readiness"),
  barFeel: integer("barFeel"),
  preNotes: text("preNotes"),
  sessionRpe: numeric("sessionRpe", { precision: 4, scale: 1 }),
  postNotes: text("postNotes"),
  status: text("status").notNull().default("in_progress"), // 'in_progress' | 'completed'
})

export const exerciseLog = pgTable("exercise_log", {
  id: serial("id").primaryKey(),
  workoutLogId: integer("workoutLogId").notNull(),
  exerciseId: integer("exerciseId").notNull(),
  orderIndex: integer("orderIndex").notNull().default(0),
  topSetRpe: numeric("topSetRpe", { precision: 4, scale: 1 }),
  notes: text("notes"),
  skipped: boolean("skipped").notNull().default(false),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
})

export const setLog = pgTable("set_log", {
  id: serial("id").primaryKey(),
  exerciseLogId: integer("exerciseLogId").notNull(),
  setNumber: integer("setNumber").notNull(),
  isMakeup: boolean("isMakeup").notNull().default(false),
  reps: integer("reps"),
  weight: numeric("weight", { precision: 8, scale: 2 }),
  rpe: numeric("rpe", { precision: 4, scale: 1 }),
  missed: boolean("missed").notNull().default(false),
  missReason: text("missReason"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
})

// ── Types ───────────────────────────────────────────────────────────────────

export type User = typeof user.$inferSelect
export type Exercise = typeof exercise.$inferSelect
export type PersonalBest = typeof personalBest.$inferSelect
export type Program = typeof program.$inferSelect
export type WorkoutTemplate = typeof workoutTemplate.$inferSelect
export type TemplateExercise = typeof templateExercise.$inferSelect
export type WorkoutLog = typeof workoutLog.$inferSelect
export type ExerciseLog = typeof exerciseLog.$inferSelect
export type SetLog = typeof setLog.$inferSelect
