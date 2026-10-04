import { NextRequest, NextResponse } from "next/server";
import { db, triggerDbPersistence } from "@/db";
import {
  reports,
  notifications,
  wards,
  departments,
  teams,
  reportEvidence,
  reportStatusHistory,
  reportConfirmations,
  achievements,
} from "@/db/schema";
import { desc, eq, and, sql, or, ilike } from "drizzle-orm";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const payload = getTokenFromRequest(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const severity = url.searchParams.get("severity");
    const priority = url.searchParams.get("priority");
    const recurringOnly = url.searchParams.get("recurringOnly") === "true";
    const mineOnly = url.searchParams.get("mineOnly") === "true";
    const search = url.searchParams.get("search")?.trim();
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 300);

    // Build conditions
    const conditions = [];
    if (status && status !== "all") {
      // Map legacy statuses if any
      const normalizedStatus = status === "reported" ? "submitted" : status === "inProgress" ? "in_progress" : status;
      conditions.push(eq(reports.status, normalizedStatus));
    }
    if (category && category !== "all") {
      conditions.push(eq(reports.category, category));
    }
    if (severity && severity !== "all") {
      conditions.push(eq(reports.severity, severity));
    }
    if (priority && priority !== "all") {
      conditions.push(eq(reports.priority, priority));
    }
    if (recurringOnly) {
      conditions.push(eq(reports.isRecurringHotspot, true));
    }
    if (mineOnly && payload?.userId) {
      conditions.push(eq(reports.userId, payload.userId));
    }
    if (search) {
      // Search report ID if starts with CP- or numeric
      const numericSearch = search.replace(/^cp-?/i, "");
      if (!isNaN(Number(numericSearch)) && numericSearch.length > 0) {
        conditions.push(
          or(
            eq(reports.id, Number(numericSearch)),
            ilike(reports.description, `%${search}%`),
            ilike(reports.address, `%${search}%`),
            ilike(reports.category, `%${search}%`)
          )
        );
      } else {
        conditions.push(
          or(
            ilike(reports.description, `%${search}%`),
            ilike(reports.address, `%${search}%`),
            ilike(reports.category, `%${search}%`)
          )
        );
      }
    }

    const allReports = await db
      .select({
        id: reports.id,
        userId: reports.userId,
        category: reports.category,
        severity: reports.severity,
        priority: reports.priority,
        lat: reports.lat,
        lng: reports.lng,
        address: reports.address,
        wardId: reports.wardId,
        photoBeforeUrl: reports.photoBeforeUrl,
        photoAfterUrl: reports.photoAfterUrl,
        description: reports.description,
        status: reports.status,
        clusterId: reports.clusterId,
        isRecurringHotspot: reports.isRecurringHotspot,
        aiConfidence: reports.aiConfidence,
        aiVerificationResult: reports.aiVerificationResult,
        assignedWorkerId: reports.assignedWorkerId,
        assignedDepartmentId: reports.assignedDepartmentId,
        assignedTeamId: reports.assignedTeamId,
        resolutionNotes: reports.resolutionNotes,
        resolutionDepartment: reports.resolutionDepartment,
        resolvedByUserId: reports.resolvedByUserId,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
        resolvedAt: reports.resolvedAt,
        departmentName: departments.name,
        teamName: teams.name,
        confirmationCount: sql<number>`(
          SELECT COUNT(*)::int FROM report_confirmations
          WHERE report_confirmations.report_id = ${reports.id}
        )`,
        hasConfirmed: payload?.userId
          ? sql<boolean>`EXISTS (
              SELECT 1 FROM report_confirmations
              WHERE report_confirmations.report_id = ${reports.id}
                AND report_confirmations.user_id = ${payload.userId}
            )`
          : sql<boolean>`false`,
      })
      .from(reports)
      .leftJoin(departments, eq(reports.assignedDepartmentId, departments.id))
      .leftJoin(teams, eq(reports.assignedTeamId, teams.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reports.createdAt))
      .limit(limit);

    return NextResponse.json(allReports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getTokenFromRequest(req);
    const body = await req.json();

    const {
      category,
      severity = "medium",
      priority,
      lat,
      lng,
      address,
      photoBeforeUrl,
      description,
      wardId,
    } = body;

    if (!category || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: "Category, latitude, and longitude are required" },
        { status: 400 }
      );
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return NextResponse.json(
        { error: "Valid latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Default priority based on severity if not provided
    const calculatedPriority =
      priority ||
      (severity === "critical"
        ? "urgent"
        : severity === "high"
        ? "high"
        : severity === "low"
        ? "low"
        : "medium");

    const [newReport] = await db
      .insert(reports)
      .values({
        userId: payload?.userId || null,
        category,
        severity,
        priority: calculatedPriority,
        lat: parsedLat,
        lng: parsedLng,
        address: address?.trim() || null,
        wardId: wardId ? parseInt(wardId) : null,
        photoBeforeUrl: photoBeforeUrl || null,
        description: description?.trim() || null,
        status: "submitted",
        isRecurringHotspot: false,
      })
      .returning();

    // Record initial status history
    await db.insert(reportStatusHistory).values({
      reportId: newReport.id,
      oldStatus: null,
      newStatus: "submitted",
      changedByUserId: payload?.userId || null,
      notes: "Citizen report submitted via CivicPulse portal.",
    });

    // Record evidence if photo was provided
    if (photoBeforeUrl) {
      await db.insert(reportEvidence).values({
        reportId: newReport.id,
        photoUrl: photoBeforeUrl,
        caption: "Citizen initial submission photo evidence",
        evidenceType: "initial",
        uploadedByUserId: payload?.userId || null,
      });
    }

    // Send notification to user
    if (payload?.userId) {
      await db.insert(notifications).values({
        userId: payload.userId,
        reportId: newReport.id,
        title: `Report CP-${newReport.id} Submitted`,
        messageKey: "notifications.reportReceived",
        messageParams: { reportId: `CP-${newReport.id}`, category },
        link: `/report/${newReport.id}`,
        type: "report_submitted",
        read: false,
      });

      // Check if user earned 'first_report' achievement
      const userReportsCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(reports)
        .where(eq(reports.userId, payload.userId));

      if (userReportsCount[0]?.count === 1) {
        const existingAch = await db
          .select()
          .from(achievements)
          .where(
            and(
              eq(achievements.userId, payload.userId),
              eq(achievements.badgeKey, "first_report")
            )
          );
        if (existingAch.length === 0) {
          await db.insert(achievements).values({
            userId: payload.userId,
            badgeKey: "first_report",
            title: "First Report",
            description: "Submitted your first environmental report for municipal remediation.",
          });
        }
      }
    }

    triggerDbPersistence();

    // Trigger clustering in background (non-blocking)
    fetch(`${req.nextUrl.origin}/api/clusters/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});

    return NextResponse.json(
      {
        ...newReport,
        displayId: `CP-${newReport.id}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: "Failed to submit report. Please check inputs and retry." },
      { status: 500 }
    );
  }
}
