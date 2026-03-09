import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
        const modelName: string = requestedModel || "gemini-2.5-flash";

        if (!prompt && !imageBase64) {
            return NextResponse.json({ error: "Prompt or an image is required" }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
        }

        console.log(`[API] Generating with model: ${modelName}`);

        let mjmlCode = "";
        try {
            const model = ai.getGenerativeModel({
                model: modelName,
                systemInstruction: SYSTEM_PROMPT
            });

            const parts: Part[] = [];
            if (prompt) parts.push({ text: prompt });
            if (imageBase64 && mimeType) {
                parts.push({
                    inlineData: {
                        data: imageBase64,
                        mimeType: mimeType
                    }
                });
            }

            const currentMessage: Content = { role: "user", parts };
            const formattedHistory: Content[] = Array.isArray(history) ? history.map((msg: any) => ({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: Array.isArray(msg.parts) ? msg.parts.map((p: any) => ({ text: p.text || "" })) : []
            })) : [];

            const result = await model.generateContent({ contents: [...formattedHistory, currentMessage] });
            mjmlCode = result.response.text() || "";
            console.log("[API] Gemini response received, length:", mjmlCode.length);
        } catch (genError: any) {
            console.error("[API] Gemini error:", genError.message);
            return NextResponse.json({
                error: "Gemini Generation Failed",
                details: genError.message
            }, { status: 500 });
        }

        // Clean MJML  
        mjmlCode = mjmlCode.replace(/```(mjml|html)?\n?/g, '').replace(/```$/m, '').trim();

        // Compile MJML → HTML (mjml is now excluded from bundling via next.config.mjs)
        try {
            console.log("[API] Compiling MJML...");
            const mjml2html = require("mjml");
            const mjmlFunc = typeof mjml2html === "function" ? mjml2html : mjml2html.default;

            const { html, errors } = mjmlFunc(mjmlCode, {
                validationLevel: "soft",
                keepComments: false,
            });

            if (errors?.length > 0) console.warn("[API] MJML warnings:", errors.length);
            console.log("[API] Compilation successful!");

            return NextResponse.json({ mjml: mjmlCode, html });
        } catch (compileError: any) {
            console.error("[API] MJML compile error:", compileError.message);
            return NextResponse.json({
                error: "Failed to compile MJML",
                details: compileError.message
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("[API] Critical error:", error.message);
        return NextResponse.json({
            error: "Internal Server Error",
            details: error.message
        }, { status: 500 });
    }
}
