import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";
import { SECTION_EDIT_PROMPT, GEMINI_MODELS } from "@/lib/prompts";
import { resolvePexelsImages } from "@/lib/pexels";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Safely rewrites any external image URL (e.g. imgbb.com, imgur.com, etc.)
 * that is not placehold.co into a standard placehold.co placeholder image.
 */
function sanitizeImageSources(mjmlCode: string): string {
    // Regex matches src="URL" or src='URL' where URL starts with http/https but NOT placehold.co
    // Capture the quote character in group 1, and the URL in group 2
    return mjmlCode.replace(/src=(["'])(https?:\/\/(?!placehold\.co)[^"'\s>]+)\1/gi, (match, quote, url) => {
        let width = "600";
        let height = "400";
        let text = "Image+Placeholder";

        // If the URL has common size patterns like 300x250 or 600/400
        const sizeMatch = url.match(/(\d+)x(\d+)/i) || url.match(/\/(\d+)\/(\d+)/);
        if (sizeMatch) {
            width = sizeMatch[1];
            height = sizeMatch[2];
        }

        // Try to extract descriptive words from path/query as placeholder text
        try {
            const urlObj = new URL(url);
            const textParam = urlObj.searchParams.get("text") || urlObj.searchParams.get("q");
            if (textParam) {
                text = encodeURIComponent(textParam);
            } else {
                const pathParts = urlObj.pathname.split("/").filter(Boolean);
                const lastPart = pathParts[pathParts.length - 1];
                if (lastPart && !lastPart.includes(".") && lastPart.length > 2) {
                    text = encodeURIComponent(lastPart);
                }
            }
        } catch (e) {
            // URL parse failure fallback
        }

        return `src="https://placehold.co/${width}x${height}?text=${text}"`;
    });
}

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

        // Validate the model against the allowed GEMINI_MODELS list
        let primaryModel = requestedModel;
        if (!primaryModel) {
            primaryModel = "gemini-2.5-flash";
        } else if (!GEMINI_MODELS.some(m => m.value === primaryModel)) {
            return NextResponse.json(
                { error: "Invalid model selected" },
                { status: 400 }
            );
        }

        // Build the try queue: primary model first, followed by others in fallback list
        const modelQueue = [
            primaryModel,
            ...["gemini-3.5-flash", "gemini-3-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"].filter(m => m !== primaryModel)
        ];

        let sectionCode = "";
        let resolvedModel = primaryModel;
        let lastError: unknown = null;

        for (let i = 0; i < modelQueue.length; i++) {
            const currentModel = modelQueue[i];
            console.log(`[Section API] Attempting generation with model: ${currentModel} (Attempt ${i + 1}/${modelQueue.length})`);
            try {
                const model = ai.getGenerativeModel({
                    model: currentModel,
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
                sectionCode = result.response.text() || "";
                resolvedModel = currentModel;

                console.log("[Section API] Gemini OK, response length:", sectionCode.length);

                // Clean any markdown fences
                sectionCode = sectionCode.replace(/```(mjml|html|xml)?\n?/g, "").replace(/```$/m, "").trim();

                // Rewrite all external/unauthorized image URLs to placehold.co text placeholders
                sectionCode = sanitizeImageSources(sectionCode);

                // Validate it starts with <mj-section
                if (!sectionCode.toLowerCase().includes("<mj-section")) {
                    return NextResponse.json(
                        { error: "AI returned invalid section markup. Please try again." },
                        { status: 422 }
                    );
                }

                // If succeeded, break out of loop
                lastError = null;
                break;

            } catch (genError: unknown) {
                console.error(`[Section API] Gemini error with model ${currentModel}:`, genError);
                lastError = genError;

                const errObj = genError as { message?: string; status?: number };
                const errMsg = errObj?.message || String(genError);
                const status = errObj?.status || 500;

                const isTransient = 
                    status === 503 || 
                    status === 429 || 
                    errMsg.includes("503") || 
                    errMsg.includes("429") || 
                    errMsg.toLowerCase().includes("quota") || 
                    errMsg.toLowerCase().includes("demand") || 
                    errMsg.toLowerCase().includes("overloaded") || 
                    errMsg.toLowerCase().includes("unavailable") || 
                    errMsg.toLowerCase().includes("resource_exhausted");

                if (i < modelQueue.length - 1) {
                    console.warn(`[Section API] Model ${currentModel} failed (${errMsg}). Trying fallback model: ${modelQueue[i + 1]}`);
                    continue;
                } else {
                    break;
                }
            }
        }

        if (lastError) {
            console.error("[Section API] Final Gemini section execution failure:", lastError);
            const errObj = lastError as { message?: string; status?: number };
            const errMsg = errObj?.message || String(lastError);
            const status = errObj?.status || 500;

            if (status === 429 || errMsg.includes("429")) {
                return NextResponse.json({
                    error: "Daily quota reached. Try again later or switch models.",
                    code: "QUOTA_EXCEEDED"
                }, { status: 429 });
            }

            return NextResponse.json({ error: errMsg, code: "GENERATION_FAILED" }, { status: 500 });
        }

        return NextResponse.json({ sectionMjml: sectionCode, modelUsed: resolvedModel });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[Section API] Critical error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
