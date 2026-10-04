import { NextRequest, NextResponse } from "next/server";
import { db, triggerDbPersistence } from "@/db";
import { officialContacts, auditLogs } from "@/db/schema";
import { eq, desc, and, ilike, or } from "drizzle-orm";
import { getTokenFromRequest, isAdminRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const region = url.searchParams.get("region");
    const contactType = url.searchParams.get("type");
    const search = url.searchParams.get("search")?.trim();

    const conditions = [eq(officialContacts.isActive, true)];

    if (region && region !== "all") {
      conditions.push(ilike(officialContacts.region, `%${region}%`));
    }
    if (contactType && contactType !== "all") {
      conditions.push(eq(officialContacts.contactType, contactType));
    }
    if (search) {
      conditions.push(
        or(
          ilike(officialContacts.organizationName, `%${search}%`),
          ilike(officialContacts.department, `%${search}%`),
          ilike(officialContacts.description, `%${search}%`)
        )!
      );
    }

    const contacts = await db
      .select()
      .from(officialContacts)
      .where(and(...conditions))
      .orderBy(officialContacts.organizationName);

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Official contacts error:", error);
    return NextResponse.json({ error: "Failed to fetch official contacts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
      region = "National / NCR",
      contactType,
      description,
      verifiedSource,
    } = body;

    if (!organizationName || !department || !phoneNumber || !verifiedSource || !contactType) {
      return NextResponse.json(
        { error: "Organization name, department, phone number, contact type, and verified source are mandatory." },
        { status: 400 }
      );
    }

    const [newContact] = await db
      .insert(officialContacts)
      .values({
        organizationName: organizationName.trim(),
        department: department.trim(),
        phoneNumber: phoneNumber.trim(),
        website: website?.trim() || null,
        email: email?.trim() || null,
        region: region.trim(),
        contactType: contactType.trim(),
        description: description?.trim() || null,
        verifiedSource: verifiedSource.trim(),
        lastVerifiedDate: new Date(),
        isActive: true,
        updatedByUserId: payload.userId,
      })
      .returning();

    await db.insert(auditLogs).values({
      actorId: payload.userId,
      actorEmail: payload.email,
      action: "OFFICIAL_CONTACT_CREATED",
      entityType: "official_contacts",
      entityId: String(newContact.id),
      metadata: { organizationName: newContact.organizationName },
    });

    triggerDbPersistence();

    return NextResponse.json(newContact, { status: 201 });
  } catch (error) {
    console.error("Create contact error:", error);
    return NextResponse.json({ error: "Failed to add official contact" }, { status: 500 });
  }
}
