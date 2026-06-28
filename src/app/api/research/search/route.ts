import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { topic, model = 'gemini-2.5-flash' } = await request.json();

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    // Primary Search: DuckDuckGo HTML (extremely reliable, fast, no API quota consumption)
    let uniqueUrls: string[] = [];
    
    try {
      const ddgResponse = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(topic)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }
      );
      
      if (ddgResponse.ok) {
        const html = await ddgResponse.text();
        const urlRegex = /uddg=([^&"]+)/g;
        const matches: string[] = [];
        let match;
        while ((match = urlRegex.exec(html)) !== null) {
          const decodedUrl = decodeURIComponent(match[1]);
          const isBlockedDomain = decodedUrl.includes('researchgate.net') || decodedUrl.includes('academia.edu');
          if (decodedUrl.startsWith('http') && !decodedUrl.includes('duckduckgo.com') && !isBlockedDomain) {
            matches.push(decodedUrl);
          }
        }
        uniqueUrls = Array.from(new Set(matches)).slice(0, 5);
      }
    } catch (e) {
      console.warn('DuckDuckGo search failed, falling back to Gemini Search Grounding...', e);
    }

    let totalTokens = 0;

    // Fallback Search: Gemini Search Grounding (if DDG search returned no results)
    if (uniqueUrls.length === 0) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('No search results found and GEMINI_API_KEY is missing for fallback search');
      }

      const prompt = `Conduct a comprehensive search on the topic: "${topic}".
Identify the most authoritative, detailed, and relevant sources (articles, wiki, educational sites).
Return a list of the 3-5 best absolute URLs containing the best information to learn about this topic as plain text.`;

      const response = await fetchGeminiWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }]
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API returned status: ${response.status}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      totalTokens = data.usageMetadata?.totalTokenCount || 0;

      if (textResponse) {
        const urlRegex = /(https?:\/\/[^\s)\],]+)/g;
        const matches = textResponse.match(urlRegex) || [];
        
        const metadata = data.candidates?.[0]?.groundingMetadata;
        const metadataUrls: string[] = [];
        if (metadata && metadata.groundingChunks) {
          metadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web && chunk.web.uri) {
              const uri = chunk.web.uri;
              const isBlockedDomain = uri.includes('researchgate.net') || uri.includes('academia.edu');
              if (!isBlockedDomain) {
                metadataUrls.push(uri);
              }
            }
          });
        }
        uniqueUrls = Array.from(new Set([...matches, ...metadataUrls])).slice(0, 5);
      }
    }

    if (uniqueUrls.length === 0) {
      throw new Error('No sources found for this topic.');
    }

    return NextResponse.json({ urls: uniqueUrls, tokens: totalTokens });
  } catch (err: any) {
    console.error('Research Search API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

async function fetchGeminiWithRetry(url: string, options: RequestInit, retries = 5, initialDelay = 4000) {
  let delay = initialDelay;
  let lastResponse: Response | null = null;
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429 || response.status >= 500) {
        lastResponse = response;
        const jitter = Math.floor(Math.random() * 1000);
        console.warn(`Gemini API returned status ${response.status}. Retrying in ${delay + jitter}ms... (Attempt ${i+1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2;
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      const jitter = Math.floor(Math.random() * 1000);
      console.warn(`Fetch error occurred. Retrying in ${delay + jitter}ms... (Attempt ${i+1}/${retries})`, err);
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      delay *= 2;
    }
  }
  if (lastResponse) return lastResponse;
  if (lastError) throw lastError;
  return fetch(url, options);
}
