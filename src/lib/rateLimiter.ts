import { NextRequest } from "next/server";
import Redis from "ioredis";

// Initialize Redis client using REDIS_URL environment variable
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
export const redis = new Redis(redisUrl);

export interface IPUsage {
    modelCounts: Record<string, number>;
    lastResetDate: string; // YYYY-MM-DD
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

export async function getUsage(ip: string, clientId?: string) {
    const today = getTodayString();
    const key = `rate_limit:${ip}:${today}`;
    
    // Fetch today's counts from Redis
    let modelCounts: Record<string, number> = {};
    try {
        const cached = await redis.get(key);
        if (cached) {
            modelCounts = JSON.parse(cached);
        }
    } catch (e) {
        console.error("[Rate Limiter] Redis read error:", e);
    }
    
    const formattedModelCounts: Record<string, { used: number; limit: number; remaining: number }> = {};
    for (const [modelId, limit] of Object.entries(MODEL_LIMITS)) {
        const used = modelCounts[modelId] || 0;
        formattedModelCounts[modelId] = {
            used,
            limit,
            remaining: Math.max(0, limit - used)
        };
    }
    
    const totalUsed = Object.values(modelCounts).reduce((a, b) => a + b, 0);
    const overallLimit = Object.values(MODEL_LIMITS).reduce((sum, lim) => sum + lim, 0);

    return {
        used: totalUsed,
        limit: overallLimit,
        remaining: Math.max(0, overallLimit - totalUsed),
        modelCounts: formattedModelCounts,
        isIpBlocked: false,
        activeSessions: 1
    };
}

export async function incrementUsage(ip: string, modelId = "gemini-2.5-flash", clientId?: string) {
    const today = getTodayString();
    const key = `rate_limit:${ip}:${today}`;
    
    try {
        const cachedStr = await redis.get(key);
        const cached: Record<string, number> = cachedStr ? JSON.parse(cachedStr) : {};
        cached[modelId] = (cached[modelId] || 0) + 1;
        
        // Write back to Redis with a 24-hour expiration window (86400 seconds)
        await redis.set(key, JSON.stringify(cached), "EX", 86400);
    } catch (e) {
        console.error("[Rate Limiter] Redis increment error:", e);
    }
    
    return await getUsage(ip, clientId);
}

export async function resetUsage(ip: string, clientId?: string) {
    const today = getTodayString();
    const key = `rate_limit:${ip}:${today}`;
    
    try {
        // Delete key to reset usage
        await redis.del(key);
    } catch (e) {
        console.error("[Rate Limiter] Redis delete error:", e);
    }
}

function getStartOfWeekString(): string {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
    const startOfWeek = new Date(now.setDate(diff));
    return startOfWeek.toISOString().split("T")[0]; // YYYY-MM-DD
}

export async function getTestEmailUsage(ip: string) {
    const startOfWeek = getStartOfWeekString();
    const key = `test_email:${ip}:${startOfWeek}`;
    const whitelistKey = `whitelist:${ip}`;
    
    let limit = 3;
    let used = 0;
    
    try {
        // Fetch whitelist custom limit if exists
        const customLimitStr = await redis.get(whitelistKey);
        if (customLimitStr) {
            const parsed = parseInt(customLimitStr, 10);
            if (!isNaN(parsed)) {
                limit = parsed;
            }
        }
        
        // Fetch current usage
        const usageStr = await redis.get(key);
        if (usageStr) {
            used = parseInt(usageStr, 10) || 0;
        }
    } catch (e) {
        console.error("[Rate Limiter] Redis test email usage fetch error:", e);
    }
    
    return {
        used,
        limit,
        remaining: Math.max(0, limit - used)
    };
}

export async function incrementTestEmailUsage(ip: string): Promise<number> {
    const startOfWeek = getStartOfWeekString();
    const key = `test_email:${ip}:${startOfWeek}`;
    try {
        const count = await redis.incr(key);
        if (count === 1) {
            // Set 7-day TTL if this is the first email sent in the week
            await redis.expire(key, 7 * 24 * 60 * 60); // 7 days in seconds
        }
        return count;
    } catch (e) {
        console.error("[Rate Limiter] Redis test email increment error:", e);
        return 0;
    }
}
