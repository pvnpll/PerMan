import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-helper';
import { getTasks, createTask } from '@/lib/services/tasks.service';
import { CreateTaskSchema, SearchTasksSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());

    const parsedFilter = SearchTasksSchema.parse({
      ...searchParams,
      limit: searchParams.limit ? parseInt(searchParams.limit, 10) : 50,
      offset: searchParams.offset ? parseInt(searchParams.offset, 10) : 0,
      archived: searchParams.archived === 'true',
    });

    const result = await getTasks(userId, parsedFilter);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('GET /api/tasks error:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = CreateTaskSchema.parse(body);

    const task = await createTask(userId, validated);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/tasks error:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
