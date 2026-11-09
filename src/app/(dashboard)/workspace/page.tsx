'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useWorkspace, workspaceRequest } from '@/hooks/useWorkspace';
import { captureLines, type WorkspaceItem } from '@/lib/workspace';

const input = 'w-full rounded-lg border border-white/15 bg-zinc-900 p-3 text-sm text-zinc-200';
const button = 'rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-40';
type Tab = 'NOTE' | 'ROUTINE' | 'CAPTURE';
const labels = { NOTE: 'Notes', ROUTINE: 'Routines', CAPTURE: 'Screenshots' };

export default function WorkspacePage() { return <Suspense fallback={<p>Loading workspace…</p>}><WorkspaceContent /></Suspense>; }

function WorkspaceContent() {
  const { items, loading, error, reload, save, remove } = useWorkspace();
  const [tab, setTab] = useState<Tab>('NOTE');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [frequency, setFrequency] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [review, setReview] = useState<{ item: WorkspaceItem; text: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const focusedItem = useSearchParams().get('item');
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setFailure(''); setMessage('');
    try { await action(); }
    catch (err) { setFailure(err instanceof Error ? err.message : 'Something went wrong. Your draft is still here.'); }
    finally { setBusy(false); }
  };
  const reset = () => { setEditing(undefined); setTitle(''); setContent(''); setFrequency('NONE'); setFile(null); setPreview(''); if (fileInput.current) fileInput.current.value = ''; };
  const edit = (item: WorkspaceItem) => { setTab(item.kind as Tab); setEditing(item.id); setTitle(item.title); setContent(item.content); setFrequency(item.data.frequency || 'NONE'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const persist = () => run(async () => {
    if (tab === 'CAPTURE' && !editing) {
      if (!file) throw new Error('Choose a screenshot first.');
      const form = new FormData(); form.set('image', file); form.set('title', title || file.name); form.set('content', content);
      await workspaceRequest('/api/workspace/upload', { method: 'POST', body: form }); await reload();
    } else await save({ id: editing, kind: tab, title, content, data: tab === 'ROUTINE' ? { frequency } : {} });
    reset(); setMessage('Saved.');
  });
  const extract = () => run(async () => {
    if (!file) throw new Error('Choose a screenshot first.');
    const bitmap = await createImageBitmap(file);
    const pixels = bitmap.width * bitmap.height; bitmap.close();
    if (pixels > 20000000) throw new Error('Resize this image to under 20 megapixels before extracting text.');
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, { workerPath: '/ocr/worker.min.js', corePath: '/ocr/core', langPath: '/ocr/lang', logger: info => { if (info.status === 'recognizing text') setMessage(`Reading text: ${Math.round(info.progress * 100)}%`); } });
    try { const result = await worker.recognize(file); setContent(result.data.text.slice(0, 30000)); setMessage('Text extracted. Review it before saving or creating tasks.'); }
    finally { await worker.terminate(); }
  });
  const visible = items.filter(item => item.kind === tab && `${item.title} ${item.content}`.toLowerCase().includes(query.toLowerCase()));
  const linked = items.find(item => item.id === focusedItem);
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-medium">Your workspace</h1><p className="mt-2 text-sm text-zinc-400">Capture ideas, turn screenshots into actions, and reuse your routines.</p></div><Link href="/" className={button}>Back to Today</Link></header>
    {linked && <div className="memory-panel p-4"><p className="text-sm">Original: {linked.title}</p><p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{linked.content}</p>{linked.image_url && <a className="mt-3 inline-block text-xs text-indigo-300 underline" href={linked.image_url} target="_blank" rel="noreferrer">View original screenshot</a>}</div>}
    <div role="group" aria-label="Workspace views" className="flex flex-wrap gap-2">{(['NOTE', 'ROUTINE', 'CAPTURE'] as Tab[]).map(kind => <button key={kind} aria-pressed={kind === tab} disabled={busy} className={`${button} ${kind === tab ? 'bg-white/10' : ''}`} onClick={() => { reset(); setTab(kind); setReview(null); }}>{labels[kind]}</button>)}</div>
    {(failure || error) && <div role="alert" className="text-sm text-red-300">{failure || error} {error && <button onClick={() => void reload()} className="underline">Retry</button>}</div>}
    {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
    <form onSubmit={e => { e.preventDefault(); void persist(); }} className="memory-panel space-y-4 p-5">
      <h2 className="text-lg">{editing ? 'Edit' : 'New'} {tab === 'NOTE' ? 'note' : tab === 'ROUTINE' ? 'routine' : 'screenshot'}</h2>
      <label className="block space-y-2 text-xs text-zinc-400"><span>Title</span><input required={tab !== 'CAPTURE' || !!editing} maxLength={500} className={input} value={title} disabled={busy} onChange={e => setTitle(e.target.value)} /></label>
      {tab === 'CAPTURE' && !editing && <div className="space-y-3"><label className="block space-y-2 text-xs text-zinc-400"><span>Screenshot · PNG, JPEG, WebP · up to 3 MB</span><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className={input} onChange={e => { const selected = e.target.files?.[0]; if (selected && selected.size <= 3 * 1024 * 1024 && ['image/png', 'image/jpeg', 'image/webp'].includes(selected.type)) { setFile(selected); setContent(''); setFailure(''); } else { setFile(null); setPreview(''); setFailure('Choose a PNG, JPEG, or WebP under 3 MB.'); } }} /></label>{preview && <Image src={preview} alt="Screenshot preview" width={640} height={360} unoptimized className="max-h-64 w-auto rounded-lg object-contain" />}<button type="button" className={button} disabled={busy || !file} onClick={() => void extract()}>Extract text</button><p className="text-xs text-zinc-500">English text recognition runs on your device. Saving uploads the original to your private workspace.</p></div>}
      <label className="block space-y-2 text-xs text-zinc-400"><span>{tab === 'ROUTINE' ? 'Checklist · one step per line' : tab === 'CAPTURE' ? 'Extracted text · review and correct' : 'Note'}</span><textarea rows={5} maxLength={30000} disabled={busy} required={tab === 'ROUTINE'} className={input} value={content} onChange={e => setContent(e.target.value)} /></label>
      {tab === 'ROUTINE' && <label className="block space-y-2 text-xs text-zinc-400"><span>Repeat after completion</span><select className={input} disabled={busy} value={frequency} onChange={e => setFrequency(e.target.value as typeof frequency)}>{['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'].map(value => <option key={value} value={value}>{value.toLowerCase()}</option>)}</select></label>}
      <div className="flex gap-2"><button className={button} disabled={busy}>{busy ? 'Working…' : 'Save'}</button>{editing && <button className={button} disabled={busy} type="button" onClick={reset}>Cancel edit</button>}</div>
    </form>
    {review && <form className="memory-panel space-y-3 p-5" onSubmit={e => { e.preventDefault(); void run(async () => { const titles = captureLines(review.text); const result = await workspaceRequest(`/api/workspace/${review.item.id}/convert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titles }) }); setReview(null); setMessage(`${result.count} tasks added to your inbox. Repeating the same import will not duplicate them.`); window.dispatchEvent(new CustomEvent('perman:task_created')); }); }}><h2 className="font-medium">Review tasks from {review.item.title}</h2><p className="text-xs text-zinc-400">One task per line. Remove anything you do not want to turn into a task.</p><textarea aria-label="Task titles to create" required rows={6} maxLength={15000} className={input} value={review.text} onChange={e => setReview({ ...review, text: e.target.value })} disabled={busy} /><div className="flex gap-2"><button disabled={busy || !captureLines(review.text).length} className={button}>Create inbox tasks</button><button disabled={busy} type="button" className={button} onClick={() => setReview(null)}>Cancel</button></div></form>}
    <label className="block space-y-2 text-xs text-zinc-400"><span>Search {labels[tab].toLowerCase()}</span><input type="search" className={input} value={query} onChange={e => setQuery(e.target.value)} /></label>
    {tab === 'ROUTINE' && <label className="block space-y-2 text-xs text-zinc-400"><span>First due date for starting a routine (leave blank for now)</span><input type="datetime-local" className={input} value={date} onChange={e => setDate(e.target.value)} /></label>}
    {loading ? <p role="status">Loading workspace…</p> : !visible.length ? <p className="text-sm text-zinc-500">{query ? 'No matches.' : `No ${labels[tab].toLowerCase()} yet.`}</p> : <div className="grid gap-4 lg:grid-cols-2">{visible.map(item => <article key={item.id} className="memory-panel space-y-3 p-5"><h2 className="break-words font-medium">{item.title}</h2><p className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words text-sm text-zinc-400">{item.content}</p>{item.image_url && <a href={item.image_url} target="_blank" rel="noreferrer" className="block text-xs text-indigo-300 underline">View original screenshot</a>}{tab === 'ROUTINE' && <p className="text-xs text-zinc-500">Repeats: {(item.data.frequency || 'NONE').toLowerCase()}</p>}<div className="flex flex-wrap gap-2"><button disabled={busy} className={button} onClick={() => edit(item)}>Edit</button>{tab === 'ROUTINE' ? <button disabled={busy} className={button} onClick={() => void run(async () => { await workspaceRequest(`/api/workspace/${item.id}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ due_date: date ? new Date(date).toISOString() : new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }) }); setMessage('Routine added to next actions. Starting it again for the same day will not duplicate it.'); window.dispatchEvent(new CustomEvent('perman:task_created')); })}>Start routine</button> : <button disabled={busy} className={button} onClick={() => setReview({ item, text: captureLines(item.content || item.title).join('\n') })}>Review as tasks</button>}{deleting === item.id ? <><button disabled={busy} className={`${button} text-red-300`} onClick={() => void run(async () => { await remove(item.id); setDeleting(null); setMessage('Deleted.'); })}>Confirm delete</button><button disabled={busy} className={button} onClick={() => setDeleting(null)}>Keep</button></> : <button disabled={busy} className={button} onClick={() => setDeleting(item.id)}>Delete</button>}</div></article>)}</div>}
  </div>;
}
