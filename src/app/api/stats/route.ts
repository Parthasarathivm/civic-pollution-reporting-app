import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  reports,
  clusters,
  wards,
  reportConfirmations,
  achievements,
} from "@/db/schema";
import { eq, and, count, sql, desc, gte, notInArray, or } from "drizzle-orm";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const payload = getTokenFromRequest(req);

    // Total reports count
    const [totalResult] = await db
      .select({ count: count() })
      .from(reports);

    // Resolved reports (status 'resolved' or 'verified')
    const [resolvedResult] = await db
      .select({ count: count() })
      .from(reports)
      .where(or(eq(reports.status, "resolved"), eq(reports.status, "verified")));

    // Active issues (not resolved, verified, or rejected)
    const [activeResult] = await db
      .select({ count: count() })
      .from(reports)
      .where(
        notInArray(reports.status, ["resolved", "verified", "rejected"])
      );

    // Under review
    const [underReviewResult] = await db
      .select({ count: count() })
      .from(reports)
      .where(eq(reports.status, "under_review"));

    // In Progress
    const [inProgressResult] = await db
      .select({ count: count() })
      .from(reports)
      .where(eq(reports.status, "in_progress"));

    // Average resolution time in hours from real timestamps
    const [avgTimeResult] = await db
      .select({
        avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)`,
      })
      .from(reports)
      .where(
        and(
          or(eq(reports.status, "resolved"), eq(reports.status, "verified")),
          sql`resolved_at IS NOT NULL`
        )
      );

    // Recurring hotspots count
    const [hotspotResult] = await db
      .select({ count: count() })
      .from(reports)
      .where(eq(reports.isRecurringHotspot, true));

    // Category breakdown from real data
    const categoryBreakdown = await db
      .select({
        category: reports.category,
        count: count(),
      })
      .from(reports)
      .groupBy(reports.category)
      .orderBy(desc(count()));

    // Severity breakdown from real data
    const severityBreakdown = await db
      .select({
        severity: reports.severity,
        count: count(),
      })
      .from(reports)
      .groupBy(reports.severity)
      .orderBy(desc(count()));

    // Total community confirmations recorded
    const [confirmationsTotal] = await db
      .select({ count: count() })
      .from(reportConfirmations);

    // Most reported category
    const mostReportedCategory = categoryBreakdown[0]?.category || null;

    // Most affected ward/area
    const wardBreakdown = await db
      .select({
        wardName: wards.name,
        count: count(),
      })
      .from(reports)
      .leftJoin(wards, eq(reports.wardId, wards.id))
      .groupBy(wards.name)
      .orderBy(desc(count()))
      .limit(1);

    const mostAffectedArea = wardBreakdown[0]?.wardName || "Central Zone";

    // Recent reports (last 10)
    const recentReports = await db
      .select({
        id: reports.id,
        category: reports.category,
        severity: reports.severity,
        status: reports.status,
        address: reports.address,
        createdAt: reports.createdAt,
        description: reports.description,
        isRecurringHotspot: reports.isRecurringHotspot,
        confirmationCount: sql<number>`(
          SELECT COUNT(*)::int FROM report_confirmations
          WHERE report_confirmations.report_id = ${reports.id}
        )`,
      })
      .from(reports)
      .orderBy(desc(reports.createdAt))
      .limit(10);

    // 30-day trend (daily counts)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendData = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        count: count(),
      })
      .from(reports)
      .where(gte(reports.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    const total = totalResult.count;
    const resolved = resolvedResult.count;
    const active = activeResult.count;
    const resolvedPercent = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const rawAvgHours = avgTimeResult.avgHours ? Number(avgTimeResult.avgHours) : 0;
    const avgResolutionHours = Math.round(rawAvgHours * 10) / 10;
    const avgResolutionDays = Math.round((rawAvgHours / 24) * 10) / 10;

    // User-specific Impact metrics if authenticated
    let userImpact = null;
    if (payload?.userId) {
      const [userReports] = await db
        .select({ count: count() })
        .from(reports)
        .where(eq(reports.userId, payload.userId));

      const [userResolved] = await db
        .select({ count: count() })
        .from(reports)
        .where(
          and(
            eq(reports.userId, payload.userId),
            or(eq(reports.status, "resolved"), eq(reports.status, "verified"))
          )
        );

      const [userConfirms] = await db
        .select({ count: count() })
        .from(reportConfirmations)
        .where(eq(reportConfirmations.userId, payload.userId));

      const userAchievements = await db
        .select()
        .from(achievements)
        .where(eq(achievements.userId, payload.userId))
        .orderBy(desc(achievements.earnedAt));

      userImpact = {
        reportsSubmitted: userReports.count,
        reportsResolved: userResolved.count,
        confirmationsGiven: userConfirms.count,
        achievements: userAchievements,
      };
    }

    return NextResponse.json({
      totalReports: total,
      resolvedCount: resolved,
      activeIssues: active,
      underReviewCount: underReviewResult.count,
      inProgressCount: inProgressResult.count,
      resolvedPercent,
      avgResolutionHours,
      avgResolutionDays,
      recurringHotspots: hotspotResult.count,
      totalConfirmations: confirmationsTotal.count,
      mostReportedCategory,
      mostAffectedArea,
      categoryBreakdown,
      severityBreakdown,
      recentReports,
      trendData,
      userImpact,
    });
  } catch (error) {
    console.error("Stats calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate environmental statistics" },
      { status: 500 }
    );
  }
}
