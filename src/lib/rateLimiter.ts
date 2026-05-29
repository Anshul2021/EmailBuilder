import { NextRequest } from "next/server";

export interface IPUsage {
    count: number;
    lastResetDate: string; // YYYY-MM-DD
}

// In-memory usage map
const usageMap = new Map<string, IPUsage>();
const DAILY_LIMIT = 6;

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
        usage = { count: 0, lastResetDate: today };
        usageMap.set(ip, usage);
    }
    
    return {
        used: usage.count,
        limit: DAILY_LIMIT,
        remaining: Math.max(0, DAILY_LIMIT - usage.count),
    };
}

export function incrementUsage(ip: string) {
    const today = getTodayString();
    let usage = usageMap.get(ip);
    
    if (!usage || usage.lastResetDate !== today) {
        usage = { count: 1, lastResetDate: today };
    } else {
        usage.count += 1;
    }
    usageMap.set(ip, usage);
    
    return {
        used: usage.count,
        limit: DAILY_LIMIT,
        remaining: Math.max(0, DAILY_LIMIT - usage.count),
    };
}

export function resetUsage(ip: string) {
    const today = getTodayString();
    usageMap.set(ip, { count: 0, lastResetDate: today });
}
