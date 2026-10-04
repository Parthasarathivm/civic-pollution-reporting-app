import { NextRequest, NextResponse } from "next/server";
import { db, triggerDbPersistence } from "@/db";
import { users, reports, auditLogs } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { getTokenFromRequest, isAdminRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const payload = getTokenFromRequest(req);
    if (!payload || !isAdminRole(payload.role)) {
      return NextResponse.json({ error: "Forbidden: Admin authorization required" }, { status: 403 });
    }

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        preferredLanguage: users.preferredLanguage,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json(allUsers);
  } catch (error) {
    console.error("Admin users list error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const payload = getTokenFromRequest(req);
    if (!payload || !isAdminRole(payload.role)) {
      return NextResponse.json({ error: "Forbidden: Admin authorization required" }, { status: 403 });
    }

    const body = await req.json();
    const { targetUserId, newRole } = body;

    const allowedRoles = ["citizen", "moderator", "authority", "admin", "worker"];
    if (!targetUserId || !newRole || !allowedRoles.includes(newRole)) {
      return NextResponse.json({ error: "Invalid target user ID or role" }, { status: 400 });
    }

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(targetUserId)))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ role: newRole === "worker" ? "authority" : newRole })
      .where(eq(users.id, Number(targetUserId)))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    // Record audit log
    await db.insert(auditLogs).values({
      actorId: payload.userId,
      actorEmail: payload.email,
      action: "USER_ROLE_CHANGED",
      entityType: "users",
      entityId: String(targetUserId),
      metadata: { previousRole: targetUser.role, newRole: updatedUser.role },
    });

    triggerDbPersistence();

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Admin user role update error:", error);
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
  }
}
