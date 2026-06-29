import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { question, rawResearch, moduleNotes, model = 'gemini-2.5-flash' } = await request.json();

    if (!question || !rawResearch) {
      return NextResponse.json({ error: 'Missing question or research context' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    const prompt = `You are a helpful AI tutor for a learning academy.
Your goal is to answer the user's question accurately based ONLY on the provided research context and module notes.
If the answer is not contained in the context, politely inform the user that you don't have enough information to answer.
Keep your answers concise, direct, and formatted in clean Markdown.

Research Context:
${rawResearch.substring(0, 20000)}

${moduleNotes ? `Current Module Notes:\n${moduleNotes.substring(0, 5000)}\n` : ''}
User Question: ${question}

Answer:`;

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
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const tokens = data.usageMetadata?.totalTokenCount || 0;

    if (!answer) {
      throw new Error('No valid response from LLM');
    }

    return NextResponse.json({ answer: answer.trim(), tokens });
  } catch (err: any) {
    console.error('Research QA API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

async function fetchGeminiWithRetry(url: string, options: RequestInit, retries = 2, initialDelay = 1000) {
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
