import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import path from "path";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const { beforeUrl, afterUrl } = await req.json();

    if (!beforeUrl || !afterUrl) {
      return NextResponse.json(
        { error: "Both before and after image URLs are required" },
        { status: 400 }
      );
    }

    // If no API key, do NOT falsely claim image is AI-verified
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        automatedAssessment: false,
        result: "pending_manual_review",
        confidence: null,
        reasoning:
          "Automated visual comparison requires ANTHROPIC_API_KEY. Report queued for manual authority verification.",
      });
    }

    async function loadImage(
      url: string
    ): Promise<{
      data: string;
      mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    }> {
      if (url.startsWith("/uploads/")) {
        const filePath = path.join(process.cwd(), "public", url);
        const buffer = await readFile(filePath);
        let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg";
        if (url.endsWith(".png")) mediaType = "image/png";
        else if (url.endsWith(".webp")) mediaType = "image/webp";
        else if (url.endsWith(".gif")) mediaType = "image/gif";
        return { data: buffer.toString("base64"), mediaType };
      }
      throw new Error("Invalid image URL");
    }

    const [beforeImg, afterImg] = await Promise.all([
      loadImage(beforeUrl),
      loadImage(afterUrl),
    ]);

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 350,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Compare this BEFORE photo (first image) and AFTER remediation photo (second image) of a municipal pollution report for CivicPulse. Has the hazard/pollution been effectively remediated? Respond in JSON only: {\"result\": \"resolved\" | \"not_resolved\" | \"uncertain\", \"confidence\": 0.0 to 1.0, \"reasoning\": \"brief explanation\"}",
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: beforeImg.mediaType,
                data: beforeImg.data,
              },
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: afterImg.mediaType,
                data: afterImg.data,
              },
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
        result: "uncertain",
        confidence: null,
        reasoning: "Could not parse structured audit response.",
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      automatedAssessment: true,
      result: parsed.result,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Image verification encountered an error" },
      { status: 500 }
    );
  }
}
