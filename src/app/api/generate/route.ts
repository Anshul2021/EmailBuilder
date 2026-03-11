import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";
import { SYSTEM_PROMPT } from "@/lib/prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Inject css-class="ag-section-N" on each <mj-section> BEFORE compilation.
 * This gives us reliable class-based section detection in the compiled HTML.
 */
function injectSectionMarkers(mjmlCode: string): string {
    let index = 0;
    return mjmlCode.replace(/<mj-section([^>]*?)(\s*\/?>)/gi, (match, attrs, closing) => {
        const marker = `ag-section-${index++}`;

        // If css-class already exists, append to it
        if (/css-class\s*=\s*"/i.test(attrs)) {
            const updated = attrs.replace(
                /css-class\s*=\s*"([^"]*)"/i,
                `css-class="$1 ${marker}"`
            );
            return `<mj-section${updated}${closing}`;
        }

        // Otherwise add css-class attribute
        return `<mj-section${attrs} css-class="${marker}"${closing}`;
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, imageBase64, mimeType, currentMjml, history = [], model: requestedModel, compileOnly, mjmlCode: rawMjmlCode } = body;

        // ── Compile-only mode: skip AI, just compile MJML → HTML ──
        if (compileOnly && rawMjmlCode) {
            try {
                // Inject section markers before compiling
                const markedMjml = injectSectionMarkers(rawMjmlCode);

                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const mjml2html = require("mjml");
                const mjmlFunc = typeof mjml2html === "function" ? mjml2html : mjml2html.default;
                const { html, errors } = mjmlFunc(markedMjml, {
                    validationLevel: "soft",
                    keepComments: false,
                });
                if (errors?.length > 0) console.warn("[API] MJML compile warnings:", errors.length);
                // Return the ORIGINAL mjml (without markers) but HTML with markers
                return NextResponse.json({ mjml: rawMjmlCode, html });
            } catch (compileError: unknown) {
                const compileMsg = compileError instanceof Error ? compileError.message : String(compileError);
                return NextResponse.json({ error: "Failed to compile MJML", details: compileMsg }, { status: 500 });
            }
        }

        // Resolve the exact API model ID, fallback to passed value
        const resolvedModel = requestedModel || "gemini-2.5-flash";

        if (!prompt && !imageBase64) {
            return NextResponse.json({ error: "Prompt or an image is required" }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
        }

        console.log(`[API] Model: ${resolvedModel} (requested: ${requestedModel})`);

        let mjmlCode = "";
        try {
            const model = ai.getGenerativeModel({
                model: resolvedModel,
                systemInstruction: SYSTEM_PROMPT
            });

            const parts: Part[] = [];

            // Build the prompt text
            if (prompt) {
                let textContent = prompt;
                if (currentMjml) {
                    textContent = `I have an existing MJML template and I want to make changes.

CURRENT MJML TEMPLATE:
${currentMjml}

USER REQUEST:
${prompt}

Return the complete updated MJML. Modify only what was requested, preserve everything else.`;
                }
                parts.push({ text: textContent });
            }

            // For image-only requests, add an explicit instruction
            if (imageBase64 && mimeType) {
                parts.push({ inlineData: { data: imageBase64, mimeType } });
                if (!prompt) {
                    parts.push({ text: "Analyze this email screenshot and generate MJML that replicates the layout, colors, typography, and structure as closely as possible. Create one mj-section per visible row in the image." });
                }
            }

            const currentMessage: Content = { role: "user", parts };
            const formattedHistory: Content[] = Array.isArray(history) ? history.map((msg: { role: string; parts?: { text?: string }[] }) => ({
                role: msg.role === "model" ? "model" : "user",
                parts: Array.isArray(msg.parts) ? msg.parts.map((p: { text?: string }) => ({ text: p.text || "" })) : []
            })) : [];

            const result = await model.generateContent({ contents: [...formattedHistory, currentMessage] });
            mjmlCode = result.response.text() || "";
            console.log("[API] Gemini OK, response length:", mjmlCode.length);

        } catch (genError: unknown) {
            console.error("[API] Gemini error:", genError);

            const errObj = genError as { message?: string; status?: number };
            const errMsg: string = errObj?.message || String(genError);
            const status: number = errObj?.status || 500;

            if (status === 429 || errMsg.includes("429") || errMsg.toLowerCase().includes("quota")) {
                return NextResponse.json({
                    error: `Daily quota reached for ${requestedModel}. Switch to another model in the model selector.`,
                    code: "QUOTA_EXCEEDED"
                }, { status: 429 });
            }

            if (status === 404 || errMsg.includes("404") || errMsg.toLowerCase().includes("not found")) {
                return NextResponse.json({
                    error: `Model "${requestedModel}" is not available with your API key. Try Gemini 2.5 Flash, 2.0 Flash or 1.5 Pro.`,
                    code: "MODEL_NOT_FOUND"
                }, { status: 404 });
            }

            if (status === 400 || errMsg.includes("400")) {
                return NextResponse.json({
                    error: `Bad request to Gemini API: ${errMsg}`,
                    code: "BAD_REQUEST"
                }, { status: 400 });
            }

            return NextResponse.json({ error: errMsg, code: "GENERATION_FAILED" }, { status: 500 });
        }

        // Clean MJML of any markdown fences
        mjmlCode = mjmlCode.replace(/```(mjml|html|xml)?\n?/g, "").replace(/```$/m, "").trim();

        // Compile MJML → HTML
        try {
            // Inject section markers before compiling
            const markedMjml = injectSectionMarkers(mjmlCode);

            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const mjml2html = require("mjml");
            const mjmlFunc = typeof mjml2html === "function" ? mjml2html : mjml2html.default;

            const { html, errors } = mjmlFunc(markedMjml, {
                validationLevel: "soft",
                keepComments: false,
            });

            if (errors?.length > 0) console.warn("[API] MJML warnings:", errors.length);
            // Return the ORIGINAL mjml (clean) but HTML with markers for section detection
            return NextResponse.json({ mjml: mjmlCode, html });

        } catch (compileError: unknown) {
            const compileMsg = compileError instanceof Error ? compileError.message : String(compileError);
            console.error("[API] MJML compile error:", compileMsg);
            return NextResponse.json({
                error: "Failed to compile MJML to HTML",
                details: compileMsg
            }, { status: 500 });
        }

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[API] Critical error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
