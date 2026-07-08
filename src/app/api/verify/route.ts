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

    // If no API key, return mock result
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        result: "resolved",
        confidence: 0.8,
        reasoning:
          "Demo mode: assuming the issue has been resolved (no API key configured)",
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
        let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" =
          "image/jpeg";
        if (url.endsWith(".png")) mediaType = "image/png";
        else if (url.endsWith(".webp")) mediaType = "image/webp";
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
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "I am showing you two images from a pollution reporting app. The FIRST image is the 'before' photo showing a pollution/environmental issue. The SECOND image is the 'after' photo taken by a municipal worker claiming to have resolved the issue.",
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
            {
              type: "text",
              text: `Compare these two images and determine if the pollution issue shown in the first image has been resolved in the second image.

Respond ONLY with valid JSON:
{
  "result": "<resolved|not_resolved|uncertain>",
  "confidence": <0.0-1.0>,
  "reasoning": "<1-2 sentence explanation>"
}

- "resolved": The area looks cleaner, issue appears to be fixed
- "not_resolved": The same issue is still visible in the after photo  
- "uncertain": Images are too different to compare, or unclear`,
            },
          ],
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response");

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse response");

    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      result: ["resolved", "not_resolved", "uncertain"].includes(result.result)
        ? result.result
        : "uncertain",
      confidence: Math.min(1, Math.max(0, result.confidence || 0.7)),
      reasoning: result.reasoning || "Analysis complete",
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({
      result: "uncertain",
      confidence: 0.5,
      reasoning: "Unable to complete AI analysis. Please verify manually.",
    });
  }
}
