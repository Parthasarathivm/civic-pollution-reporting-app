import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import path from "path";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

const CATEGORIES = [
  "garbage",
  "burning",
  "dust",
  "smoke",
  "drainage",
  "industrial",
  "other",
] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL" }, { status: 400 });
    }

    // If no API key, return a mock classification
    if (!process.env.ANTHROPIC_API_KEY) {
      const mockCategory =
        CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const mockSeverity =
        SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
      return NextResponse.json({
        category: mockCategory,
        severity: mockSeverity,
        confidence: 0.75,
        description: `Detected ${mockCategory} issue (demo mode - no API key)`,
      });
    }

    // Read image file
    let imageData: string;
    let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" =
      "image/jpeg";

    if (imageUrl.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", imageUrl);
      const buffer = await readFile(filePath);
      imageData = buffer.toString("base64");
      if (imageUrl.endsWith(".png")) mediaType = "image/png";
      else if (imageUrl.endsWith(".webp")) mediaType = "image/webp";
    } else {
      return NextResponse.json(
        { error: "Invalid image URL" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageData,
              },
            },
            {
              type: "text",
              text: `You are an AI pollution detector for a civic reporting app. Analyze this image and classify the pollution type and severity.

Categories (pick exactly one):
- garbage: Visible garbage piles, litter, waste dumps
- burning: Open burning, fire, smoke from burning waste
- dust: Construction dust, unpaved road dust, demolition
- smoke: Vehicle exhaust smoke, black smoke from vehicles
- drainage: Overflowing drains, sewage overflow, waterlogging
- industrial: Factory smoke, industrial emissions, chemical haze
- other: Any other environmental issue

Severity levels:
- low: Minor issue, localized, limited impact
- medium: Moderate issue, affects nearby residents
- high: Serious issue, health hazard for many people
- critical: Severe hazard, immediate action required

Respond ONLY with valid JSON in this exact format:
{
  "category": "<one of the categories>",
  "severity": "<low|medium|high|critical>",
  "confidence": <0.0-1.0>,
  "description": "<brief 1-sentence description of what you see>"
}`,
            },
          ],
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate category and severity
    const category = CATEGORIES.includes(result.category)
      ? result.category
      : "other";
    const severity = SEVERITIES.includes(result.severity)
      ? result.severity
      : "medium";

    return NextResponse.json({
      category,
      severity,
      confidence: Math.min(1, Math.max(0, result.confidence || 0.8)),
      description: result.description || "Pollution issue detected",
    });
  } catch (error) {
    console.error("Classification error:", error);
    // Fallback to random classification
    const mockCategory =
      CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const mockSeverity =
      SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
    return NextResponse.json({
      category: mockCategory,
      severity: mockSeverity,
      confidence: 0.6,
      description: "Pollution issue detected (fallback classification)",
    });
  }
}
