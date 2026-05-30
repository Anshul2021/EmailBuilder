import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";
import { SYSTEM_PROMPT, GEMINI_MODELS } from "@/lib/prompts";
import { resolvePexelsImages } from "@/lib/pexels";
import { getClientIp, getUsage, incrementUsage } from "@/lib/rateLimiter";

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
                // Return the ORIGINAL mjml but HTML with markers
                return NextResponse.json({ mjml: rawMjmlCode, html });
            } catch (compileError: unknown) {
                const compileMsg = compileError instanceof Error ? compileError.message : String(compileError);
                return NextResponse.json({ error: "Failed to compile MJML", details: compileMsg }, { status: 500 });
            }
        }

        // Apply rate limit for actual AI generation
        const ip = getClientIp(req);
        const usage = getUsage(ip);

        // Validate the model against the allowed GEMINI_MODELS list
        let primaryModel = requestedModel;
        if (!primaryModel) {
            primaryModel = "gemini-2.5-flash";
        } else if (!GEMINI_MODELS.some(m => m.value === primaryModel)) {
            return NextResponse.json({ error: "Invalid model selected." }, { status: 400 });
        }

        // Check if selected model's limit has been reached
        const selectedModelUsage = usage.modelCounts?.[primaryModel];
        if (selectedModelUsage && selectedModelUsage.remaining <= 0) {
            return NextResponse.json({
                error: `Daily generation limit reached for "${primaryModel}". Please switch to another model in the dropdown.`,
                code: "LIMIT_EXCEEDED"
            }, { status: 429 });
        }

        if (!prompt && !imageBase64) {
            return NextResponse.json({ error: "Prompt or an image is required" }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
        }

        // Build the try queue: primary model first, followed by others in fallback list that have remaining quota
        const modelQueue = [
            primaryModel,
            ...["gemini-3.5-flash", "gemini-3-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"].filter(m => m !== primaryModel)
        ].filter(modelName => {
            const mUsage = usage.modelCounts?.[modelName];
            return !mUsage || mUsage.remaining > 0;
        });

        if (modelQueue.length === 0) {
            return NextResponse.json({
                error: "All models have reached their generation limits. Please try again tomorrow.",
                code: "LIMIT_EXCEEDED"
            }, { status: 429 });
        }

        let mjmlCode = "";
        let resolvedModel = primaryModel;
        let lastError: unknown = null;
        const failedModels: Record<string, string> = {};

        for (let i = 0; i < modelQueue.length; i++) {
            const currentModel = modelQueue[i];
            console.log(`[API] Attempting generation with model: ${currentModel} (Attempt ${i + 1}/${modelQueue.length})`);
            try {
                const model = ai.getGenerativeModel({
                    model: currentModel,
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
                resolvedModel = currentModel;
                console.log(`[API] Gemini OK using model ${currentModel}, response length:`, mjmlCode.length);
                
                // If succeeded, break out of the loop
                lastError = null;
                break;
            } catch (genError: unknown) {
                console.error(`[API] Gemini error with model ${currentModel}:`, genError);
                lastError = genError;

                const errObj = genError as { message?: string; status?: number };
                const errMsg: string = errObj?.message || String(genError);
                failedModels[currentModel] = errMsg;
                const status: number = errObj?.status || 500;

                // Identify if the error is transient/overloaded (503, 429, or specific message patterns)
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
                    console.warn(`[API] Model ${currentModel} failed (${errMsg}). Trying fallback model: ${modelQueue[i + 1]}`);
                    continue;
                } else {
                    // Non-transient or last model in queue: exit loop and handle the error
                    break;
                }
            }
        }

        if (lastError) {
            console.error("[API] Final Gemini execution failure:", lastError);

            const errObj = lastError as { message?: string; status?: number };
            const errMsg: string = errObj?.message || String(lastError);
            const status: number = errObj?.status || 500;

            if (status === 429 || errMsg.includes("429") || errMsg.toLowerCase().includes("quota")) {
                return NextResponse.json({
                    error: `Daily quota reached or rate-limited. Switch to another model in the model selector.`,
                    code: "QUOTA_EXCEEDED"
                }, { status: 429 });
            }

            if (status === 404 || errMsg.includes("404") || errMsg.toLowerCase().includes("not found")) {
                return NextResponse.json({
                    error: `Model is not available with your API key. Try Gemini 2.5 Flash, 2.0 Flash or 1.5 Pro.`,
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

        // Extract only the content between <mjml> and </mjml> tags to discard any surrounding conversational text
        const mjmlMatch = mjmlCode.match(/<mjml>[\s\S]*?<\/mjml>/i);
        if (mjmlMatch) {
            mjmlCode = mjmlMatch[0];
        }

        // Rewrite all external/unauthorized image URLs to placehold.co text placeholders
        mjmlCode = sanitizeImageSources(mjmlCode);

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
            
            // Increment usage limit only on successful generation
            const updatedUsage = incrementUsage(ip, resolvedModel);

            // Return the ORIGINAL mjml (clean) but HTML with markers for section detection and the model that succeeded
            return NextResponse.json({ 
                mjml: mjmlCode, 
                html, 
                modelUsed: resolvedModel,
                usage: updatedUsage,
                failedModels
            });

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
