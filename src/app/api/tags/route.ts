import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { title, content, url } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const prompt = `Extract 2-4 concise, single-word tags starting with '#' (e.g. #work, #health, #read-later, #idea, #purchase, #dev, #finance, #study) that fit this inbox item.
Title: ${title}
Content: ${content || ''}
URL: ${url || ''}

Return ONLY a JSON array of strings (e.g., ["#idea", "#dev"]). Do not return markdown syntax, explanation, or backticks.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${apiKey}`,
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
          throw new Error(`Gemini API returned status: ${response.status}`);
        }

        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const textResponse = parts.length > 0 ? parts[parts.length - 1].text : null;

        if (textResponse) {
          // Parse output safely, stripping markdown if present
          let cleanText = textResponse.trim();
          const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (match) {
            cleanText = match[1].trim();
          }

          const parsedTags = JSON.parse(cleanText);
          if (Array.isArray(parsedTags)) {
            // Standardize tags (lowercase, ensure start with '#')
            const tags = parsedTags
              .map((t: string) => t.trim().toLowerCase())
              .filter((t: string) => t.length > 0)
              .map((t: string) => (t.startsWith('#') ? t : `#${t}`));
            return NextResponse.json({ tags, geminiEnabled: true });
          }
        }
      } catch (err) {
        console.error('Error invoking Gemini API:', err);
        // Fall through to local fallback
      }
    }

    // ==========================================
    // LOCAL REGEX KEYWORD FALLBACK
    // ==========================================
    const searchString = `${title} ${content || ''} ${url || ''}`.toLowerCase();
    const tagsSet = new Set<string>();

    const rules = [
      { keywords: ['read', 'book', 'article', 'blog', 'story', 'news', 'list', 'pdf', 'doc', 'essay'], tag: '#read-later' },
      { keywords: ['buy', 'shop', 'order', 'price', 'product', 'store', 'pay', 'cost', 'amazon', 'purchase'], tag: '#purchase' },
      { keywords: ['exercise', 'run', 'walk', 'gym', 'workout', 'sleep', 'water', 'diet', 'health', 'food', 'calorie', 'sport'], tag: '#health' },
      { keywords: ['idea', 'brainstorm', 'draft', 'outline', 'design', 'project', 'build', 'write', 'concept'], tag: '#idea' },
      { keywords: ['course', 'study', 'lecture', 'class', 'homework', 'test', 'learn', 'video', 'tutorial', 'academy', 'lesson'], tag: '#study' },
      { keywords: ['code', 'github', 'next.js', 'react', 'typescript', 'api', 'software', 'dev', 'programming', 'npm'], tag: '#dev' },
      { keywords: ['money', 'finance', 'budget', 'stock', 'invest', 'portfolio', 'crypto', 'invoice'], tag: '#finance' }
    ];

    for (const rule of rules) {
      if (rule.keywords.some(keyword => searchString.includes(keyword))) {
        tagsSet.add(rule.tag);
      }
    }

    // Default tag if nothing matches
    if (tagsSet.size === 0) {
      tagsSet.add('#inbox');
    }

    return NextResponse.json({
      tags: Array.from(tagsSet),
      geminiEnabled: false,
    });
  } catch (err) {
    console.error('Tag API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
