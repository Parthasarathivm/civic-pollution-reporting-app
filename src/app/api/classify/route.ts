import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import path from "path";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    // If no API key is provided, do NOT generate fake or random data!
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        automatedAssessment: false,
        message: "Automated computer-vision analysis is optional and requires ANTHROPIC_API_KEY. Manual citizen categorization is active.",
      });
    }

    // Read image file
    let imageData: string;
    let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg";

    if (imageUrl.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", imageUrl);
      const buffer = await readFile(filePath);
      imageData = buffer.toString("base64");
      if (imageUrl.endsWith(".png")) mediaType = "image/png";
      else if (imageUrl.endsWith(".webp")) mediaType = "image/webp";
      else if (imageUrl.endsWith(".gif")) mediaType = "image/gif";
    } else {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
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
              text: `Analyze this environmental pollution or municipal hazard image for CivicPulse.
Respond ONLY with a valid JSON object with these exact keys:
- category: one of ["garbage", "burning", "dust", "smoke", "drainage", "industrial", "plastic", "sewage", "noise", "soil", "other"]
- severity: one of ["low", "medium", "high", "critical"]
- confidence: number between 0.0 and 1.0
- description: brief factual description of observed pollution hazard (under 120 chars)

JSON format:
{"category":"...","severity":"...","confidence":0.00,"description":"..."}`,
            },
          ],
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response from vision model");
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        automatedAssessment: false,
        message: "Could not parse structured assessment from image.",
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      automatedAssessment: true,
      category: parsed.category,
      severity: parsed.severity,
      confidence: parsed.confidence,
      description: parsed.description,
    });
  } catch (error) {
    console.error("Classification error:", error);
    return NextResponse.json(
      { error: "Image analysis encountered an error" },
      { status: 500 }
    );
  }
}
