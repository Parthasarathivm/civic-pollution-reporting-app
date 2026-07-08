import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, routes, wards } from "@/db/schema";
import { optimizeRoute } from "@/lib/clustering";
import { eq, and, or, inArray } from "drizzle-orm";
import { getTokenFromRequest } from "@/lib/auth";

// Ward population density lookup (pilot city)
const WARD_DENSITY: Record<number, number> = {
  1: 25000,
  2: 18000,
  3: 32000,
  4: 12000,
  5: 28000,
};

const SEVERITY_SCORE: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 5,
};

function getPriorityScore(report: {
  severity: string;
  isRecurringHotspot: boolean;
  wardId: number | null;
}): number {
  const severityScore = SEVERITY_SCORE[report.severity] || 2;
  const recurringBonus = report.isRecurringHotspot ? 2 : 1;
  const densityFactor = report.wardId
    ? (WARD_DENSITY[report.wardId] || 10000) / 10000
    : 1;
  return severityScore * recurringBonus * densityFactor;
}

export async function POST(req: NextRequest) {
  try {
    const payload = getTokenFromRequest(req);
    if (!payload || (payload.role !== "worker" && payload.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reportIds } = body; // Optional: specific report IDs to include

    let pendingReports;

    if (reportIds && reportIds.length > 0) {
      pendingReports = await db
        .select()
        .from(reports)
        .where(inArray(reports.id, reportIds));
    } else {
      // Get all pending/assigned reports
      pendingReports = await db
        .select()
        .from(reports)
        .where(
          or(eq(reports.status, "reported"), eq(reports.status, "assigned"))
        );
    }

    if (pendingReports.length === 0) {
      return NextResponse.json(
        { error: "No pending reports to route" },
        { status: 400 }
      );
    }

    // Sort by priority score descending
    const scored = pendingReports
      .map((r) => ({
        ...r,
        priorityScore: getPriorityScore(r),
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore);

    // Take top 20 for route optimization
    const topReports = scored.slice(0, 20);

    // Optimize route using nearest-neighbor
    const routePoints = topReports.map((r) => ({
      id: r.id,
      lat: r.lat,
      lng: r.lng,
    }));
    const optimizedIds = optimizeRoute(routePoints);

    // Save route to DB
    const [newRoute] = await db
      .insert(routes)
      .values({
        workerId: payload.userId,
        orderedReportIds: optimizedIds,
        status: "active",
      })
      .returning();

    // Assign reports to worker
    for (const reportId of optimizedIds) {
      await db
        .update(reports)
        .set({ assignedWorkerId: payload.userId, status: "assigned" })
        .where(eq(reports.id, reportId));
    }

    return NextResponse.json({
      routeId: newRoute.id,
      orderedReportIds: optimizedIds,
      totalStops: optimizedIds.length,
      reports: topReports.sort(
        (a, b) => optimizedIds.indexOf(a.id) - optimizedIds.indexOf(b.id)
      ),
    });
  } catch (error) {
    console.error("Route generation error:", error);
    return NextResponse.json(
      { error: "Route generation failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const payload = getTokenFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allRoutes = await db
      .select()
      .from(routes)
      .where(eq(routes.workerId, payload.userId))
      .orderBy(routes.createdAt);

    return NextResponse.json(allRoutes);
  } catch (error) {
    console.error("Error fetching routes:", error);
    return NextResponse.json(
      { error: "Failed to fetch routes" },
      { status: 500 }
    );
  }
}
