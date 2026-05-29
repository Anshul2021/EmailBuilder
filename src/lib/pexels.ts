/**
 * Utility to search Pexels API and replace placeholder URLs in MJML code.
 */
export async function resolvePexelsImages(mjmlCode: string): Promise<string> {
    const pexelsApiKey = process.env.PEXELS_API_KEY;
    if (!pexelsApiKey) {
        console.warn("[Pexels] PEXELS_API_KEY is not defined, skipping replacement.");
        return mjmlCode;
    }

    // Match patterns like:
    // https://images.pexels.com/placeholder?query=SEARCH_TERM
    const regex = /https:\/\/images\.pexels\.com\/placeholder\?query=([^"'\s>]+)/gi;
    const matches = Array.from(mjmlCode.matchAll(regex));
    if (matches.length === 0) {
        return mjmlCode;
    }

    // Extract unique queries
    const queries = Array.from(new Set(matches.map(m => decodeURIComponent(m[1]))));
    const queryCounters: { [query: string]: number } = {};
    const queryCache: { [query: string]: any[] } = {};

    // Fetch the list of photos for each query in parallel
    await Promise.all(
        queries.map(async (query) => {
            try {
                console.log(`[Pexels] Searching for: "${query}"`);
                const response = await fetch(
                    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10`,
                    {
                        headers: {
                            Authorization: pexelsApiKey,
                        },
                    }
                );
                if (!response.ok) {
                    console.error(`[Pexels] API error: ${response.status} ${response.statusText}`);
                    return;
                }
                const data = await response.json();
                if (data.photos && data.photos.length > 0) {
                    queryCache[query] = data.photos;
                    queryCounters[query] = 0;
                }
            } catch (error) {
                console.error(`[Pexels] Fetch error for query "${query}":`, error);
            }
        })
    );

    // Replace placeholders
    return mjmlCode.replace(regex, (match, encodedQuery) => {
        const query = decodeURIComponent(encodedQuery);
        const photos = queryCache[query];
        if (photos && photos.length > 0) {
            const idx = queryCounters[query] % photos.length;
            queryCounters[query]++;
            // Use high resolution large image
            return photos[idx].src.large;
        }
        // Fallback to placehold.co if no photos found or API error
        return `https://placehold.co/600x400?text=${encodedQuery}`;
    });
}
