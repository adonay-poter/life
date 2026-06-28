import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Jina Reader converts any URL to clean markdown, perfectly formatted for LLMs
    const response = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
      headers: {
        'Accept': 'text/event-stream', // Can optionally use JSON, but text is fine
      }
    });

    if (!response.ok) {
      throw new Error(`Jina Reader returned status: ${response.status}`);
    }

    const markdownContent = await response.text();

    // Check if the extracted content contains bot detection/CAPTCHA block keywords
    const lowerContent = markdownContent.toLowerCase();
    const blockKeywords = [
      'detected unusual activity',
      'javascript disabled',
      'automated (bot) activity',
      'please complete the security check',
      'captcha',
      'robot check',
      'access denied',
      'unusual activity from your device'
    ];

    if (blockKeywords.some(keyword => lowerContent.includes(keyword))) {
      return NextResponse.json(
        { error: 'Source blocked extraction (CAPTCHA/bot protection)' },
        { status: 403 }
      );
    }

    return NextResponse.json({ content: markdownContent });
  } catch (err: any) {
    console.error('Research Extract API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
