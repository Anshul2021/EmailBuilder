const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API key found in .env.local");
        return;
    }
    console.log("Using API Key:", apiKey.substring(0, 10) + "...");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
        const result = await model.generateContent("System: Generate MJML code. User: Write a simple MJML template.");
        const response = await result.response;
        const text = response.text();
        console.log("Success! Generated text length:", text.length);
        console.log("Sample:", text.substring(0, 100));
    } catch (error) {
        console.error("Error during generation:", error);
    }
}

test();
