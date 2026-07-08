import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, parseInt(id)))
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const payload = getTokenFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      status,
      assignedWorkerId,
      photoAfterUrl,
      aiVerificationResult,
      resolvedAt,
    } = body;

    const [existingReport] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, parseInt(id)))
      .limit(1);

    if (!existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const updates: Partial<typeof existingReport> = {};
    if (status) updates.status = status;
    if (assignedWorkerId !== undefined)
      updates.assignedWorkerId = assignedWorkerId;
    if (photoAfterUrl !== undefined) updates.photoAfterUrl = photoAfterUrl;
    if (aiVerificationResult !== undefined)
      updates.aiVerificationResult = aiVerificationResult;
    if (resolvedAt !== undefined)
      updates.resolvedAt = resolvedAt ? new Date(resolvedAt) : null;

    const [updatedReport] = await db
      .update(reports)
      .set(updates)
      .where(eq(reports.id, parseInt(id)))
      .returning();

    // Create notification for the report owner if status changed
    if (status && existingReport.userId && existingReport.status !== status) {
      const messageKeyMap: Record<string, string> = {
        assigned: "notifications.reportAssigned",
        inProgress: "notifications.statusChanged",
        resolved: "notifications.reportResolved",
        verified: "notifications.reportVerified",
      };

      const messageKey = messageKeyMap[status] || "notifications.statusChanged";

      await db.insert(notifications).values({
        userId: existingReport.userId,
        reportId: parseInt(id),
        messageKey,
        messageParams: { status },
        read: false,
      });
    }

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}
