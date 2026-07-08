import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, clusters } from "@/db/schema";
import { runDBSCAN } from "@/lib/clustering";
import { eq, gte } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    // Get all reports from last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const allReports = await db
      .select({
        id: reports.id,
        lat: reports.lat,
        lng: reports.lng,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(gte(reports.createdAt, fourteenDaysAgo));

    if (allReports.length === 0) {
      return NextResponse.json({ message: "No reports to cluster" });
    }

    // Run DBSCAN
    const clusterResults = runDBSCAN(allReports, 300, 2, 14);

    // Clear existing clusters
    await db.delete(clusters);

    // Reset all reports' cluster assignments
    await db
      .update(reports)
      .set({ clusterId: null, isRecurringHotspot: false });

    // Save new clusters and update reports
    for (const clusterResult of clusterResults) {
      // Insert cluster
      const [newCluster] = await db
        .insert(clusters)
        .values({
          centerLat: clusterResult.centerLat,
          centerLng: clusterResult.centerLng,
          reportCount: clusterResult.points.length,
          isActive: true,
        })
        .returning();

      // Update reports in this cluster
      for (const reportId of clusterResult.points) {
        await db
          .update(reports)
          .set({
            clusterId: newCluster.id,
            isRecurringHotspot: clusterResult.isRecurring,
          })
          .where(eq(reports.id, reportId));
      }
    }

    return NextResponse.json({
      clustersFound: clusterResults.length,
      recurringHotspots: clusterResults.filter((c) => c.isRecurring).length,
    });
  } catch (error) {
    console.error("Clustering error:", error);
    return NextResponse.json({ error: "Clustering failed" }, { status: 500 });
  }
}
