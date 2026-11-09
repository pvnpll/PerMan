'use client';
import { useCallback, useEffect, useState } from 'react';
import type { WorkspaceInput, WorkspaceItem } from '@/lib/workspace';

export async function workspaceRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed. Please try again.');
  return result;
}

export function useWorkspace() {
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try { const result = await workspaceRequest('/api/workspace'); setItems(result.items); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load workspace.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const save = async (input: WorkspaceInput) => {
    const { item } = await workspaceRequest('/api/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    setItems(old => [{ ...old.find(existing => existing.id === item.id), ...item }, ...old.filter(existing => existing.id !== item.id)]);
    return item as WorkspaceItem;
  };
  const remove = async (id: string) => {
    await workspaceRequest(`/api/workspace/${id}`, { method: 'DELETE' });
    setItems(old => old.filter(item => item.id !== id));
  };
  return { items, loading, error, reload, save, remove };
}
