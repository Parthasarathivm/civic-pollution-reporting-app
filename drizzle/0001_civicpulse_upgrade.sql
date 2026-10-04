-- CivicPulse Schema Upgrade Migration
CREATE TABLE IF NOT EXISTS "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL UNIQUE,
	"description" text,
	"contact_email" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"department_id" integer REFERENCES "departments"("id"),
	"zone" varchar(100),
	"lead_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "priority" varchar(20) DEFAULT 'medium' NOT NULL;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "address" text;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "assigned_department_id" integer REFERENCES "departments"("id");
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "assigned_team_id" integer REFERENCES "teams"("id");
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "resolution_notes" text;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "resolution_department" varchar(100);
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "resolved_by_user_id" integer REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
	"photo_url" text NOT NULL,
	"caption" text,
	"evidence_type" varchar(30) DEFAULT 'initial' NOT NULL,
	"uploaded_by_user_id" integer REFERENCES "users"("id"),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
	"old_status" varchar(30),
	"new_status" varchar(30) NOT NULL,
	"changed_by_user_id" integer REFERENCES "users"("id"),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
	"department_id" integer REFERENCES "departments"("id"),
	"team_id" integer REFERENCES "teams"("id"),
	"assigned_to_user_id" integer REFERENCES "users"("id"),
	"assigned_by_user_id" integer REFERENCES "users"("id"),
	"notes" text,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_confirmations" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
	"user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "report_confirmations_unique" UNIQUE("report_id", "user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "official_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_name" varchar(255) NOT NULL,
	"department" varchar(255) NOT NULL,
	"phone_number" varchar(50) NOT NULL,
	"website" varchar(500),
	"email" varchar(255),
	"region" varchar(255) DEFAULT 'National / NCR' NOT NULL,
	"contact_type" varchar(50) NOT NULL,
	"description" text,
	"verified_source" varchar(255) NOT NULL,
	"last_verified_date" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by_user_id" integer REFERENCES "users"("id"),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"badge_key" varchar(50) NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer REFERENCES "users"("id"),
	"actor_email" varchar(255),
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(100),
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" varchar(255);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "link" varchar(255);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" varchar(50) DEFAULT 'status_change';
