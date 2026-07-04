import { NextResponse } from 'next/server';

const URL_PATTERN = /^https?:\/\/\S+$/i;
const LOOSE_URL_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;
const AI_TYPE_OPTIONS = [
  'thought',
  'idea',
  'task',
  'quote',
  'code',
  'question',
  'journal',
  'book_note',
  'course_note',
  'decision',
  'resource',
] as const;

type StoredType = 'text' | 'url' | 'photo';

interface EnrichmentResult {
  storageType: StoredType;
  title: string;
  content?: string;
  sourceUrl?: string;
  attachmentUrl?: string;
  summary?: string;
  aiSuggestedType?: string;
  aiSuggestedAction?: string;
}

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function looksLikeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  return URL_PATTERN.test(trimmed) || LOOSE_URL_PATTERN.test(trimmed);
}

function stripHtmlEntities(str: string) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
}

function deriveTitleFromText(rawText: string) {
  const cleaned = rawText
    .trim()
    .replace(/\s+/g, ' ');
  if (!cleaned) return 'Quick capture';
  if (cleaned.length <= 72) return cleaned;
  return `${cleaned.slice(0, 69).trimEnd()}...`;
}

function deriveSummaryFromText(rawText: string) {
  const cleaned = rawText
    .trim()
    .replace(/\s+/g, ' ');
  if (!cleaned) return undefined;
  return cleaned.length <= 180 ? cleaned : `${cleaned.slice(0, 177).trimEnd()}...`;
}

function sanitizeFileTitle(fileName?: string) {
  const base = (fileName || 'Image capture').replace(/\.[^.]+$/, '').trim();
  return base || 'Image capture';
}

async function scrapeUrlMetadata(targetUrl: string) {
  const normalized = normalizeUrl(targetUrl);
  const parsedUrl = new URL(normalized);
  const response = await fetch(normalized, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }

  const html = await response.text();
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["']/i);
  const descriptionMatches = [
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i),
    html.match(/<meta[^>]*content=["'](.*?)["'][^>]*name=["']description["']/i),
    html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/i),
    html.match(/<meta[^>]*content=["'](.*?)["'][^>]*property=["']og:description["']/i),
  ];

  let title = ogTitleMatch?.[1] || titleMatch?.[1] || parsedUrl.hostname.replace(/^www\./, '');
  let description = '';

  for (const match of descriptionMatches) {
    if (match?.[1]) {
      description = match[1];
      break;
    }
  }

  title = stripHtmlEntities(title.trim());
  description = stripHtmlEntities(description.trim());

  const blockedPatterns = [
    /please wait/i,
    /just a moment/i,
    /cloudflare/i,
    /robot check/i,
    /access denied/i,
    /attention required/i,
    /checking your browser/i,
    /security check/i,
    /ddos protection/i,
  ];

  if (blockedPatterns.some((pattern) => pattern.test(title))) {
    title = parsedUrl.hostname.replace(/^www\./, '');
  }

  return {
    title,
    description,
    normalized,
  };
}

async function getAiSuggestions(title: string, content: string, sourceUrl?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return {};

  const prompt = `You classify quick-capture inbox items for later triage.
Choose the most likely detailed type from this exact list: ${AI_TYPE_OPTIONS.join(', ')}.

Title: ${title}
Content: ${content || ''}
URL: ${sourceUrl || ''}

Return ONLY valid JSON with this shape:
{"suggestedType":"idea","suggestedAction":"Short imperative next step for later"}

Rules:
- suggestedType must be one of the allowed values
- suggestedAction must be under 80 characters
- no markdown
- no explanation`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API returned status: ${response.status}`);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.at(-1)?.text?.trim();
  if (!textResponse) return {};

  const fencedMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const cleanText = fencedMatch ? fencedMatch[1].trim() : textResponse;
  const parsed = JSON.parse(cleanText);

  const suggestedType = AI_TYPE_OPTIONS.includes(parsed?.suggestedType) ? parsed.suggestedType : undefined;
  const suggestedAction =
    typeof parsed?.suggestedAction === 'string' && parsed.suggestedAction.trim()
      ? parsed.suggestedAction.trim().slice(0, 80)
      : undefined;

  return { suggestedType, suggestedAction };
}

function getFallbackSuggestions(text: string, sourceUrl?: string) {
  const haystack = `${text} ${sourceUrl || ''}`.toLowerCase();

  if (sourceUrl) {
    return { suggestedType: 'resource', suggestedAction: 'Review and sort this link later.' };
  }
  if (haystack.includes('?')) {
    return { suggestedType: 'question', suggestedAction: 'Answer or route this question later.' };
  }
  if (haystack.includes('"') || haystack.includes('“')) {
    return { suggestedType: 'quote', suggestedAction: 'Keep only if the quote still matters.' };
  }
  if (/\b(todo|follow up|need to|should|must|send|buy|call)\b/i.test(haystack)) {
    return { suggestedType: 'task', suggestedAction: 'Decide whether this becomes a task.' };
  }
  if (/\bidea|concept|build|startup|feature|angle|approach\b/i.test(haystack)) {
    return { suggestedType: 'idea', suggestedAction: 'Refine or archive this idea later.' };
  }

  return { suggestedType: 'thought', suggestedAction: 'Triage this capture during review.' };
}

export async function POST(request: Request) {
  try {
    const { rawText, fileName, attachmentUrl } = await request.json();

    const trimmedText = typeof rawText === 'string' ? rawText.trim() : '';
    const trimmedAttachment = typeof attachmentUrl === 'string' ? attachmentUrl.trim() : '';

    if (!trimmedText && !trimmedAttachment) {
      return NextResponse.json({ error: 'Capture content is required' }, { status: 400 });
    }

    let result: EnrichmentResult;

    if (trimmedAttachment) {
      result = {
        storageType: 'photo',
        title: sanitizeFileTitle(fileName),
        attachmentUrl: trimmedAttachment,
        summary: 'Image capture waiting for review.',
        aiSuggestedType: 'resource',
        aiSuggestedAction: 'Review the image and decide where it belongs.',
      };
    } else if (looksLikeUrl(trimmedText)) {
      const normalized = normalizeUrl(trimmedText);
      let title = new URL(normalized).hostname.replace(/^www\./, '');
      let summary = 'Saved link waiting for review.';

      try {
        const metadata = await scrapeUrlMetadata(normalized);
        title = metadata.title || title;
        summary = metadata.description || summary;
      } catch (error) {
        console.warn('Capture URL scrape failed, falling back to hostname:', error);
      }

      const aiSuggestions = await getAiSuggestions(title, summary, normalized).catch((error) => {
        console.warn('Capture AI suggestions failed, using fallback:', error);
        return getFallbackSuggestions(summary, normalized);
      });

      result = {
        storageType: 'url',
        title,
        sourceUrl: normalized,
        summary,
        aiSuggestedType: aiSuggestions.suggestedType,
        aiSuggestedAction: aiSuggestions.suggestedAction,
      };
    } else {
      const title = deriveTitleFromText(trimmedText);
      const summary = deriveSummaryFromText(trimmedText);
      const aiSuggestions = await getAiSuggestions(title, trimmedText).catch((error) => {
        console.warn('Capture AI suggestions failed, using fallback:', error);
        return getFallbackSuggestions(trimmedText);
      });

      result = {
        storageType: 'text',
        title,
        content: trimmedText,
        summary,
        aiSuggestedType: aiSuggestions.suggestedType,
        aiSuggestedAction: aiSuggestions.suggestedAction,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Capture enrichment failed:', error);
    return NextResponse.json({ error: 'Failed to enrich capture' }, { status: 500 });
  }
}
