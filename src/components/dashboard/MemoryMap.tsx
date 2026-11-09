'use client';

import './neural-map.css';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Brain, Check, Focus, List, Minus, Plus, Sparkles } from 'lucide-react';
import type { Task } from '@/lib/types';
import type { MemoryGroup } from '@/lib/memory-map';
import { dendrites, isNeuronLit, layoutNeurons, neuralConnections, NEURON_PAGE_SIZE } from '@/lib/neural-layout';

const HEMISPHERE = 'M488 104 C458 61 397 54 357 76 C315 61 271 85 264 121 C220 128 191 162 199 204 C164 233 163 277 183 309 C153 346 172 394 195 410 C182 457 221 493 250 500 C258 547 302 558 333 548 C366 590 424 578 447 553 C472 540 487 507 487 468 Z';
const FOLDS = [
  'M354 91 C326 127 370 146 341 176 S291 212 314 245 S365 270 339 309 S286 350 312 386 S353 423 331 458 S317 511 351 540',
  'M447 104 C400 112 423 148 394 171 S356 198 379 228 S439 239 418 277 S364 301 385 341 S440 374 417 409 S372 441 394 471 S432 504 421 542',
  'M270 137 C286 160 253 188 270 217 S298 244 267 272 S230 315 253 340 S284 370 258 398 S238 446 272 467 S291 505 285 525',
  'M206 210 C235 202 240 175 264 174 M186 292 C213 272 233 283 249 265 M194 388 C215 375 231 388 250 375 M254 499 C283 484 298 497 316 481',
  'M485 194 C454 183 451 215 428 218 M486 332 C454 319 448 345 425 338 M480 461 C455 447 450 464 431 466',
];

