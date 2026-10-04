import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, triggerDbPersistence } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signToken, getTokenFromRequest, isAdminRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Server-side authorization check: only existing admins can create privileged accounts (admin/moderator/authority)
    let assignedRole = "citizen";
    if (role && ["admin", "moderator", "authority", "worker"].includes(role)) {
      const requester = getTokenFromRequest(req);
      if (requester && isAdminRole(requester.role)) {
        assignedRole = role === "worker" ? "authority" : role;
      } else {
        // If regular user requests elevated role, safely default to citizen
        assignedRole = "citizen";
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        phone: phone?.trim() || null,
        role: assignedRole,
        preferredLanguage: "en",
      })
      .returning();

    triggerDbPersistence();

    const token = signToken({
      userId: newUser.id,
      role: newUser.role,
      name: newUser.name,
      email: newUser.email!,
    });

    return NextResponse.json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        preferredLanguage: newUser.preferredLanguage,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please check inputs and try again." },
      { status: 500 }
    );
  }
}
