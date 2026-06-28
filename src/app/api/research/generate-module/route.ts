import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { topic, module, researchContent, model = 'gemini-2.5-flash', existingContext } = await request.json();

    if (!topic || !module || !researchContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    const prompt = `You are an expert educator and writer. 
Write detailed, engaging, and highly informative course notes for a specific module within a course.
The notes must be written in rich Markdown format.
Use headings, bold text, bullet points, and blockquotes where appropriate.
CRITICAL REQUIREMENT: You MUST cite your sources using markdown footnotes or inline links to verify facts, based on the provided research content.

IMPORTANT: Do NOT output any internal monologue, drafting steps, scratchpads, or planning. Output ONLY the final, polished Markdown content ready for publication. Do not write things like "I need to draft this..." or "Drafting Section 1...". 

Return ONLY the raw markdown content.

Course Topic: ${topic}
Module Title: ${module.title}
Module Description: ${module.description}
${existingContext ? `\nIMPORTANT CONTEXT ABOUT THE EXISTING COURSE:\n${existingContext}\n\nPlease ensure your new notes complement this existing context without being redundant.\n` : ''}
Raw Research Content (use this to write the notes and cite sources):
${researchContent.substring(0, 30000)}

Write the comprehensive Markdown notes for this module now:`;

    const response = await fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned status: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const markdown = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const tokens = data.usageMetadata?.totalTokenCount || 0;

    if (!markdown) {
      throw new Error('No valid response from LLM');
    }

    return NextResponse.json({ markdown: markdown.trim(), tokens });
  } catch (err: any) {
    console.error('Research Generate Module API Error:', err);
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
