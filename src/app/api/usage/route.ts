import { NextRequest, NextResponse } from "next/server";
import { getClientIp, getUsage } from "@/lib/rateLimiter";

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
    return NextResponse.json({ error: "Method not allowed" }, { status: 403 });
}
