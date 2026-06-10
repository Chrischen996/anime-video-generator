import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const apiKey = process.env.AGNES_API_KEY?.trim() || '';
    if (!apiKey || apiKey === 'your_agnes_api_key_here') {
      return NextResponse.json(
        { valid: false, error: 'AGNES_API_KEY is not configured on the server' },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true, message: 'AGNES_API_KEY is configured on the server' });
  } catch (error: any) {
    console.error('Agnes API key validation error:', error);

    return NextResponse.json({
      valid: false,
      error: error.message || 'Failed to validate server environment',
    });
  }
}
