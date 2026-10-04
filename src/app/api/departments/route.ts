import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { departments, teams } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allDepts = await db.select().from(departments);
    const allTeams = await db.select().from(teams);

    const result = allDepts.map((d) => ({
      ...d,
      teams: allTeams.filter((t) => t.departmentId === d.id),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Departments error:", error);
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
  }
}
