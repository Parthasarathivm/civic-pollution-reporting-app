import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, clusters } from "@/db/schema";
import { eq, and, count, avg, sql, desc, gte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    // Total reports
    const [totalResult] = await db
      .select({ count: count() })
      .from(reports);

    // Resolved reports
    const [resolvedResult] = await db
      .select({ count: count() })
      .from(reports)
      .where(eq(reports.status, "verified"));

    // Average resolution time in hours
    const [avgTimeResult] = await db
      .select({
        avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)`,
      })
      .from(reports)
      .where(
        and(
          eq(reports.status, "verified"),
          sql`resolved_at IS NOT NULL`
        )
      );

    // Recurring hotspots count
    const [hotspotResult] = await db
      .select({ count: count() })
      .from(reports)
      .where(eq(reports.isRecurringHotspot, true));

    // Category breakdown
    const categoryBreakdown = await db
      .select({
        category: reports.category,
        count: count(),
      })
      .from(reports)
      .groupBy(reports.category);

    // Severity breakdown
    const severityBreakdown = await db
      .select({
        severity: reports.severity,
        count: count(),
      })
      .from(reports)
      .groupBy(reports.severity);

    // Recent reports (last 10)
    const recentReports = await db
      .select()
      .from(reports)
      .orderBy(desc(reports.createdAt))
      .limit(10);

    // Top 5 recurring hotspot areas
    const topHotspots = await db
      .select({
        id: clusters.id,
        centerLat: clusters.centerLat,
        centerLng: clusters.centerLng,
        reportCount: clusters.reportCount,
      })
      .from(clusters)
      .where(eq(clusters.isActive, true))
      .orderBy(desc(clusters.reportCount))
      .limit(5);

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
    const resolvedPercent = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const avgHours = Math.round(avgTimeResult.avgHours || 0);

    return NextResponse.json({
      totalReports: total,
      resolvedCount: resolved,
      resolvedPercent,
      avgResolutionHours: avgHours,
      recurringHotspots: hotspotResult.count,
      categoryBreakdown,
      severityBreakdown,
      recentReports,
      topHotspots,
      trendData,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
