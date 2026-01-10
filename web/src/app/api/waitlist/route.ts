import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const WAITLIST_FILE = path.join(process.cwd(), 'waitlist.json');

function getWaitlist(): string[] {
  try {
    if (fs.existsSync(WAITLIST_FILE)) {
      const data = fs.readFileSync(WAITLIST_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // File doesn't exist or is invalid
  }
  return [];
}

function saveWaitlist(emails: string[]) {
  fs.writeFileSync(WAITLIST_FILE, JSON.stringify(emails, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const waitlist = getWaitlist();
    const normalizedEmail = email.toLowerCase().trim();

    if (waitlist.includes(normalizedEmail)) {
      return NextResponse.json({ message: 'Already on the waitlist!' }, { status: 200 });
    }

    waitlist.push(normalizedEmail);
    saveWaitlist(waitlist);

    return NextResponse.json({ message: 'Successfully joined the waitlist!' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function GET() {
  const waitlist = getWaitlist();
  return NextResponse.json({ count: waitlist.length });
}
