const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Basic .env.local loader
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim();
    });
}

async function test() {
    console.log("Using API Key:", process.env.GEMINI_API_KEY ? "FOUND" : "MISSING");
    if (!process.env.GEMINI_API_KEY) return;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Tiny 1x1 transparent pixel base64
    const tinyImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR42mP8/mwWAAXfA79f6f6hAAAAAElFTkSuQmCC";

    try {
        console.log("Calling Gemini 2.5 Flash with tiny image...");
        const result = await model.generateContent([
            "Return the text 'OK' if you can see this 1x1 pixel image.",
            {
                inlineData: {
                    data: tinyImage,
                    mimeType: "image/png"
                }
            }
        ]);
        const response = await result.response;
        console.log("Gemini Response:", response.text());
    } catch (err) {
        console.error("Gemini Fatal Error:", err);
    }
}

test();
