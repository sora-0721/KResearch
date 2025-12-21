// DuckDuckGo Search for KResearch

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

export async function searchDuckDuckGo(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    try {
        // DuckDuckGo HTML search (no API key required)
        const encodedQuery = encodeURIComponent(query);
        const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodedQuery}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
            }
        });

        if (!response.ok) {
            throw new Error(`DuckDuckGo search failed: ${response.statusText}`);
        }

        const html = await response.text();
        const results: SearchResult[] = [];

        // Parse results from HTML using regex (improved extraction)
        const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        const snippetRegex = /<div[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/div>/gi;

        const urlMatches = [...html.matchAll(resultRegex)];
        const snippetMatches = [...html.matchAll(snippetRegex)];

        for (let i = 0; i < Math.min(urlMatches.length, maxResults); i++) {
            const urlMatch = urlMatches[i];
            const snippetMatch = snippetMatches[i];

            if (urlMatch) {
                // DuckDuckGo encodes the actual URL in the href
                let url = urlMatch[1];
                // Extract actual URL from DuckDuckGo redirect
                const uddgMatch = url.match(/uddg=([^&]*)/);
                if (uddgMatch) {
                    url = decodeURIComponent(uddgMatch[1]);
                }

                // Clean up title (remove tags like <b>)
                let title = urlMatch[2].replace(/<[^>]*>/g, "").trim();
                // If title is still encoded or has HTML entities, we could clean it more here
                // For now, basic tag removal is usually enough

                results.push({
                    title: title,
                    url: url,
                    snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : ""
                });
            }
        }

        console.log(`[DuckDuckGo] Found ${results.length} results for query: "${query}"`);
        return results;
    } catch (error) {
        console.error("DuckDuckGo search error:", error);
        return [];
    }
}

// Format search results for use in prompts
export function formatSearchResultsForPrompt(results: SearchResult[]): string {
    if (results.length === 0) {
        return "No search results found.";
    }

    return results.map((r, i) =>
        `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`
    ).join("\n\n");
}
