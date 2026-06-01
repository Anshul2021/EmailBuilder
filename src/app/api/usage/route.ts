import { NextRequest, NextResponse } from "next/server";
import { getClientIp, getUsage, resetUsage } from "@/lib/rateLimiter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const ip = getClientIp(req);
        const clientId = req.headers.get("x-client-session-id") || undefined;
        const usage = await getUsage(ip, clientId);
        return NextResponse.json({ usage });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        if (process.env.NODE_ENV !== "development") {
            return NextResponse.json({ error: "Method not allowed in production" }, { status: 403 });
        }
        const ip = getClientIp(req);
        const clientId = req.headers.get("x-client-session-id") || undefined;
        await resetUsage(ip, clientId);
        const usage = await getUsage(ip, clientId);
        return NextResponse.json({ success: true, usage });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
