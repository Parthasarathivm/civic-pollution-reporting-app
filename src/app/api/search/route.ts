import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, departments, teams } from "@/db/schema";
import { desc, eq, and, or, ilike, sql } from "drizzle-orm";
import { getTokenFromRequest, isStaffRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const payload = getTokenFromRequest(req);
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() || "";
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status");

    if (!q && !category && !status) {
      return NextResponse.json({ results: [], query: "" });
    }

    const conditions = [];

    // Role-based visibility:
    // Citizens see public reports and their own reports.
    // Private draft or internal notes are omitted.
    const isStaff = isStaffRole(payload?.role);

    if (category && category !== "all") {
      conditions.push(eq(reports.category, category));
    }
    if (status && status !== "all") {
      conditions.push(eq(reports.status, status));
    }

    if (q) {
      const numericId = q.replace(/^cp-?/i, "");
      if (!isNaN(Number(numericId)) && numericId.length > 0) {
        conditions.push(
          or(
            eq(reports.id, Number(numericId)),
            ilike(reports.description, `%${q}%`),
            ilike(reports.address, `%${q}%`),
            ilike(reports.category, `%${q}%`)
          )!
        );
      } else {
        conditions.push(
          or(
            ilike(reports.description, `%${q}%`),
            ilike(reports.address, `%${q}%`),
            ilike(reports.category, `%${q}%`)
          )!
        );
      }
    }

    const results = await db
      .select({
        id: reports.id,
        category: reports.category,
        severity: reports.severity,
        priority: reports.priority,
        status: reports.status,
        address: reports.address,
        description: reports.description,
        createdAt: reports.createdAt,
        departmentName: departments.name,
        teamName: teams.name,
      })
      .from(reports)
      .leftJoin(departments, eq(reports.assignedDepartmentId, departments.id))
      .leftJoin(teams, eq(reports.assignedTeamId, teams.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reports.createdAt))
      .limit(30);

    return NextResponse.json({
      results: results.map((r) => ({
        ...r,
        displayId: `CP-${r.id}`,
      })),
      count: results.length,
      query: q,
    });
  } catch (error) {
    console.error("Global search error:", error);
    return NextResponse.json({ error: "Search query failed" }, { status: 500 });
  }
}
