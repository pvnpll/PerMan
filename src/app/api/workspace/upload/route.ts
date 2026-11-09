import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-helper';
import { createAdminClient } from '@/lib/supabase/admin';
import { randomUUID } from 'node:crypto';

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    if (Number(req.headers.get('content-length')) > 4 * 1024 * 1024) return NextResponse.json({ error: 'Use a screenshot smaller than 3 MB.' }, { status: 413 });
    const form = await req.formData();
    const file = form.get('image');
    const content = String(form.get('content') || '').slice(0, 30000);
    const title = String(form.get('title') || 'Screenshot').slice(0, 500);
    if (!(file instanceof File) || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024 || !file.size) return NextResponse.json({ error: 'Choose a PNG, JPEG, or WebP image smaller than 3 MB.' }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    if (!(file.type === 'image/png' && png || file.type === 'image/jpeg' && jpeg || file.type === 'image/webp' && webp)) return NextResponse.json({ error: 'The image format does not match its file type.' }, { status: 400 });
    const admin = createAdminClient();
    const id = randomUUID();
    const path = `${userId}/${id}`;
    const { error: uploadError } = await admin.storage.from('pm-captures').upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data, error } = await admin.from('pm_workspace_items').insert({ id, user_id: userId, kind: 'CAPTURE', title, content, image_path: path }).select('*').single();
    if (error) { await admin.storage.from('pm-captures').remove([path]); throw error; }
    return NextResponse.json({ item: data }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Could not save screenshot. Please retry.' }, { status: 500 }); }
}
