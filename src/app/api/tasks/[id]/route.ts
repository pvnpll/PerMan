import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-helper';
import { getTaskById, updateTask, deleteTask } from '@/lib/services/tasks.service';
import { UpdateTaskSchema } from '@/lib/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const task = await getTaskById(userId, id);
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = UpdateTaskSchema.parse(body);

    const updated = await updateTask(userId, id, validated);
    return NextResponse.json({ task: updated });
  } catch (err: any) {
    console.error(`PATCH /api/tasks/${id} error:`, err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await deleteTask(userId, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`DELETE /api/tasks/${id} error:`, err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
