import { NextRequest, NextResponse } from "next/server";
import { db, triggerDbPersistence } from "@/db";
import { reports, reportConfirmations, achievements } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getTokenFromRequest } from "@/lib/auth";

export async function POST(
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
      return NextResponse.json(
        { error: "Please log in to confirm this community issue" },
        { status: 401 }
      );
    }

    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Prevent self-confirmation abuse
    if (report.userId === payload.userId) {
      return NextResponse.json(
        { error: "You cannot confirm an issue you submitted yourself" },
        { status: 400 }
      );
    }

    // Check if already confirmed
    const [existing] = await db
      .select()
      .from(reportConfirmations)
      .where(
        and(
          eq(reportConfirmations.reportId, reportId),
          eq(reportConfirmations.userId, payload.userId)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "You have already confirmed this issue" },
        { status: 409 }
      );
    }

    await db.insert(reportConfirmations).values({
      reportId,
      userId: payload.userId,
      notes: "Community member confirmed seeing this issue",
    });

    // Check if user earned 'community_contributor' achievement (confirmed 3+ reports)
    const userConfirmations = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reportConfirmations)
      .where(eq(reportConfirmations.userId, payload.userId));

    if (userConfirmations[0]?.count >= 3) {
      const [existingAch] = await db
        .select()
        .from(achievements)
        .where(
          and(
            eq(achievements.userId, payload.userId),
            eq(achievements.badgeKey, "community_contributor")
          )
        )
        .limit(1);

      if (!existingAch) {
        await db.insert(achievements).values({
          userId: payload.userId,
          badgeKey: "community_contributor",
          title: "Community Contributor",
          description: "Confirmed and verified multiple community environmental hazards.",
        });
      }
    }

    triggerDbPersistence();

    // Get updated count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reportConfirmations)
      .where(eq(reportConfirmations.reportId, reportId));

    return NextResponse.json({
      success: true,
      hasConfirmed: true,
      confirmationCount: countResult?.count || 1,
    });
  } catch (error) {
    console.error("Confirmation error:", error);
    return NextResponse.json(
      { error: "Failed to confirm issue" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db
      .delete(reportConfirmations)
      .where(
        and(
          eq(reportConfirmations.reportId, reportId),
          eq(reportConfirmations.userId, payload.userId)
        )
      );

    triggerDbPersistence();

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reportConfirmations)
      .where(eq(reportConfirmations.reportId, reportId));

    return NextResponse.json({
      success: true,
      hasConfirmed: false,
      confirmationCount: countResult?.count || 0,
    });
  } catch (error) {
    console.error("Remove confirmation error:", error);
    return NextResponse.json(
      { error: "Failed to update confirmation" },
      { status: 500 }
    );
  }
}
