import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("query");

        if (!query) {
            return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
        }

        const apiKey = process.env.PEXELS_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Pexels API key not configured on server" }, { status: 500 });
        }

        console.log(`[Pexels API Route] Searching for: "${query}"`);
        const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`, {
            headers: {
                Authorization: apiKey
            }
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Pexels API returned ${response.status}` }, { status: response.status });
        }

        const data = await response.json();
        const photos = (data.photos || []).map((photo: any) => ({
            id: photo.id,
            url: photo.url,
            src: {
                large: photo.src.large,
                medium: photo.src.medium,
                tiny: photo.src.tiny,
            },
            alt: photo.alt,
            photographer: photo.photographer,
        }));

        return NextResponse.json({ photos });

    } catch (error: any) {
        console.error("[Pexels API Route] Error:", error);
        return NextResponse.json({ error: error.message || "Failed to search images" }, { status: 500 });
    }
}
