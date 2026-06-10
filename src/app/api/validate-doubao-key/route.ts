import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const apiKey = process.env.DOUBAO_API_KEY?.trim() || '';
    if (!apiKey || apiKey === 'your_doubao_api_key_here') {
      return NextResponse.json(
        { valid: false, error: 'DOUBAO_API_KEY is not configured on the server' },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true, message: 'DOUBAO_API_KEY is configured on the server' });
  } catch (error: any) {
    console.error('Doubao API key validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate server environment' },
      { status: 500 }
    );
  }
}
