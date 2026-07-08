import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  real,
  boolean,
  timestamp,
  json,
} from "drizzle-orm/pg-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("citizen"), // citizen | worker | admin
  preferredLanguage: varchar("preferred_language", { length: 5 }).default("en"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Wards ────────────────────────────────────────────────────────────────────
export const wards = pgTable("wards", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  populationDensity: integer("population_density").notNull().default(5000),
  city: varchar("city", { length: 255 }).notNull().default("Demo City"),
});

// ─── Clusters ─────────────────────────────────────────────────────────────────
export const clusters = pgTable("clusters", {
  id: serial("id").primaryKey(),
  centerLat: real("center_lat").notNull(),
  centerLng: real("center_lng").notNull(),
  reportCount: integer("report_count").notNull().default(0),
  firstSeen: timestamp("first_seen").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  category: varchar("category", { length: 50 }).notNull(), // garbage|burning|dust|smoke|drainage|industrial|other
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low|medium|high|critical
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  wardId: integer("ward_id").references(() => wards.id),
  photoBeforeUrl: text("photo_before_url"),
  photoAfterUrl: text("photo_after_url"),
  description: text("description"),
  status: varchar("status", { length: 30 }).notNull().default("reported"), // reported|assigned|inProgress|resolved|verified
  clusterId: integer("cluster_id").references(() => clusters.id),
  isRecurringHotspot: boolean("is_recurring_hotspot").notNull().default(false),
  aiConfidence: real("ai_confidence"),
  aiVerificationResult: varchar("ai_verification_result", { length: 20 }), // resolved|not_resolved|uncertain
  assignedWorkerId: integer("assigned_worker_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// ─── Routes ───────────────────────────────────────────────────────────────────
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id")
    .references(() => users.id)
    .notNull(),
  date: timestamp("date").defaultNow().notNull(),
  orderedReportIds: json("ordered_report_ids").$type<number[]>().notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active|completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  reportId: integer("report_id").references(() => reports.id),
  messageKey: varchar("message_key", { length: 100 }).notNull(),
  messageParams: json("message_params").$type<Record<string, string>>(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
