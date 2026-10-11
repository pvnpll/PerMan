import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-helper';
import { getCategories, createCategory } from '@/lib/services/categories.service';
import { CreateCategorySchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const categories = await getCategories(userId);
    return NextResponse.json({ categories });
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
    const validated = CreateCategorySchema.parse(body);

    const category = await createCategory(userId, validated);
    return NextResponse.json({ category }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
