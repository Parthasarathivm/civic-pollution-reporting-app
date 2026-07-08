import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, wards, reports } from "@/db/schema";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

// Demo data for the pilot city (Delhi/Mumbai coordinates)
const DEMO_REPORTS = [
  // Delhi area reports (cluster near Connaught Place)
  { lat: 28.6315, lng: 77.2167, category: "garbage", severity: "high", description: "Large garbage pile at intersection", daysAgo: 2 },
  { lat: 28.6320, lng: 77.2180, category: "garbage", severity: "critical", description: "Overflowing municipal bins", daysAgo: 5 },
  { lat: 28.6310, lng: 77.2160, category: "garbage", severity: "high", description: "Dumping near residential area", daysAgo: 8 },
  { lat: 28.6325, lng: 77.2175, category: "drainage", severity: "medium", description: "Blocked drain causing waterlogging", daysAgo: 3 },
  // Industrial area cluster
  { lat: 28.6500, lng: 77.2300, category: "industrial", severity: "critical", description: "Factory smoke exceeding limits", daysAgo: 1 },
  { lat: 28.6510, lng: 77.2310, category: "smoke", severity: "high", description: "Black smoke from vehicles near factory", daysAgo: 4 },
  { lat: 28.6505, lng: 77.2305, category: "industrial", severity: "high", description: "Chemical smell from plant", daysAgo: 7 },
  // Scattered single reports
  { lat: 28.6100, lng: 77.2000, category: "burning", severity: "medium", description: "Open burning of leaves", daysAgo: 1 },
  { lat: 28.6200, lng: 77.2100, category: "dust", severity: "low", description: "Construction dust on main road", daysAgo: 2 },
  { lat: 28.6400, lng: 77.2200, category: "smoke", severity: "medium", description: "Old bus emitting black smoke", daysAgo: 3 },
  { lat: 28.6600, lng: 77.2400, category: "drainage", severity: "high", description: "Sewage overflowing into street", daysAgo: 6 },
  { lat: 28.6700, lng: 77.2500, category: "garbage", severity: "low", description: "Littering near park", daysAgo: 9 },
  // Mumbai area cluster  
  { lat: 19.0760, lng: 72.8777, category: "garbage", severity: "high", description: "Beach garbage dump", daysAgo: 2 },
  { lat: 19.0770, lng: 72.8780, category: "burning", severity: "medium", description: "Burning garbage on beach", daysAgo: 5 },
  { lat: 19.0755, lng: 72.8770, category: "garbage", severity: "critical", description: "Massive plastic waste", daysAgo: 3 },
  // Resolved reports
  { lat: 28.6350, lng: 77.2250, category: "garbage", severity: "medium", description: "Garbage cleared successfully", daysAgo: 15, status: "verified" },
  { lat: 28.6380, lng: 77.2280, category: "dust", severity: "low", description: "Road construction dust", daysAgo: 12, status: "resolved" },
];

export async function POST(req: NextRequest) {
  try {
    // Only allow in development/demo
    console.log("Seeding database...");

    // Create wards
    const wardData = [
      { name: "Ward 1 - Central", populationDensity: 25000, city: "Demo City" },
      { name: "Ward 2 - North", populationDensity: 18000, city: "Demo City" },
      { name: "Ward 3 - South", populationDensity: 32000, city: "Demo City" },
      { name: "Ward 4 - East", populationDensity: 12000, city: "Demo City" },
      { name: "Ward 5 - West", populationDensity: 28000, city: "Demo City" },
    ];

    // Check if wards exist
    const existingWards = await db.select().from(wards);
    let wardIds: number[] = [];

    if (existingWards.length === 0) {
      const insertedWards = await db.insert(wards).values(wardData).returning();
      wardIds = insertedWards.map((w) => w.id);
    } else {
      wardIds = existingWards.map((w) => w.id);
    }

    // Create demo users
    const demoUsers = [
      { name: "Admin User", email: "admin@cleanair.demo", password: "demo123", role: "admin" as const },
      { name: "Worker Raj", email: "worker@cleanair.demo", password: "demo123", role: "worker" as const },
      { name: "Citizen Priya", email: "citizen@cleanair.demo", password: "demo123", role: "citizen" as const },
    ];

    const existingUsers = await db.select().from(users);
    let citizenId = existingUsers.find(u => u.role === 'citizen')?.id || null;

    if (existingUsers.length === 0) {
      for (const u of demoUsers) {
        const hash = await bcrypt.hash(u.password, 10);
        const [inserted] = await db.insert(users).values({
          name: u.name,
          email: u.email,
          passwordHash: hash,
          role: u.role,
          preferredLanguage: "en",
        }).returning();
        if (u.role === 'citizen') citizenId = inserted.id;
      }
    }

    // Create demo reports
    const existingReports = await db.select().from(reports);
    if (existingReports.length === 0) {
      for (const r of DEMO_REPORTS) {
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - r.daysAgo);
        
        const resolvedAt = r.status === 'verified' || r.status === 'resolved'
          ? new Date(createdAt.getTime() + 48 * 60 * 60 * 1000)
          : null;

        await db.insert(reports).values({
          userId: citizenId,
          category: r.category,
          severity: r.severity,
          lat: r.lat,
          lng: r.lng,
          wardId: wardIds[Math.floor(Math.random() * wardIds.length)],
          description: r.description,
          status: (r.status || "reported") as "reported" | "assigned" | "inProgress" | "resolved" | "verified",
          isRecurringHotspot: false,
          createdAt,
          resolvedAt,
        });
      }

      // Run clustering after seeding
      await fetch(`${req.nextUrl.origin}/api/clusters/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      credentials: {
        admin: { email: "admin@cleanair.demo", password: "demo123" },
        worker: { email: "worker@cleanair.demo", password: "demo123" },
        citizen: { email: "citizen@cleanair.demo", password: "demo123" },
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seeding failed", details: String(error) }, { status: 500 });
  }
}
