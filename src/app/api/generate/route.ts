import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mjml2html from "mjml";

// We disable caching for this route as each generation is unique
export const dynamic = "force-dynamic";

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
        const { prompt } = body;

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
        }

        console.log("Generating template for prompt:", prompt);

        let mjmlCode = "";
        try {
            // Found gemini-2.5-flash is available for this key via list-models
            const model = ai.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: SYSTEM_PROMPT
            });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            mjmlCode = response.text() || "";
        } catch (genError: any) {
            console.error("Gemini 2.5 Flash generation failed:", genError.message);
            throw genError; // Re-throw to be caught by the outer catch block
        }

        console.log("Received MJML code from Gemini.");

        // Clean up any potential markdown code blocks if the model didn't follow the 'no markdown' instruction
        mjmlCode = mjmlCode.replace(/```(mjml|html)?\n/g, '').replace(/```$/m, '').trim();

        if (!mjmlCode.startsWith('<mjml>')) {
            console.warn("Generated output does not look like valid MJML (starting with <mjml>):", mjmlCode.substring(0, 100) + "...");
        }

        // Compile MJML to HTML
        try {
            console.log("Starting MJML compilation...");
            // Handle different import styles just in case
            const mjmlFunc = typeof mjml2html === 'function' ? mjml2html : (mjml2html as any).default;

            if (typeof mjmlFunc !== 'function') {
                throw new Error("MJML library is not loaded correctly as a function.");
            }

            const { html, errors } = mjmlFunc(mjmlCode, {
                validationLevel: 'soft',
                keepComments: false,
            });

            if (errors && errors.length > 0) {
                console.warn("MJML compiler warnings/errors:", errors);
            }

            console.log("Compilation successful.");
            return NextResponse.json({
                mjml: mjmlCode,
                html: html
            });
        } catch (compileError: unknown) {
            console.error("MJML Compilation Error details:", compileError);
            const errorMessage = compileError instanceof Error ? compileError.message : "Unknown compile error";
            return NextResponse.json({ error: "Failed to compile MJML to HTML", details: errorMessage }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Critical API Error details:", error);

        // Handle specific Gemini API errors like Quota Exceeded (429)
        if (error.status === 429 || error.message?.includes("429") || error.message?.includes("quota")) {
            return NextResponse.json({
                error: "Gemini API Quota Exceeded",
                details: "You've exceeded your current free tier quota for the Gemini API. Please wait a minute or check your Google AI Studio account."
            }, { status: 429 });
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown internal error";
        return NextResponse.json({ error: "Internal Server Error", details: errorMessage }, { status: 500 });
    }
}
