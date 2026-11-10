'use client';

import './neural-map.css';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { ArrowLeft, Brain, Check, Focus, List, Minus, Plus, RotateCcw, RotateCw, Sparkles } from 'lucide-react';
import type { Task } from '@/lib/types';
import type { MemoryGroup } from '@/lib/memory-map';
import { isNeuronLit, layoutSynapticWeb, NEURON_PAGE_SIZE } from '@/lib/neural-layout';

const MIN_ZOOM = .7;
const MAX_ZOOM = 2.5;
const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

export function MemoryMap({ groups, onSelectTask, onSelectGroup }: { groups: MemoryGroup[]; onSelectTask: (task: Task) => void; onSelectGroup?: (group: MemoryGroup | null) => void }) {
  const [path, setPath] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [page, setPage] = useState(0);
  const [view, setView] = useState<'brain' | 'list'>('brain');
  const [hovered, setHovered] = useState<string | null>(null);
  const [showNames, setShowNames] = useState(false);
  const [motion, setMotion] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; rotation: number; distance: number; zoom: number } | null>(null);
  const ignoreClickUntil = useRef(0);
  const prefix = useId().replaceAll(':', '');
  let current: MemoryGroup | undefined;
  let level = groups;
  for (const id of path) {
    const found = level.find(item => item.id === id);
    if (!found) { current = undefined; break; }
    current = found; level = found.children;
  }
  const group = current;
  const tasks = useMemo(() => [...new Map((group ? group.tasks : groups.flatMap(item => item.tasks)).filter(task => !task.archived_at).map(task => [task.id, task])).values()].sort((a, b) => a.id.localeCompare(b.id)), [group, groups]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(tasks.length / NEURON_PAGE_SIZE) - 1));
  const pageTasks = useMemo(() => tasks.slice(currentPage * NEURON_PAGE_SIZE, (currentPage + 1) * NEURON_PAGE_SIZE), [tasks, currentPage]);
  const scene = useMemo(() => layoutSynapticWeb(groups, pageTasks), [groups, pageTasks]);
  const firing = tasks.filter(isNeuronLit).length;
  const done = tasks.filter(task => task.status === 'DONE').length;
  const resting = tasks.length - firing;
  const focusedTask = tasks.find(task => task.id === (hovered || selected));
  const areas = (group ? group.children : groups).filter(item => item.tasks.length);
  useEffect(() => { onSelectGroup?.(group || null); }, [group, onSelectGroup]);
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    element.scrollLeft = Math.max(0, (element.scrollWidth - element.clientWidth) / 2);
  }, [zoom, view]);
  const open = (task: Task) => { setSelected(task.id); onSelectTask(task); };
  const navigate = (next: string[]) => { setPath(next); setPage(0); setHovered(null); setSelected(null); };
  const pointerDistance = () => {
    const values = [...pointers.current.values()];
    return values.length < 2 ? 0 : Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  };
  const beginGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture.current = { x: event.clientX, rotation, distance: pointerDistance(), zoom };
  };
  const moveGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const active = gesture.current;
    if (!active) return;
    if (pointers.current.size > 1) {
      const distance = pointerDistance();
      if (active.distance > 0) setZoom(clampZoom(active.zoom * distance / active.distance));
      ignoreClickUntil.current = Date.now() + 180;
      return;
    }
    const delta = event.clientX - active.x;
    if (Math.abs(delta) > 3) ignoreClickUntil.current = Date.now() + 180;
    setRotation(active.rotation + delta * .32);
  };
  const endGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const remaining = [...pointers.current.values()][0];
    gesture.current = remaining ? { x: remaining.x, rotation, distance: 0, zoom } : null;
  };
  const wheelZoom = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoom(value => clampZoom(value * (event.deltaY > 0 ? .9 : 1.1)));
  };
  const rotatePoint = (x: number, y: number) => {
    const angle = rotation * Math.PI / 180;
    const dx = x - 600;
    const dy = y - 370;
    return { x: 600 + dx * Math.cos(angle) - dy * Math.sin(angle), y: 370 + dx * Math.sin(angle) + dy * Math.cos(angle) };
  };
  const resetView = () => { setZoom(1); setRotation(0); navigate([]); };

  return <section className={`neural-map memory-panel overflow-hidden ${motion ? "" : "neural-motion-off"}`} aria-label="Memory synaptic web">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.06] px-5 py-4">
      <div className="flex items-center gap-3"><span className="neural-brand"><Brain size={20} strokeWidth={1.3} /></span><div><h2 className="text-sm font-medium tracking-tight text-zinc-100">Synaptic web</h2><p className="mt-1 text-[11px] text-zinc-500">A living map of your commitments.</p></div></div>
      <div className="flex items-center gap-3"><span className={`neural-state ${firing ? 'is-firing' : ''}`}><span />{firing ? 'Thinking' : 'At rest'}</span><div className="flex rounded-lg border border-white/10 p-0.5" role="group" aria-label="Memory view"><button aria-label="Synaptic web view" aria-pressed={view === 'brain'} className={`neural-view ${view === 'brain' ? 'is-selected' : ''}`} onClick={() => setView('brain')}><Brain size={14} /><span>Web</span></button><button aria-label="Task list view" aria-pressed={view === 'list'} className={`neural-view ${view === 'list' ? 'is-selected' : ''}`} onClick={() => setView('list')}><List size={14} /><span>List</span></button></div></div>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.04] px-5 py-3">
      <nav aria-label="Memory areas" className="flex flex-wrap items-center gap-2 text-xs"><button className="text-zinc-400 hover:text-white" onClick={() => navigate([])}>PerMan · Whole web</button>{group && <><span className="text-zinc-700">/</span><span className="text-[#d9c49b]">{group.name}</span><button aria-label="Back one memory area" className="map-control" onClick={() => navigate(path.slice(0, -1))}><ArrowLeft size={13} /></button></>}</nav>
      <div className="flex flex-wrap gap-4 text-[10px] text-zinc-400"><span className="flex items-center gap-1.5"><span className="neural-legend-light" />{firing} unfinished · lit</span><span className="flex items-center gap-1.5"><span className="neural-legend-rest" />{done} done · unlit</span>{resting > done && <span>{resting - done} cancelled · unlit</span>}</div>
    </div>
    {areas.length > 0 && <div className="flex flex-wrap gap-2 px-5 pt-4" aria-label="Explore life areas and projects">{areas.map(area => <button key={area.id} className="neural-area" onClick={() => navigate(group ? [...path, area.id] : [area.id])}>{area.name}<span>{area.tasks.filter(isNeuronLit).length}/{area.tasks.length}</span></button>)}</div>}
    {view === 'brain' && <div className="synaptic-settings"><label><input type="checkbox" checked={showNames} onChange={e => setShowNames(e.target.checked)} /> Task names</label><label><input type="checkbox" checked={motion} onChange={e => setMotion(e.target.checked)} /> Motion</label><span>Drag to rotate · Wheel or pinch to zoom</span></div>}
    {view === 'brain' ? <div className="neural-canvas-wrap">
      <div className="neural-caption"><span>ONE CONNECTED MEMORY</span><p>PerMan → Categories → Projects & subcategories → Tasks</p></div>
      <div ref={surface} className="memory-map-surface synaptic-viewport overflow-auto" tabIndex={0} aria-label="Interactive synaptic graph. Drag to rotate; use the mouse wheel, pinch gesture, or controls to zoom." onPointerDown={beginGesture} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onWheel={wheelZoom}>
        <svg className="neural-canvas" viewBox="0 0 1200 740" style={{ width: `${zoom * 100}%` }} role="group" aria-label="Interactive synaptic hierarchy rooted at PerMan. Unfinished task neurons glow; completed task neurons remain dark.">
          <defs>
            <radialGradient id={`${prefix}-ambient`}><stop stopColor="#23423c" stopOpacity=".26" /><stop offset="1" stopColor="#091012" stopOpacity="0" /></radialGradient>
            <linearGradient id={`${prefix}-tissue`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#17332f" stopOpacity=".15" /><stop offset="1" stopColor="#15242b" stopOpacity=".18" /></linearGradient>
            <filter id={`${prefix}-glow`} x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="3.5" /></filter>
          </defs>
          <ellipse cx="600" cy="370" rx="520" ry="345" fill={`url(#${prefix}-ambient)`} />
          {scene.nodes.map(node => {
            const point = rotatePoint(node.x, node.y);
            const radius = node.kind === 'core' ? 18 : node.kind === 'category' ? 12 : node.kind === 'group' ? 7.5 : 3.7;
            const activate = () => {
              if (Date.now() < ignoreClickUntil.current) return;
              if (node.task) open(node.task);
              else if (node.kind === 'core') navigate([]);
              else if (node.group) {
                const root = groups.find(g => g === node.group || g.children.includes(node.group!));
                if (root) navigate(node.kind === 'category' ? [root.id] : [root.id, node.group.id]);
              }
            };
            const emphasized = hovered === node.task?.id || selected === node.task?.id;
            return <g key={node.id} role="button" tabIndex={0} className="neuron-control" data-node-id={node.id} data-kind={node.kind} data-task-id={node.task?.id} data-status={node.task?.status} data-lit={node.lit} aria-label={`${node.name}, ${node.kind}, ${node.lit ? 'unfinished, glowing' : 'at rest, unlit'}`} onClick={activate} onMouseEnter={() => setHovered(node.task?.id || null)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(node.task?.id || null)} onBlur={() => setHovered(null)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); } }}>
              <title>{node.name} · {node.tasks.filter(isNeuronLit).length}/{node.tasks.length} unfinished</title>
              {node.lit && <circle className="neural-aura" cx={point.x} cy={point.y} r={radius * 3 + 7} fill={node.color} fillOpacity=".16" filter={`url(#${prefix}-glow)`} />}
              <circle className="neural-selection" cx={point.x} cy={point.y} r={radius + 9} fill="none" stroke={node.color} strokeDasharray="2 3" opacity={emphasized ? .9 : 0} />
              <circle className="neural-soma" cx={point.x} cy={point.y} r={radius} fill={node.lit ? node.color : '#172429'} stroke={node.lit ? node.color : '#506064'} strokeWidth="1" />
              {node.lit && <circle cx={point.x} cy={point.y} r={radius * .3} fill="#fff4d8" />}
              {(node.kind !== 'task' || showNames) && <text className={`synaptic-label synaptic-label-${node.kind}`} x={point.x} y={point.y + radius + 18} textAnchor="middle" fill={node.lit ? '#cbd3cd' : '#758480'}>{node.name.length > 27 ? `${node.name.slice(0, 25)}…` : node.name}{node.kind !== 'task' && <tspan x={point.x} dy="14" fill="#76847f" fontSize="9">{node.tasks.filter(isNeuronLit).length}/{node.tasks.length} unfinished</tspan>}</text>}
              <circle cx={point.x} cy={point.y} r={Math.max(16, radius + 8)} fill="transparent" />
            </g>;
          })}
          {!tasks.length && <text x="600" y="370" textAnchor="middle" fill="#85918f" fontSize="15">Capture a task to form your first connection.</text>}

        </svg>
      </div>
      <div className="neural-focus" aria-live="polite">{focusedTask ? <><span className={isNeuronLit(focusedTask) ? 'neural-legend-light' : 'neural-legend-rest'} /><span className="min-w-0 truncate text-zinc-200">{focusedTask.title}</span><span className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-500">{focusedTask.status}</span><button onClick={() => open(focusedTask)} className="ml-auto shrink-0 text-xs text-[#d9c49b]">View task →</button></> : <><Sparkles size={13} className="text-[#a28e69]" /><span>Select a neuron to read its memory.</span></>}</div>
    </div> : <div className="max-h-[550px] overflow-y-auto px-5 py-4"><p className="mb-4 text-xs text-zinc-500">{group?.name || 'All memories'} · {tasks.length} tasks</p>{!tasks.length && <p className="py-6 text-sm text-zinc-500">Capture a task to form your first connection.</p>}{pageTasks.map(task => <button key={task.id} className="neural-list-task" onClick={() => open(task)}><span className={isNeuronLit(task) ? 'neural-legend-light' : 'neural-legend-rest'} /><span className="min-w-0 flex-1 text-left"><span className="block break-words text-sm text-zinc-200">{task.title}</span><span className="mt-1 block text-[10px] text-zinc-500">{task.project?.name || task.subcategory?.name || task.category?.name || 'Personal'} · {task.status.toLowerCase()}</span></span>{task.status === 'DONE' && <Check size={13} className="shrink-0 text-zinc-600" />}</button>)}</div>}
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[.06] px-5 py-3">
      <p className="text-[10px] text-zinc-500">{tasks.length > NEURON_PAGE_SIZE ? `${currentPage * NEURON_PAGE_SIZE + 1}–${Math.min((currentPage + 1) * NEURON_PAGE_SIZE, tasks.length)} of ${tasks.length} memories` : `${tasks.length} memories connected`}<span className="mx-2 text-zinc-700">/</span>Done memories stay, their light rests.</p>
      <div className="flex items-center gap-1">{tasks.length > NEURON_PAGE_SIZE && <><button className="map-control" aria-label="Previous neurons" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>‹</button><button className="map-control" aria-label="Next neurons" disabled={(currentPage + 1) * NEURON_PAGE_SIZE >= tasks.length} onClick={() => setPage(currentPage + 1)}>›</button></>}{view === 'brain' && <><button className="map-control" aria-label="Rotate left" onClick={() => setRotation(value => value - 20)}><RotateCcw size={14} /></button><button className="map-control" aria-label="Rotate right" onClick={() => setRotation(value => value + 20)}><RotateCw size={14} /></button><button className="map-control" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => setZoom(value => clampZoom(value - .2))}><Minus size={14} /></button><span className="w-10 text-center text-[10px] text-zinc-400">{Math.round(zoom * 100)}%</span><button className="map-control" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => setZoom(value => clampZoom(value + .2))}><Plus size={14} /></button><button className="map-control" aria-label="Reset web view" onClick={resetView}><Focus size={14} /></button></>}</div>
    </footer>
  </section>;
}
