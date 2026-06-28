import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { topic, researchContent, model = 'gemini-2.5-flash', existingContext } = await request.json();

    if (!topic || !researchContent) {
      return NextResponse.json({ error: 'Topic and researchContent are required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    const prompt = `You are an expert curriculum designer. 
Given a topic and raw research text, create a structured course outline.
Break the topic into 3 to 6 logical modules (chapters).
Each module should have a title and a brief description.
IMPORTANT: Do NOT output placeholder text like "Module 1 Title" or "Course Title". You must invent real, contextual, and descriptive titles and descriptions based on the topic and research content.${existingContext ? `\n\nIMPORTANT CONTEXT ABOUT THE EXISTING COURSE:\n${existingContext}\n\nPlease generate NEW modules that complement and expand upon the existing context. Do NOT duplicate existing modules. Your output should ONLY contain the NEW modules to be added to this course.` : ''}

Return ONLY a JSON object with this structure and NO conversational text before or after:
{
  "title": "Course Title",
  "description": "Short course description",
  "category": "Education",
  "modules": [
    {
      "title": "Module 1 Title",
      "description": "What this module covers"
    }
  ]
}

Topic: ${topic}
Research Content:
${researchContent.substring(0, 30000)}`;

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
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const tokens = data.usageMetadata?.totalTokenCount || 0;

    if (!content) {
      throw new Error('No valid response from LLM');
    }

    let cleanText = content.trim();
    
    // First try to extract from a markdown code block
    const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      cleanText = jsonMatch[1].trim();
    } else {
      // Fallback: find the first and last curly braces
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
      } else {
        throw new Error('No JSON object found in response');
      }
    }

    let outline;
    try {
      outline = JSON.parse(cleanText);
    } catch (parseErr: any) {
      console.error('Failed to parse JSON. Raw content:', content);
      console.error('Cleaned text attempted to parse:', cleanText);
      throw new Error(`Invalid JSON format from AI: ${parseErr.message}`);
    }

    return NextResponse.json({ outline, tokens });
  } catch (err: any) {
    console.error('Research Outline API Error:', err);
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
