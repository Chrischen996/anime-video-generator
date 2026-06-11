import { NextRequest, NextResponse } from 'next/server';
import { AgnesClient } from '@/lib/providers/agnes';

export async function POST(request: NextRequest) {
  try {
    const { video_id, api_key } = await request.json();

    if (!video_id || !api_key) {
      return NextResponse.json(
        { success: false, error: 'video_id and api_key are required' },
        { status: 400 }
      );
    }

    const client = new AgnesClient(api_key);
    const result = await client.getVideoResult(video_id);

    return NextResponse.json({
      success: true,
      data: {
        status: result.status,
        progress: result.progress ?? 0,
        video_url: result.video_url,
        error: result.error,
      },
    });
  } catch (error: any) {
    console.error('Agnes status check error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check video status' },
      { status: 500 }
    );
  }
}
