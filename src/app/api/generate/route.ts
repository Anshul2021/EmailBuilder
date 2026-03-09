import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Use the model provided by the frontend, fallback to a stable 1.5 model

const SYSTEM_PROMPT = `
You are an expert MJML email template developer. 
Your task is to generate valid MJML code based on the user's prompt.
You MUST output ONLY the raw MJML code. Do not include markdown code blocks, explanations, or any other text before or after the code.

Follow these strict rules:
1. Always start with <mjml> and end with </mjml>.
2. Use standard mjml components: mj-head, mj-body, mj-section, mj-column, mj-text, mj-image, mj-button, mj-divider, mj-social.
3. Ensure the design is responsive and professional, matching modern clean aesthetics.
4. If images are requested, use placeholder images like 'https://placehold.co/600x400/png' or similar unless the user specifies otherwise.
5. Create fully functional, complete templates.
`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, imageBase64, mimeType, history = [], model: requestedModel } = body;

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
            if (prompt) parts.push({ text: prompt });
            if (imageBase64 && mimeType) {
                parts.push({ inlineData: { data: imageBase64, mimeType } });
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

            // Provide accurate, actionable error messages
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
        mjmlCode = mjmlCode.replace(/```(mjml|html)?\n?/g, "").replace(/```$/m, "").trim();

        // Compile MJML → HTML (mjml is excluded from RSC bundling via next.config.mjs)
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const mjml2html = require("mjml");
            const mjmlFunc = typeof mjml2html === "function" ? mjml2html : mjml2html.default;

            const { html, errors } = mjmlFunc(mjmlCode, {
                validationLevel: "soft",
                keepComments: false,
            });

            if (errors?.length > 0) console.warn("[API] MJML warnings:", errors.length);
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
