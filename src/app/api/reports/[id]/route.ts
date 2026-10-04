import { NextRequest, NextResponse } from "next/server";
import { db, triggerDbPersistence } from "@/db";
import {
  reports,
  notifications,
  departments,
  teams,
  users,
  reportEvidence,
  reportStatusHistory,
  reportAssignments,
  reportConfirmations,
  auditLogs,
  achievements,
} from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getTokenFromRequest, isStaffRole } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reportId = parseInt(id);

  if (isNaN(reportId)) {
    return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
  }

  try {
    const payload = getTokenFromRequest(req);

    const [report] = await db
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
        departmentCode: departments.code,
        teamName: teams.name,
        reporterName: users.name,
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
      .leftJoin(users, eq(reports.userId, users.id))
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Fetch evidence gallery
    const evidence = await db
      .select({
        id: reportEvidence.id,
        photoUrl: reportEvidence.photoUrl,
        caption: reportEvidence.caption,
        evidenceType: reportEvidence.evidenceType,
        createdAt: reportEvidence.createdAt,
      })
      .from(reportEvidence)
      .where(eq(reportEvidence.reportId, reportId))
      .orderBy(desc(reportEvidence.createdAt));

    // Fetch status history timeline
    const history = await db
      .select({
        id: reportStatusHistory.id,
        oldStatus: reportStatusHistory.oldStatus,
        newStatus: reportStatusHistory.newStatus,
        notes: reportStatusHistory.notes,
        createdAt: reportStatusHistory.createdAt,
        changedByName: users.name,
      })
      .from(reportStatusHistory)
      .leftJoin(users, eq(reportStatusHistory.changedByUserId, users.id))
      .where(eq(reportStatusHistory.reportId, reportId))
      .orderBy(desc(reportStatusHistory.createdAt));

    // Fetch assignments history
    const assignments = await db
      .select({
        id: reportAssignments.id,
        departmentId: reportAssignments.departmentId,
        teamId: reportAssignments.teamId,
        departmentName: departments.name,
        teamName: teams.name,
        notes: reportAssignments.notes,
        status: reportAssignments.status,
        createdAt: reportAssignments.createdAt,
        assignedByName: users.name,
      })
      .from(reportAssignments)
      .leftJoin(departments, eq(reportAssignments.departmentId, departments.id))
      .leftJoin(teams, eq(reportAssignments.teamId, teams.id))
      .leftJoin(users, eq(reportAssignments.assignedByUserId, users.id))
      .where(eq(reportAssignments.reportId, reportId))
      .orderBy(desc(reportAssignments.createdAt));

    return NextResponse.json({
      ...report,
      displayId: `CP-${report.id}`,
      evidence,
      history,
      assignments,
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reportId = parseInt(id);

  if (isNaN(reportId)) {
    return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
  }

  try {
    const payload = getTokenFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const [existingReport] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      status,
      priority,
      assignedDepartmentId,
      assignedTeamId,
      assignedWorkerId,
      photoAfterUrl,
      resolutionNotes,
      resolutionDepartment,
      notes,
    } = body;

    // Server-side authorization check:
    // Only authorized staff (moderator, authority, worker, admin) can change status, priority, and assignments
    const isStaff = isStaffRole(payload.role);
    if (!isStaff) {
      return NextResponse.json(
        { error: "Forbidden: Only municipal authorities or moderators can update report cases." },
        { status: 403 }
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (status && status !== existingReport.status) {
      const validStatuses = [
        "submitted",
        "under_review",
        "verified",
        "assigned",
        "in_progress",
        "resolved",
        "rejected",
        "duplicate",
        "needs_information",
      ];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid report status" }, { status: 400 });
      }

      updates.status = status;

      if (status === "resolved") {
        updates.resolvedAt = new Date();
        updates.resolvedByUserId = payload.userId;
      }
    }

    if (priority) {
      const validPriorities = ["low", "medium", "high", "urgent"];
      if (validPriorities.includes(priority)) {
        updates.priority = priority;
      }
    }

    if (assignedDepartmentId !== undefined) {
      updates.assignedDepartmentId = assignedDepartmentId ? parseInt(assignedDepartmentId) : null;
    }
    if (assignedTeamId !== undefined) {
      updates.assignedTeamId = assignedTeamId ? parseInt(assignedTeamId) : null;
    }
    if (assignedWorkerId !== undefined) {
      updates.assignedWorkerId = assignedWorkerId ? parseInt(assignedWorkerId) : null;
    }
    if (photoAfterUrl !== undefined) {
      updates.photoAfterUrl = photoAfterUrl;
    }
    if (resolutionNotes !== undefined) {
      updates.resolutionNotes = resolutionNotes;
    }
    if (resolutionDepartment !== undefined) {
      updates.resolutionDepartment = resolutionDepartment;
    }

    const [updatedReport] = await db
      .update(reports)
      .set(updates)
      .where(eq(reports.id, reportId))
      .returning();

    // If new evidence was added (e.g. resolution photo)
    if (photoAfterUrl && photoAfterUrl !== existingReport.photoAfterUrl) {
      await db.insert(reportEvidence).values({
        reportId,
        photoUrl: photoAfterUrl,
        caption: resolutionNotes || "Municipal remediation verification photo",
        evidenceType: "resolution",
        uploadedByUserId: payload.userId,
      });
    }

    // If assigned to a department or team, record in reportAssignments
    if (
      (assignedDepartmentId && assignedDepartmentId !== existingReport.assignedDepartmentId) ||
      (assignedTeamId && assignedTeamId !== existingReport.assignedTeamId)
    ) {
      await db.insert(reportAssignments).values({
        reportId,
        departmentId: assignedDepartmentId ? parseInt(assignedDepartmentId) : null,
        teamId: assignedTeamId ? parseInt(assignedTeamId) : null,
        assignedToUserId: assignedWorkerId ? parseInt(assignedWorkerId) : null,
        assignedByUserId: payload.userId,
        notes: notes || "Dispatched to response unit",
        status: "active",
      });
    }

    // Record status history if status changed
    if (status && status !== existingReport.status) {
      await db.insert(reportStatusHistory).values({
        reportId,
        oldStatus: existingReport.status,
        newStatus: status,
        changedByUserId: payload.userId,
        notes: notes || resolutionNotes || `Status updated to ${status}`,
      });

      // Send real notification to reporter
      if (existingReport.userId) {
        const statusDisplayNames: Record<string, string> = {
          submitted: "Submitted",
          under_review: "Under Review",
          verified: "Verified",
          assigned: "Assigned",
          in_progress: "In Progress",
          resolved: "Resolved",
          rejected: "Closed / Rejected",
          duplicate: "Marked as Duplicate",
          needs_information: "Information Requested",
        };

        const readableStatus = statusDisplayNames[status] || status;

        await db.insert(notifications).values({
          userId: existingReport.userId,
          reportId,
          title: `Report CP-${reportId} Status: ${readableStatus}`,
          messageKey: "notifications.statusChanged",
          messageParams: { status: readableStatus, reportId: `CP-${reportId}` },
          link: `/report/${reportId}`,
          type: "status_update",
          read: false,
        });

        // Check for 'local_impact' achievement if resolved
        if (status === "resolved") {
          const resolvedCount = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(reports)
            .where(and(eq(reports.userId, existingReport.userId), eq(reports.status, "resolved")));

          if (resolvedCount[0]?.count >= 1) {
            const existingAch = await db
              .select()
              .from(achievements)
              .where(
                and(
                  eq(achievements.userId, existingReport.userId),
                  eq(achievements.badgeKey, "local_impact")
                )
              );
            if (existingAch.length === 0) {
              await db.insert(achievements).values({
                userId: existingReport.userId,
                badgeKey: "local_impact",
                title: "Local Impact",
                description: "Your reported environmental issue was successfully remediated by municipal authorities.",
              });
            }
          }
        }
      }
    }

    // Log administrative action
    await db.insert(auditLogs).values({
      actorId: payload.userId,
      actorEmail: payload.email,
      action: "REPORT_UPDATED",
      entityType: "reports",
      entityId: String(reportId),
      metadata: { changes: updates },
    });

    triggerDbPersistence();

    return NextResponse.json({
      ...updatedReport,
      displayId: `CP-${updatedReport.id}`,
    });
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}
