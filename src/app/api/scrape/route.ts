import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    let urlString = targetUrl;
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
      urlString = 'https://' + urlString;
    }

    const parsedUrl = new URL(urlString);
    
    // Fetch target HTML with browser headers
    const response = await fetch(urlString, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 3600 } // Cache results for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();

    // Parse Title Tag
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : '';

    // Parse Description tags (OpenGraph og:description or Standard description)
    let description = '';
    const descMatches = [
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i),
      html.match(/<meta[^>]*content=["'](.*?)["'][^>]*name=["']description["']/i),
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/i),
      html.match(/<meta[^>]*content=["'](.*?)["'][^>]*property=["']og:description["']/i)
    ];

    for (const match of descMatches) {
      if (match && match[1]) {
        description = match[1].trim();
        break;
      }
    }

    // Decode HTML entities
    const decodeHtml = (str: string) => {
      return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–');
    };

    if (title) {
      title = decodeHtml(title);
      
      const blockedPatterns = [
        /please wait/i,
        /just a moment/i,
        /cloudflare/i,
        /robot check/i,
        /access denied/i,
        /attention required/i,
        /checking your browser/i,
        /security check/i,
        /ddos protection/i
      ];

      if (blockedPatterns.some(pattern => pattern.test(title))) {
        title = '';
      }
    }
    if (description) description = decodeHtml(description);

    // Resolve Favicon path
    let faviconUrl = '';
    const iconMatch = html.match(/<link[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*href=["'](.*?)["']/i);
    if (iconMatch && iconMatch[1]) {
      const matchedHref = iconMatch[1];
      if (matchedHref.startsWith('http://') || matchedHref.startsWith('https://')) {
        faviconUrl = matchedHref;
      } else if (matchedHref.startsWith('//')) {
        faviconUrl = 'https:' + matchedHref;
      } else if (matchedHref.startsWith('/')) {
        faviconUrl = `${parsedUrl.protocol}//${parsedUrl.host}${matchedHref}`;
      } else {
        faviconUrl = `${parsedUrl.protocol}//${parsedUrl.host}/${matchedHref}`;
      }
    } else {
      faviconUrl = `${parsedUrl.protocol}//${parsedUrl.host}/favicon.ico`;
    }

    return NextResponse.json({
      title: title || parsedUrl.hostname.replace('www.', ''),
      description,
      favicon: faviconUrl
    });

  } catch (err) {
    console.error('Metadata scrape error:', err);
    return NextResponse.json({ error: 'Failed to scrape metadata' }, { status: 500 });
  }
}