export function MemoryMap({ groups, onSelectTask, onSelectGroup }: { groups: MemoryGroup[]; onSelectTask: (task: Task) => void; onSelectGroup?: (group: MemoryGroup | null) => void }) {
  const [path, setPath] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(0);
  const [view, setView] = useState<'brain' | 'list'>('brain');
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const surface = useRef<HTMLDivElement>(null);
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
  const neurons = useMemo(() => layoutNeurons(pageTasks), [pageTasks]);
  const connections = useMemo(() => neuralConnections(neurons), [neurons]);
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

  return <section className="neural-map memory-panel overflow-hidden" aria-label="Memory brain">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.06] px-5 py-4">
      <div className="flex items-center gap-3"><span className="neural-brand"><Brain size={20} strokeWidth={1.3} /></span><div><h2 className="text-sm font-medium tracking-tight text-zinc-100">Memory brain</h2><p className="mt-1 text-[11px] text-zinc-500">A living map of your commitments.</p></div></div>
      <div className="flex items-center gap-3"><span className={`neural-state ${firing ? 'is-firing' : ''}`}><span />{firing ? 'Thinking' : 'At rest'}</span><div className="flex rounded-lg border border-white/10 p-0.5" role="group" aria-label="Memory view"><button aria-label="Brain view" aria-pressed={view === 'brain'} className={`neural-view ${view === 'brain' ? 'is-selected' : ''}`} onClick={() => setView('brain')}><Brain size={14} /><span>Brain</span></button><button aria-label="Task list view" aria-pressed={view === 'list'} className={`neural-view ${view === 'list' ? 'is-selected' : ''}`} onClick={() => setView('list')}><List size={14} /><span>List</span></button></div></div>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.04] px-5 py-3">
      <nav aria-label="Memory areas" className="flex flex-wrap items-center gap-2 text-xs"><button className="text-zinc-400 hover:text-white" onClick={() => navigate([])}>Whole brain</button>{group && <><span className="text-zinc-700">/</span><span className="text-[#d9c49b]">{group.name}</span><button aria-label="Back one memory area" className="map-control" onClick={() => navigate(path.slice(0, -1))}><ArrowLeft size={13} /></button></>}</nav>
      <div className="flex flex-wrap gap-4 text-[10px] text-zinc-400"><span className="flex items-center gap-1.5"><span className="neural-legend-light" />{firing} unfinished · lit</span><span className="flex items-center gap-1.5"><span className="neural-legend-rest" />{done} done · unlit</span>{resting > done && <span>{resting - done} cancelled · unlit</span>}</div>
    </div>
    {areas.length > 0 && <div className="flex flex-wrap gap-2 px-5 pt-4" aria-label="Explore life areas and projects">{areas.map(area => <button key={area.id} className="neural-area" onClick={() => navigate(group ? [...path, area.id] : [area.id])}>{area.name}<span>{area.tasks.filter(isNeuronLit).length}/{area.tasks.length}</span></button>)}</div>}
    {view === 'brain' ? <div className="neural-canvas-wrap">
      <div className="neural-caption"><span>YOUR NEURAL LANDSCAPE</span><p>Every task leaves a connection.</p></div>
      <div ref={surface} className="memory-map-surface overflow-auto" tabIndex={0} aria-label="Brain graph; use zoom controls or switch to task list for larger task buttons">
        <svg className="neural-canvas" viewBox="0 0 1000 690" style={{ width: `${zoom * 100}%`, minWidth: `${zoom * 100}%` }} role="group" aria-label="Interactive brain. Unfinished task neurons glow; completed task neurons remain dark.">
          <defs>
            <radialGradient id={`${prefix}-ambient`}><stop stopColor="#23423c" stopOpacity=".26" /><stop offset="1" stopColor="#091012" stopOpacity="0" /></radialGradient>
            <linearGradient id={`${prefix}-tissue`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#17332f" stopOpacity=".15" /><stop offset="1" stopColor="#15242b" stopOpacity=".18" /></linearGradient>
            <filter id={`${prefix}-glow`} x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="3.5" /></filter>
          </defs>
          <ellipse cx="500" cy="330" rx="420" ry="310" fill={`url(#${prefix}-ambient)`} />
          <g aria-hidden="true" className="neural-anatomy">
            <path d={HEMISPHERE} fill={`url(#${prefix}-tissue)`} stroke="#749c91" strokeOpacity=".3" strokeWidth="1.1" />
            <path d={HEMISPHERE} transform="translate(1000 0) scale(-1 1)" fill={`url(#${prefix}-tissue)`} stroke="#749c91" strokeOpacity=".3" strokeWidth="1.1" />
            {FOLDS.map((fold, index) => <g key={index}><path d={fold} /><path d={fold} transform="translate(1000 0) scale(-1 1)" /></g>)}
            <path d="M493 115 C487 235 498 285 492 385 S491 489 475 537 M507 115 C513 235 502 285 508 385 S509 489 525 537" strokeOpacity=".24" />
            <path d="M452 555 C459 591 469 604 477 634 Q500 649 523 634 C531 604 541 591 548 555 M477 585 Q500 598 523 585 M482 612 Q500 621 518 612" strokeOpacity=".18" />
            <path d="M174 145 H135 V203 M826 145 H865 V203 M178 493 H135 V435 M822 493 H865 V435" strokeOpacity=".2" strokeWidth=".7" />
            <text x="125" y="125" className="neural-annotation">LEFT HEMISPHERE</text><text x="875" y="125" textAnchor="end" className="neural-annotation">RIGHT HEMISPHERE</text>
          </g>
          <g aria-hidden="true">{connections.map(edge => <g key={`${edge.from.task.id}:${edge.to.task.id}`} data-lit={edge.lit}><path d={edge.path} fill="none" stroke={edge.lit ? edge.from.color : '#344548'} strokeWidth={edge.lit ? '.9' : '.6'} strokeOpacity={edge.lit ? '.28' : '.34'} />{edge.lit && <path className="neural-impulse" d={edge.path} fill="none" stroke={edge.from.color} strokeWidth="1.2" strokeDasharray="2 48" style={{ animationDelay: `${-(edge.from.seed % 70) / 10}s` }} />}</g>)}</g>
          {neurons.map(node => {
            const isSelected = selected === node.task.id;
            const isHovered = hovered === node.task.id;
            const status = node.lit ? 'unfinished, glowing' : node.task.status === 'DONE' ? 'completed, unlit' : 'cancelled, unlit';
            return <g key={node.task.id} role="button" tabIndex={0} className="neuron-control" data-task-id={node.task.id} data-status={node.task.status} data-lit={node.lit} aria-label={`${node.task.title}, ${status}`} onClick={() => open(node.task)} onMouseEnter={() => setHovered(node.task.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(node.task.id)} onBlur={() => setHovered(null)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(node.task); } }}>
              <title>{node.task.title} — {node.task.status.toLowerCase()} · {node.lit ? 'lit' : 'unlit'}</title>
              {node.lit && <circle className="neural-aura" cx={node.x} cy={node.y} r="17" fill={node.color} fillOpacity=".14" filter={`url(#${prefix}-glow)`} style={{ animationDelay: `${-(node.seed % 40) / 10}s` }} />}
              <g aria-hidden="true" className={node.lit ? 'neural-dendrites is-lit' : 'neural-dendrites'} stroke={node.lit ? node.color : '#35484b'} strokeOpacity={node.lit ? '.65' : '.65'} strokeWidth={node.lit ? '.9' : '.8'} fill="none">{dendrites(node).map((branch, index) => <path key={index} d={branch} />)}</g>
              <circle className="neural-selection" cx={node.x} cy={node.y} r="12" fill="none" stroke={node.lit ? node.color : '#778386'} strokeWidth="1" strokeDasharray="2 3" opacity={isSelected || isHovered ? .9 : 0} />
              {node.lit && <circle cx={node.x} cy={node.y} r="6" fill={node.color} opacity=".5" filter={`url(#${prefix}-glow)`} />}
              <path className="neural-soma" d={`M${node.x - 4.5},${node.y + 1} Q${node.x - 3},${node.y - 5} ${node.x + 1},${node.y - 3.5} Q${node.x + 6},${node.y - 1} ${node.x + 3.5},${node.y + 3} Q${node.x - 1},${node.y + 6} ${node.x - 4.5},${node.y + 1}`} fill={node.lit ? node.color : '#172429'} stroke={node.lit ? '#ffe6b6' : '#506064'} strokeWidth=".7" />
              {node.lit && <circle cx={node.x} cy={node.y} r="1.5" fill="#fff4d8" />}
              <circle cx={node.x} cy={node.y} r="15" fill="transparent" />
            </g>;
          })}
          {!tasks.length && <text x="500" y="332" textAnchor="middle" fill="#85918f" fontSize="15">Capture a task to form your first connection.</text>}
          <g aria-hidden="true"><path d="M395 661 H455 M545 661 H605" stroke="#4d6661" strokeWidth=".6" /><text x="500" y="664" textAnchor="middle" className="neural-annotation">{firing ? 'SIGNALS IN MOTION' : 'A QUIET MIND'}</text></g>
        </svg>
      </div>
      <div className="neural-focus" aria-live="polite">{focusedTask ? <><span className={isNeuronLit(focusedTask) ? 'neural-legend-light' : 'neural-legend-rest'} /><span className="min-w-0 truncate text-zinc-200">{focusedTask.title}</span><span className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-500">{focusedTask.status}</span><button onClick={() => open(focusedTask)} className="ml-auto shrink-0 text-xs text-[#d9c49b]">View task →</button></> : <><Sparkles size={13} className="text-[#a28e69]" /><span>Select a neuron to read its memory.</span></>}</div>
    </div> : <div className="max-h-[550px] overflow-y-auto px-5 py-4"><p className="mb-4 text-xs text-zinc-500">{group?.name || 'All memories'} · {tasks.length} tasks</p>{!tasks.length && <p className="py-6 text-sm text-zinc-500">Capture a task to form your first connection.</p>}{pageTasks.map(task => <button key={task.id} className="neural-list-task" onClick={() => open(task)}><span className={isNeuronLit(task) ? 'neural-legend-light' : 'neural-legend-rest'} /><span className="min-w-0 flex-1 text-left"><span className="block break-words text-sm text-zinc-200">{task.title}</span><span className="mt-1 block text-[10px] text-zinc-500">{task.project?.name || task.subcategory?.name || task.category?.name || 'Personal'} · {task.status.toLowerCase()}</span></span>{task.status === 'DONE' && <Check size={13} className="shrink-0 text-zinc-600" />}</button>)}</div>}
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[.06] px-5 py-3">
      <p className="text-[10px] text-zinc-500">{tasks.length > NEURON_PAGE_SIZE ? `${currentPage * NEURON_PAGE_SIZE + 1}–${Math.min((currentPage + 1) * NEURON_PAGE_SIZE, tasks.length)} of ${tasks.length} memories` : `${tasks.length} memories connected`}<span className="mx-2 text-zinc-700">/</span>Done memories stay, their light rests.</p>
      <div className="flex items-center gap-1">{tasks.length > NEURON_PAGE_SIZE && <><button className="map-control" aria-label="Previous neurons" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>‹</button><button className="map-control" aria-label="Next neurons" disabled={(currentPage + 1) * NEURON_PAGE_SIZE >= tasks.length} onClick={() => setPage(currentPage + 1)}>›</button></>}{view === 'brain' && <><button className="map-control" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .25))}><Minus size={14} /></button><span className="w-10 text-center text-[10px] text-zinc-400">{Math.round(zoom * 100)}%</span><button className="map-control" aria-label="Zoom in" disabled={zoom >= 2.5} onClick={() => setZoom(value => Math.min(2.5, value + .25))}><Plus size={14} /></button><button className="map-control" aria-label="Reset brain view" onClick={() => { setZoom(1); navigate([]); }}><Focus size={14} /></button></>}</div>
    </footer>
  </section>;
}
