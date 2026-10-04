import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, wards, clusters } from "@/db/schema";
import { desc, eq, and, sql, gte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const minThreshold = parseInt(url.searchParams.get("threshold") || "2");
    const daysWindow = parseInt(url.searchParams.get("days") || "30");

    const windowDate = new Date();
    windowDate.setDate(windowDate.getDate() - daysWindow);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Group actual reports by ward or nearest coordinate bucket
    const wardHotspots = await db
      .select({
        wardId: reports.wardId,
        wardName: wards.name,
        reportCount: sql<number>`count(*)::int`,
        recentSevenDayCount: sql<number>`count(*) FILTER (WHERE ${reports.createdAt} >= ${sevenDaysAgo})::int`,
        previousSevenDayCount: sql<number>`count(*) FILTER (WHERE ${reports.createdAt} >= ${fourteenDaysAgo} AND ${reports.createdAt} < ${sevenDaysAgo})::int`,
        avgLat: sql<number>`avg(${reports.lat})::real`,
        avgLng: sql<number>`avg(${reports.lng})::real`,
        criticalCount: sql<number>`count(*) FILTER (WHERE ${reports.severity} = 'critical')::int`,
      })
      .from(reports)
      .leftJoin(wards, eq(reports.wardId, wards.id))
      .where(gte(reports.createdAt, windowDate))
      .groupBy(reports.wardId, wards.name)
      .having(sql`count(*) >= ${minThreshold}`)
      .orderBy(sql`count(*) DESC`);

    // For each hotspot area, find primary category from real data
    const hotspotsWithDetails = await Promise.all(
      wardHotspots.map(async (h) => {
        const topCategoryQuery = await db
          .select({
            category: reports.category,
            count: sql<number>`count(*)::int`,
          })
          .from(reports)
          .where(
            and(
              h.wardId ? eq(reports.wardId, h.wardId) : sql`true`,
              gte(reports.createdAt, windowDate)
            )
          )
          .groupBy(reports.category)
          .orderBy(sql`count(*) DESC`)
          .limit(1);

        const primaryIssue = topCategoryQuery[0]?.category || "Various Hazards";

        let trend: "Increasing" | "Stable" | "Decreasing" = "Stable";
        if (h.recentSevenDayCount > h.previousSevenDayCount) {
          trend = "Increasing";
        } else if (h.recentSevenDayCount < h.previousSevenDayCount) {
          trend = "Decreasing";
        }

        return {
          id: h.wardId || Math.round(h.avgLat * 1000),
          zone: h.wardName || `Zone (${h.avgLat.toFixed(3)}, ${h.avgLng.toFixed(3)})`,
          reportCount: h.reportCount,
          recentSevenDays: h.recentSevenDayCount,
          primaryIssue,
          trend,
          criticalCount: h.criticalCount,
          centerLat: h.avgLat,
          centerLng: h.avgLng,
          daysWindow,
        };
      })
    );

    return NextResponse.json({
      hotspots: hotspotsWithDetails,
      threshold: minThreshold,
      totalDetected: hotspotsWithDetails.length,
      insufficientData: hotspotsWithDetails.length === 0,
      emptyMessage: "Not enough data to identify a hotspot yet.",
    });
  } catch (error) {
    console.error("Hotspot detection error:", error);
    return NextResponse.json({ error: "Failed to detect hotspots" }, { status: 500 });
  }
}
