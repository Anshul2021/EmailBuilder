import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";
import { SECTION_EDIT_PROMPT } from "@/lib/prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sectionMjml, instruction, fullTemplateContext, model: requestedModel } = body;

        if (!sectionMjml || !instruction) {
            return NextResponse.json(
                { error: "sectionMjml and instruction are required" },
                { status: 400 }
            );
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not configured on the server." },
                { status: 500 }
            );
        }

        const resolvedModel = requestedModel || "gemini-2.5-flash";
        console.log(`[Section API] Model: ${resolvedModel}`);

        try {
            const model = ai.getGenerativeModel({
                model: resolvedModel,
                systemInstruction: SECTION_EDIT_PROMPT,
            });

            // Build a concise prompt with only the section context
            let promptText = `CURRENT SECTION MJML:\n${sectionMjml}\n\nUSER INSTRUCTION:\n${instruction}\n\nReturn ONLY the modified <mj-section>...</mj-section> block.`;

            // Optionally include minimal template context (just section count and position info)
            if (fullTemplateContext) {
                promptText = `TEMPLATE CONTEXT: This is section in a template with the following overall structure:\n${fullTemplateContext}\n\n${promptText}`;
            }

            const parts: Part[] = [{ text: promptText }];
            const currentMessage: Content = { role: "user", parts };

            const result = await model.generateContent({ contents: [currentMessage] });
            let sectionCode = result.response.text() || "";

            console.log("[Section API] Gemini OK, response length:", sectionCode.length);

            // Clean any markdown fences
            sectionCode = sectionCode.replace(/```(mjml|html|xml)?\n?/g, "").replace(/```$/m, "").trim();

            // Validate it starts with <mj-section
            if (!sectionCode.toLowerCase().includes("<mj-section")) {
                return NextResponse.json(
                    { error: "AI returned invalid section markup. Please try again." },
                    { status: 422 }
                );
            }

            return NextResponse.json({ sectionMjml: sectionCode });

        } catch (genError: unknown) {
            console.error("[Section API] Gemini error:", genError);
            const errObj = genError as { message?: string; status?: number };
            const errMsg = errObj?.message || String(genError);
            const status = errObj?.status || 500;

            if (status === 429 || errMsg.includes("429")) {
                return NextResponse.json({
                    error: "Daily quota reached. Try again later or switch models.",
                    code: "QUOTA_EXCEEDED"
                }, { status: 429 });
            }

            return NextResponse.json({ error: errMsg, code: "GENERATION_FAILED" }, { status: 500 });
        }

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[Section API] Critical error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
