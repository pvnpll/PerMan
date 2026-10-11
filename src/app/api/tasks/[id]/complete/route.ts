import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-helper';
import { completeTask } from '@/lib/services/tasks.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const task = await completeTask(userId, id);
    return NextResponse.json({ task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
