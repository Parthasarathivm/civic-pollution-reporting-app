import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "cleanair-secret-2024-civic-tech";

export type UserRole = "citizen" | "moderator" | "authority" | "worker" | "admin";

export interface TokenPayload {
  userId: number;
  role: UserRole | string;
  name: string;
  email: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export function isStaffRole(role?: string | null): boolean {
  if (!role) return false;
  return ["moderator", "authority", "worker", "admin"].includes(role.toLowerCase());
}

export function isAuthorityOrAdmin(role?: string | null): boolean {
  if (!role) return false;
  return ["authority", "worker", "admin"].includes(role.toLowerCase());
}

export function isAdminRole(role?: string | null): boolean {
  return role?.toLowerCase() === "admin";
}
