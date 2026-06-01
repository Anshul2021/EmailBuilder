import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/rateLimiter";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const ip = getClientIp(req);

        // Query Supabase RPC directly - no Redis caching for onboarding contact status
        const { data, error } = await supabase.rpc("get_onboarding_contact", {
            p_ip: ip,
        });

        if (error) {
            console.error("[Onboarding API] Supabase RPC get_onboarding_contact error during GET:", error);
            
            // Backward compatibility fallback using check_onboarding_ip function
            try {
                const { data: exists } = await supabase.rpc("check_onboarding_ip", { p_ip: ip });
                const result = { onboarded: !!exists, name: null, contact_info: null };
                return NextResponse.json(result);
            } catch (fallbackErr) {
                return NextResponse.json({ onboarded: false, name: null, contact_info: null });
            }
        }

        const hasRecord = data && data.length > 0;
        const result = {
            onboarded: hasRecord,
            name: hasRecord ? data[0].name : null,
            contact_info: hasRecord ? data[0].contact_info : null,
        };

        return NextResponse.json(result);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[Onboarding API] Error in GET handler:", error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req);
        const { name, contact_info } = await req.json();

        // Save to Supabase via RPC directly
        const { data: saved, error } = await supabase.rpc("save_onboarding_contact", {
            p_name: name?.trim() || null,
            p_contact_info: contact_info?.trim() || null,
            p_ip: ip,
        });

        if (error) {
            console.error("[Onboarding API] Supabase RPC error during POST:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, saved });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[Onboarding API] Error in POST handler:", error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
