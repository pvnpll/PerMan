import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-helper';
import { getProjects, createProject } from '@/lib/services/projects.service';
import { CreateProjectSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const projects = await getProjects(userId);
    return NextResponse.json({ projects });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = CreateProjectSchema.parse(body);

    const project = await createProject(userId, validated);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
