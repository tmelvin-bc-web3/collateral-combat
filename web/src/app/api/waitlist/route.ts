import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/config/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/api/waitlist/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Waitlist API] Error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/waitlist/count`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Waitlist API] Error:', error);
    return NextResponse.json({ count: 0 });
  }
}
