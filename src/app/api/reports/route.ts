import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, notifications, wards } from "@/db/schema";
import { desc, eq, and, gte, or } from "drizzle-orm";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const recurringOnly = url.searchParams.get("recurringOnly") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "100");

    // Build conditions
    const conditions = [];
    if (status && status !== "all") conditions.push(eq(reports.status, status));
    if (category && category !== "all")
      conditions.push(eq(reports.category, category));
    if (recurringOnly) conditions.push(eq(reports.isRecurringHotspot, true));

    const allReports = await db
      .select()
      .from(reports)
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
      severity,
      lat,
      lng,
      photoBeforeUrl,
      description,
      wardId,
    } = body;

    if (!category || !lat || !lng) {
      return NextResponse.json(
        { error: "Category, lat, and lng are required" },
        { status: 400 }
      );
    }

    const [newReport] = await db
      .insert(reports)
      .values({
        userId: payload?.userId || null,
        category,
        severity: severity || "medium",
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        wardId: wardId || null,
        photoBeforeUrl: photoBeforeUrl || null,
        description: description || null,
        status: "reported",
        isRecurringHotspot: false,
      })
      .returning();

    // Trigger clustering in background (non-blocking)
    fetch(
      `${req.nextUrl.origin}/api/clusters/run`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    ).catch(() => {});

    return NextResponse.json(newReport, { status: 201 });
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}
