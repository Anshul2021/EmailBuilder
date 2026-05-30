import { NextRequest } from "next/server";

export interface IPUsage {
    modelCounts: Record<string, number>;
    lastResetDate: string; // YYYY-MM-DD
}

// In-memory usage map
const usageMap = new Map<string, IPUsage>();

export const MODEL_LIMITS: Record<string, number> = {
    "gemini-3.5-flash": 2,
    "gemini-3-flash": 3,
    "gemini-3.1-flash-lite": 5,
    "gemini-2.5-flash": 6,
    "gemini-2.5-flash-lite": 8,
};

export function getClientIp(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(/\s*,\s*/)[0];
    }
    return req.headers.get("x-real-ip") || "127.0.0.1";
}

function getTodayString(): string {
    return new Date().toISOString().split("T")[0];
}

export function getUsage(ip: string) {
    const today = getTodayString();
    let usage = usageMap.get(ip);
    
    if (!usage || usage.lastResetDate !== today) {
        usage = { modelCounts: {}, lastResetDate: today };
        usageMap.set(ip, usage);
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
    const overallLimit = 24; // High default
    
    return {
        used: totalUsed,
        limit: overallLimit,
        remaining: Math.max(0, overallLimit - totalUsed),
        modelCounts
    };
}

export function incrementUsage(ip: string, modelId = "gemini-2.5-flash") {
    const today = getTodayString();
    let usage = usageMap.get(ip);
    
    if (!usage || usage.lastResetDate !== today) {
        usage = { modelCounts: { [modelId]: 1 }, lastResetDate: today };
    } else {
        usage.modelCounts[modelId] = (usage.modelCounts[modelId] || 0) + 1;
    }
    usageMap.set(ip, usage);
    
    return getUsage(ip);
}

export function resetUsage(ip: string) {
    const today = getTodayString();
    usageMap.set(ip, { modelCounts: {}, lastResetDate: today });
}
