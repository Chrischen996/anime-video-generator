import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const apiKey = process.env.FAL_API_KEY?.trim() || '';
    if (!apiKey || apiKey === 'your_fal_api_key_here') {
      return NextResponse.json(
        { valid: false, error: 'FAL_API_KEY is not configured on the server' },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true, message: 'FAL_API_KEY is configured on the server' });
  } catch (error: any) {
    console.error('API key validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate server environment' },
      { status: 500 }
    );
  }
}
