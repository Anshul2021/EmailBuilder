import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "src/lib/rateLimitCache.json");

export interface IPUsage {
    modelCounts: Record<string, number>;
    lastResetDate: string; // YYYY-MM-DD
}

function readCache(): { clientUsage: Record<string, IPUsage> } {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const content = fs.readFileSync(CACHE_FILE, "utf-8");
            const parsed = JSON.parse(content);
            return {
                clientUsage: parsed.clientUsage || {}
            };
        }
    } catch (e) {
        console.error("Failed to read rate limit cache:", e);
    }
    return { clientUsage: {} };
}

function writeCache(clientUsage: Record<string, IPUsage>) {
    try {
        const dir = path.dirname(CACHE_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ clientUsage }, null, 2), "utf-8");
    } catch (e) {
        console.error("Failed to write rate limit cache:", e);
    }
}

export const MODEL_LIMITS: Record<string, number> = {
    "gemini-3.1-flash-lite": 3,
    "gemini-2.5-flash": 3,
    "gemini-3.5-flash": 3,
    "gemini-3-flash": 3,
    "gemini-2.5-flash-lite": 3,
};

export function getClientIp(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    let ip = "127.0.0.1";
    if (forwarded) {
        ip = forwarded.split(/\s*,\s*/)[0];
    } else {
        ip = req.headers.get("x-real-ip") || "127.0.0.1";
    }
    // Normalize localhost loopback interfaces
    if (ip === "::1" || ip === "::ffff:127.0.0.1" || ip === "localhost") {
        return "127.0.0.1";
    }
    return ip;
}

function getTodayString(): string {
    return new Date().toISOString().split("T")[0];
}

export function getUsage(ip: string, clientId?: string) {
    const today = getTodayString();
    const cache = readCache();
    
    // Track strictly by IP address (ignoring clientId)
    const key = ip;
    
    let usage = cache.clientUsage[key];
    if (!usage || usage.lastResetDate !== today) {
        usage = { modelCounts: {}, lastResetDate: today };
        cache.clientUsage[key] = usage;
        writeCache(cache.clientUsage);
    }
    
    const modelCounts: Record<string, { used: number; limit: number; remaining: number }> = {};
    for (const [modelId, limit] of Object.entries(MODEL_LIMITS)) {
        const used = usage.modelCounts[modelId] || 0;
        modelCounts[modelId] = {
            used,
            limit,
            remaining: Math.max(0, limit - used)
        };
    }
    
    const totalUsed = Object.values(usage.modelCounts).reduce((a, b) => a + b, 0);
    const overallLimit = Object.values(MODEL_LIMITS).reduce((sum, lim) => sum + lim, 0); // Max total across all models

    return {
        used: totalUsed,
        limit: overallLimit,
        remaining: Math.max(0, overallLimit - totalUsed),
        modelCounts,
        isIpBlocked: false,
        activeSessions: 1
    };
}

export function incrementUsage(ip: string, modelId = "gemini-2.5-flash", clientId?: string) {
    const today = getTodayString();
    const key = ip;
    const cache = readCache();
    
    let usage = cache.clientUsage[key];
    if (!usage || usage.lastResetDate !== today) {
        usage = { modelCounts: { [modelId]: 1 }, lastResetDate: today };
    } else {
        usage.modelCounts[modelId] = (usage.modelCounts[modelId] || 0) + 1;
    }
    cache.clientUsage[key] = usage;
    
    writeCache(cache.clientUsage);
    
    return getUsage(ip, clientId);
}

export function resetUsage(ip: string, clientId?: string) {
    const today = getTodayString();
    const key = ip;
    const cache = readCache();
    
    cache.clientUsage[key] = { modelCounts: {}, lastResetDate: today };
    
    writeCache(cache.clientUsage);
}
