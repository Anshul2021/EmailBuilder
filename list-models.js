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

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // SDK 0.24+ has a listModels method? 
        // Actually, the standard way in Node SDK for listing is via the v1 endpoint.
        // Let's try the simple model test for common names.
        const models = [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-pro-vision",
            "gemini-1.0-pro"
        ];

        console.log("Testing model reachability...");
        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                await model.generateContent("test");
                console.log(`[OK] ${m}`);
            } catch (e) {
                console.log(`[FAIL] ${m}: ${e.message.split('\n')[0]}`);
            }
        }
    } catch (err) {
        console.error("Discovery failed:", err);
    }
}

listModels();
