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
  role: varchar("role", { length: 20 }).notNull().default("citizen"), // citizen | moderator | authority | worker | admin
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

// ─── Departments ──────────────────────────────────────────────────────────────
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  contactEmail: varchar("contact_email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Response Teams ───────────────────────────────────────────────────────────
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  zone: varchar("zone", { length: 100 }),
  leadName: varchar("lead_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  category: varchar("category", { length: 50 }).notNull(), // garbage|burning|dust|smoke|drainage|industrial|plastic|sewage|noise|soil|other
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low|medium|high|critical
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low|medium|high|urgent
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  address: text("address"),
  wardId: integer("ward_id").references(() => wards.id),
  photoBeforeUrl: text("photo_before_url"),
  photoAfterUrl: text("photo_after_url"),
  description: text("description"),
  status: varchar("status", { length: 30 }).notNull().default("submitted"), // submitted|under_review|verified|assigned|in_progress|resolved|rejected|duplicate|needs_information
  clusterId: integer("cluster_id").references(() => clusters.id),
  isRecurringHotspot: boolean("is_recurring_hotspot").notNull().default(false),
  aiConfidence: real("ai_confidence"),
  aiVerificationResult: varchar("ai_verification_result", { length: 30 }), // resolved|not_resolved|uncertain|manual_verified
  assignedWorkerId: integer("assigned_worker_id").references(() => users.id),
  assignedDepartmentId: integer("assigned_department_id").references(() => departments.id),
  assignedTeamId: integer("assigned_team_id").references(() => teams.id),
  resolutionNotes: text("resolution_notes"),
  resolutionDepartment: varchar("resolution_department", { length: 100 }),
  resolvedByUserId: integer("resolved_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// ─── Report Evidence ──────────────────────────────────────────────────────────
export const reportEvidence = pgTable("report_evidence", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id")
    .references(() => reports.id, { onDelete: "cascade" })
    .notNull(),
  photoUrl: text("photo_url").notNull(),
  caption: text("caption"),
  evidenceType: varchar("evidence_type", { length: 30 }).default("initial").notNull(), // initial|investigation|resolution
  uploadedByUserId: integer("uploaded_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Report Status History ───────────────────────────────────────────────────
export const reportStatusHistory = pgTable("report_status_history", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id")
    .references(() => reports.id, { onDelete: "cascade" })
    .notNull(),
  oldStatus: varchar("old_status", { length: 30 }),
  newStatus: varchar("new_status", { length: 30 }).notNull(),
  changedByUserId: integer("changed_by_user_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Report Assignments ───────────────────────────────────────────────────────
export const reportAssignments = pgTable("report_assignments", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id")
    .references(() => reports.id, { onDelete: "cascade" })
    .notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  teamId: integer("team_id").references(() => teams.id),
  assignedToUserId: integer("assigned_to_user_id").references(() => users.id),
  assignedByUserId: integer("assigned_by_user_id").references(() => users.id),
  notes: text("notes"),
  status: varchar("status", { length: 30 }).default("active").notNull(), // active|completed|reassigned
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Report Community Confirmations ───────────────────────────────────────────
export const reportConfirmations = pgTable("report_confirmations", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id")
    .references(() => reports.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Official / Emergency Contacts ────────────────────────────────────────────
export const officialContacts = pgTable("official_contacts", {
  id: serial("id").primaryKey(),
  organizationName: varchar("organization_name", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  website: varchar("website", { length: 500 }),
  email: varchar("email", { length: 255 }),
  region: varchar("region", { length: 255 }).default("National / NCR").notNull(),
  contactType: varchar("contact_type", { length: 50 }).notNull(), // Emergency | Pollution Control Board | Municipal Corporation | Waste Management | Water/Sewage | Public Health | Police | Fire
  description: text("description"),
  verifiedSource: varchar("verified_source", { length: 255 }).notNull(),
  lastVerifiedDate: timestamp("last_verified_date").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Achievements / Personal Impact ───────────────────────────────────────────
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  badgeKey: varchar("badge_key", { length: 50 }).notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").references(() => users.id),
  actorEmail: varchar("actor_email", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  reportId: integer("report_id").references(() => reports.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }),
  messageKey: varchar("message_key", { length: 100 }).notNull(),
  messageParams: json("message_params").$type<Record<string, string>>(),
  link: varchar("link", { length: 255 }),
  type: varchar("type", { length: 50 }).default("status_change"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
