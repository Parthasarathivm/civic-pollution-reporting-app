import { NextRequest, NextResponse } from "next/server";
import { db, triggerDbPersistence } from "@/db";
import { officialContacts, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTokenFromRequest, isAdminRole } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contactId = parseInt(id);

  if (isNaN(contactId)) {
    return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
  }

  try {
    const payload = getTokenFromRequest(req);
    if (!payload || !isAdminRole(payload.role)) {
      return NextResponse.json({ error: "Forbidden: Admin authorization required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      organizationName,
      department,
      phoneNumber,
      website,
      email,
      region,
      contactType,
      description,
      verifiedSource,
      isActive,
      markVerifiedNow,
    } = body;

    const updates: Record<string, unknown> = {
      updatedByUserId: payload.userId,
    };

    if (organizationName) updates.organizationName = organizationName.trim();
    if (department) updates.department = department.trim();
    if (phoneNumber) updates.phoneNumber = phoneNumber.trim();
    if (website !== undefined) updates.website = website?.trim() || null;
    if (email !== undefined) updates.email = email?.trim() || null;
    if (region) updates.region = region.trim();
    if (contactType) updates.contactType = contactType.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (verifiedSource) updates.verifiedSource = verifiedSource.trim();
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (markVerifiedNow) updates.lastVerifiedDate = new Date();

    const [updated] = await db
      .update(officialContacts)
      .set(updates)
      .where(eq(officialContacts.id, contactId))
      .returning();

    await db.insert(auditLogs).values({
      actorId: payload.userId,
      actorEmail: payload.email,
      action: "OFFICIAL_CONTACT_UPDATED",
      entityType: "official_contacts",
      entityId: String(contactId),
      metadata: { updates },
    });

    triggerDbPersistence();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update contact error:", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contactId = parseInt(id);

  if (isNaN(contactId)) {
    return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
  }

  try {
    const payload = getTokenFromRequest(req);
    if (!payload || !isAdminRole(payload.role)) {
      return NextResponse.json({ error: "Forbidden: Admin authorization required" }, { status: 403 });
    }

    await db
      .update(officialContacts)
      .set({ isActive: false })
      .where(eq(officialContacts.id, contactId));

    await db.insert(auditLogs).values({
      actorId: payload.userId,
      actorEmail: payload.email,
      action: "OFFICIAL_CONTACT_ARCHIVED",
      entityType: "official_contacts",
      entityId: String(contactId),
    });

    triggerDbPersistence();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete contact error:", error);
    return NextResponse.json({ error: "Failed to archive contact" }, { status: 500 });
  }
}
