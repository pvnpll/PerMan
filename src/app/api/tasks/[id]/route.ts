import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTaskById, updateTask, deleteTask } from '@/lib/services/tasks.service';
import { UpdateTaskSchema } from '@/lib/validation';


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const task = await getTaskById(user.id, id);
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = UpdateTaskSchema.parse(body);

    const updated = await updateTask(user.id, id, validated);
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await deleteTask(user.id, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`DELETE /api/tasks/${id} error:`, err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
