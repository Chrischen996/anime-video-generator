import { NextRequest } from 'next/server';

// Simple streaming proxy for external video URLs (supports Range passthrough)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');
    if (!targetUrl) {
      return new Response('Missing url param', { status: 400 });
    }

    let parsedTargetUrl: URL;
    try {
      parsedTargetUrl = new URL(targetUrl);
    } catch {
      return new Response('Invalid url param', { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsedTargetUrl.protocol)) {
      return new Response('Unsupported url protocol', { status: 400 });
    }

    const range = request.headers.get('range') || undefined;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(parsedTargetUrl.toString(), {
        headers: range ? { Range: range } : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      console.warn('Video proxy fetch failed, redirecting to original URL:', {
        targetUrl: parsedTargetUrl.toString(),
        error: error instanceof Error ? error.message : String(error),
      });
      return new Response('Video proxy unavailable', { status: 502 });
    } finally {
      clearTimeout(timeoutId);
    }

    // Pass-through status and headers relevant for media streaming
    const headers = new Headers();
    // Content headers
    const contentType = upstreamResponse.headers.get('content-type') || 'video/mp4';
    headers.set('Content-Type', contentType);
    const contentLength = upstreamResponse.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);
    const acceptRanges = upstreamResponse.headers.get('accept-ranges');
    if (acceptRanges) headers.set('Accept-Ranges', acceptRanges);
    const contentRange = upstreamResponse.headers.get('content-range');
    if (contentRange) headers.set('Content-Range', contentRange);
    // Caching disabled to respect signed URLs
    headers.set('Cache-Control', 'no-store');
    // CORS for client playback
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers,
    });
  } catch (error: any) {
    console.warn('Video proxy failed:', error);
    return new Response(error?.message || 'Proxy error', { status: 502 });
  }
}
