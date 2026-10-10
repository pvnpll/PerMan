import { NextRequest, NextResponse } from 'next/server';
import { processDueReminders } from '@/lib/services/reminders.service';


export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Validate CRON_SECRET if configured
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing CRON_SECRET' },
      { status: 401 }
    );
  }

  try {
    const result = await processDueReminders();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error('Cron reminder processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error during reminder processing',
      },
      { status: 500 }
    );
  }
}
