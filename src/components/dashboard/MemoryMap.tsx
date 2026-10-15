'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Focus, Minus, Plus, Network, Circle } from 'lucide-react';
import type { Task } from '@/lib/types';
import type { MemoryGroup } from '@/lib/memory-map';

const colors = ['#a5b4fc', '#6ee7b7', '#fcd34d', '#7dd3fc', '#f9a8d4', '#c4b5fd'];

export function MemoryMap({ groups, onSelectTask }: { groups: MemoryGroup[]; onSelectTask: (task: Task) => void }) {
  const [path, setPath] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(0);
  let current: MemoryGroup | undefined;
  let level = groups;
  for (const id of path) {
    current = level.find(g => g.id === id);
    if (!current) break;
    level = current.children;
  }
  const currentPathValid = path.length === 0 || !!current;
  const group = currentPathValid ? current : undefined;
  const childTaskIds = new Set(group?.children.flatMap(c => c.tasks.map(t => t.id)));
  const nodes = group ? [
    ...group.children.filter(c => c.tasks.length).map(c => ({ id: c.id, name: c.name, count: c.tasks.length, group: c, task: undefined as Task | undefined })),
    ...group.tasks.filter(t => !childTaskIds.has(t.id)).map(t => ({ id: t.id, name: t.title, count: 0, group: undefined, task: t })),
  ] : groups.map(g => ({ id: g.id, name: g.name, count: g.tasks.length, group: g, task: undefined as Task | undefined }));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(nodes.length / 8) - 1));
  const visible = nodes.slice(currentPage * 8, currentPage * 8 + 8);
  const center = { x: 440, y: 265 };

  return <section className="memory-panel overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] px-5 py-4">
      <div className="flex items-center gap-2 text-sm font-medium"><Network size={16} className="text-indigo-300" /> Memory map <span className="ml-1 rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-normal text-zinc-400">LIVE</span></div>
      <div className="flex items-center gap-3 text-[11px] text-zinc-400"><span className="flex items-center gap-1.5"><Circle size={7} fill="#a5b4fc" className="text-indigo-300" /> Life areas</span><span className="flex items-center gap-1.5"><Circle size={7} className="text-emerald-300" /> Projects & tasks</span></div>
    </div>
    <div className="flex min-h-12 items-center justify-between gap-3 px-5 pt-3">
      <button onClick={() => { setPath([]); setZoom(1); setPage(0); }} className="text-xs text-zinc-400 hover:text-white">All memory{group && <span className="text-zinc-200"> / {group.name}</span>}</button>
      {path.length > 0 && <button onClick={() => (setPath(p => p.slice(0, -1)), setPage(0))} className="flex items-center gap-1 text-xs text-zinc-300"><ArrowLeft size={13} /> Back</button>}
    </div>
    {nodes.length === 0 ? <div className="flex h-[440px] flex-col items-center justify-center gap-3 px-6 text-center"><Network className="text-zinc-500" size={38} strokeWidth={1} /><h3 className="text-sm text-zinc-200">Your memory starts here</h3><p className="max-w-xs text-xs leading-6 text-zinc-500">Capture your first task or add one through ChatGPT. Your life areas and projects will appear here.</p></div> : <div className="memory-map-surface overflow-auto">
      <svg viewBox="0 0 880 530" style={{ width: `${zoom * 100}%`, minWidth: 620, height: 'auto', minHeight: 390 }} aria-label="Interactive memory map. Select a life area to explore its projects and tasks.">
        <defs><pattern id="memory-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#ffffff" opacity=".09" /></pattern></defs>
        <rect width="880" height="530" fill="url(#memory-dots)" />
        <circle cx={center.x} cy={center.y} r="149" fill="none" stroke="#ffffff" strokeOpacity=".035" strokeDasharray="3 8" />
        {visible.map((node, i) => {
          const angle = (i / visible.length) * Math.PI * 2 - Math.PI / 2;
          const x = center.x + Math.cos(angle) * 275;
          const y = center.y + Math.sin(angle) * 194;
          const color = colors[i % colors.length];
          const activate = () => { if (node.task) onSelectTask(node.task); else { setPath(group ? [...path, node.id] : [node.id]); setPage(0); } };
          return <g key={node.id}>
            <path d={`M ${center.x} ${center.y} Q ${center.x + (x - center.x) * .2} ${y} ${x} ${y}`} stroke={color} strokeOpacity=".2" fill="none" />
            <g role="button" tabIndex={0} aria-label={`${node.name}${node.count ? `, ${node.count} tasks, explore` : ', view task'}`} onClick={activate} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }} className="memory-node cursor-pointer">
              <title>{node.name}</title>
              <circle cx={x} cy={y} r="31" fill={color} fillOpacity=".035" stroke={color} strokeOpacity=".15" />
              <circle cx={x} cy={y} r="19" fill="#14171d" stroke={color} strokeOpacity=".65" />
              {node.task?.status === 'DONE' ? <path d={`M ${x-5} ${y} l 4 4 l 7 -8`} stroke={color} fill="none" strokeWidth="1.5" /> : node.task ? <circle cx={x} cy={y} r="4" fill={color} /> : <text x={x} y={y+4} textAnchor="middle" fill={color} fontSize="11">{node.count}</text>}
              <text x={x} y={y+49} textAnchor="middle" fill="#e4e4e7" fontSize="11">{node.name.length > 26 ? node.name.slice(0, 24) + '…' : node.name}</text>
              <text x={x} y={y+65} textAnchor="middle" fill="#71717a" fontSize="9">{node.task ? node.task.status.replaceAll('_', ' ') : `${node.count} task${node.count === 1 ? '' : 's'} · explore`}</text>
            </g>
          </g>;
        })}
        <circle cx={center.x} cy={center.y} r="48" fill="#a5b4fc" fillOpacity=".035" stroke="#a5b4fc" strokeOpacity=".15" />
        <circle cx={center.x} cy={center.y} r="33" fill="#171923" stroke="#a5b4fc" strokeOpacity=".55" />
        <text x={center.x} y={center.y+5} textAnchor="middle" fill="#c7d2fe" fontSize="16">{group ? '↗' : 'M'}</text>
        <text x={center.x} y={center.y+66} textAnchor="middle" fill="#fafafa" fontSize="12">{group?.name.length && group.name.length > 28 ? group.name.slice(0, 26) + '…' : group?.name || 'My memory'}</text>
      </svg>
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] px-5 py-3">
      <span className="flex items-center gap-2 text-[11px] text-zinc-500"><ArrowUpRight size={13} />{nodes.length > 8 ? `${currentPage * 8 + 1}–${Math.min((currentPage + 1) * 8, nodes.length)} of ${nodes.length} connections` : 'Select a node to explore · Scroll to move around'}</span>
      <div className="flex items-center gap-1">{nodes.length > 8 && <><button className="map-control" aria-label="Previous connections" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>‹</button><button className="map-control mr-2" aria-label="Next connections" disabled={(currentPage + 1) * 8 >= nodes.length} onClick={() => setPage(currentPage + 1)}>›</button></>}<button className="map-control" aria-label="Zoom out" disabled={zoom <= .75} onClick={() => setZoom(z => Math.max(.75, z - .25))}><Minus size={14} /></button><span className="w-10 text-center text-[10px] text-zinc-500">{Math.round(zoom * 100)}%</span><button className="map-control" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom(z => Math.min(2, z + .25))}><Plus size={14} /></button><button className="map-control ml-2" aria-label="Reset map" onClick={() => { setZoom(1); setPath([]); setPage(0); }}><Focus size={14} /></button></div>
    </div>
  </section>;
}
