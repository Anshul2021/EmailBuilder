const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API key found");
        return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // The listModels method might not be available on the standard class in this exact way, 
        // but we can try fetching the models endpoint manually if needed.
        // However, some versions of the SDK have it.
        console.log("Attempting to list models...");
        // Since we don't have a direct listModels in the new SDK easily accessible without complex setup,
        // let's try a direct fetch to the Google API using the key.
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log("Models found:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
