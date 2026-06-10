import { NextRequest, NextResponse } from 'next/server';
import { AgnesClient } from '@/lib/providers/agnes';

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        { valid: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    const client = new AgnesClient(apiKey.trim());
    const isValid = await client.validateApiKey();

    return NextResponse.json({
      valid: isValid,
      error: isValid ? null : 'Invalid API key',
    });
  } catch (error: any) {
    console.error('Agnes API key validation error:', error);

    return NextResponse.json({
      valid: false,
      error: error.message || 'Failed to validate API key',
    });
  }
}