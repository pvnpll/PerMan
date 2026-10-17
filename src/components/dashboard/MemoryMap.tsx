'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Focus,
  Minus,
  Plus,
  Network,
  Circle,
  Orbit,
  LayoutGrid,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Clock,
  Layers,
  Folder,
} from 'lucide-react';
import type { Task } from '@/lib/types';
import type { MemoryGroup } from '@/lib/memory-map';

const categoryColorPalette = [
  '#818cf8', // Indigo
  '#34d399', // Emerald
  '#f472b6', // Pink
  '#38bdf8', // Sky
  '#fbbf24', // Amber
  '#a78bfa', // Purple
  '#fb923c', // Orange
  '#4ade80', // Green
  '#2dd4bf', // Teal
  '#f87171', // Rose
];

export function MemoryMap({
  groups,
  onSelectTask,
  onSelectGroup,
}: {
  groups: MemoryGroup[];
  onSelectTask: (task: Task) => void;
  onSelectGroup?: (group: MemoryGroup | null) => void;
}) {
  const [path, setPath] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<'constellation' | 'grid'>('constellation');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const graphView = path.join('/');

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const center = () => {
      surface.scrollLeft = Math.max(0, (surface.scrollWidth - surface.clientWidth) / 2);
    };
    const observer = new ResizeObserver(center);
    observer.observe(surface);
    center();
    return () => observer.disconnect();
  }, [zoom, graphView, groups.length, viewMode]);

  // Resolve current active drill-down group
  let current: MemoryGroup | undefined;
  let level = groups;
  for (const id of path) {
    current = level.find((g) => g.id === id);
    if (!current) break;
    level = current.children;
  }
  const currentPathValid = path.length === 0 || !!current;
  const group = currentPathValid ? current : undefined;

  useEffect(() => {
    onSelectGroup?.(group || null);
  }, [group, onSelectGroup]);

  // Child nodes resolution
  const childTaskIds = new Set(group?.children.flatMap((c) => c.tasks.map((t) => t.id)));
  const nodes = group
    ? [
        ...group.children.map((c, idx) => ({
          id: c.id,
          name: c.name,
          count: c.tasks.length,
          group: c,
          task: undefined as Task | undefined,
          color: categoryColorPalette[idx % categoryColorPalette.length],
        })),
        ...group.tasks
          .filter((t) => !childTaskIds.has(t.id))
          .map((t, idx) => ({
            id: t.id,
            name: t.title,
            count: 0,
            group: undefined,
            task: t,
            color: categoryColorPalette[(group.children.length + idx) % categoryColorPalette.length],
          })),
      ]
    : groups.map((g, i) => ({
        id: g.id,
        name: g.name,
        count: g.tasks.length,
        group: g,
        task: undefined as Task | undefined,
        color: categoryColorPalette[i % categoryColorPalette.length],
      }));

  const PAGE_SIZE = 12;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(nodes.length / PAGE_SIZE) - 1));
  const visible = nodes.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const center = { x: 480, y: 270 };
  const totalActiveTasks = groups.reduce((acc, g) => acc + g.tasks.length, 0);

  const handleNodeClick = (node: (typeof nodes)[0]) => {
    if (node.task) {
      onSelectTask(node.task);
    } else {
      setPath(group ? [...path, node.id] : [node.id]);
      setPage(0);
      setHoveredNodeId(null);
    }
  };

  return (
    <section className="memory-panel overflow-hidden border border-white/[.08] rounded-xl bg-[#0c0e12] shadow-2xl relative">
      {/* Graph Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] px-5 py-3.5 bg-[#111318]/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Network size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-100 tracking-tight">Memory Map</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block">
              {groups.length} life areas · {totalActiveTasks} commitments mapped
            </p>
          </div>
        </div>

        {/* View Mode & Legend */}
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-zinc-400 border-r border-white/[.07] pr-3 mr-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]" /> Life areas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" /> Projects & tasks
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-[#171923] p-0.5 rounded-lg border border-white/[.08]">
            <button
              type="button"
              onClick={() => setViewMode('constellation')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition ${
                viewMode === 'constellation'
                  ? 'bg-white/[.12] text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Constellation orbital view"
            >
              <Orbit size={13} />
              <span className="hidden sm:inline">Constellation</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition ${
                viewMode === 'grid'
                  ? 'bg-white/[.12] text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Cluster matrix card view"
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Clusters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="flex min-h-11 items-center justify-between gap-3 px-5 py-2 bg-[#0e1015] border-b border-white/[.04]">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => {
              setPath([]);
              setZoom(1);
              setPage(0);
            }}
            className={`transition font-medium ${
              path.length === 0 ? 'text-zinc-200' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Life Areas
          </button>
          {group && (
            <>
              <span className="text-zinc-600">/</span>
              <span className="text-indigo-300 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                {group.name}
              </span>
            </>
          )}
        </div>

        {path.length > 0 && (
          <button
            onClick={() => {
              setPath((p) => p.slice(0, -1));
              setPage(0);
            }}
            className="flex items-center gap-1 text-xs font-medium text-zinc-300 hover:text-white px-2.5 py-1 rounded-md bg-white/[.04] hover:bg-white/[.08] transition"
          >
            <ArrowLeft size={13} /> Back to Overview
          </button>
        )}
      </div>

      {/* Mode 1: Constellation Orbital Graph */}
      {viewMode === 'constellation' ? (
        nodes.length === 0 ? (
          <div className="flex h-[450px] flex-col items-center justify-center gap-3 px-6 text-center">
            <Network className="text-zinc-600 animate-pulse" size={42} strokeWidth={1} />
            <h3 className="text-sm font-medium text-zinc-200">No subcategories or tasks yet</h3>
            <p className="max-w-xs text-xs leading-6 text-zinc-500">
              Add your first task in this category to visualize its neural connections.
            </p>
          </div>
        ) : (
          <div ref={surfaceRef} className="memory-map-surface overflow-auto relative select-none">
            <svg
              viewBox="0 0 960 540"
              style={{
                width: `${zoom * 100}%`,
                minWidth: 700,
                height: 'auto',
                minHeight: 440,
              }}
              aria-label="Interactive memory constellation map. Select a life area or project to explore."
            >
              <defs>
                {/* Radial ambient cosmic glow */}
                <radialGradient id="space-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.14" />
                  <stop offset="40%" stopColor="#4f46e5" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#0c0e12" stopOpacity="0" />
                </radialGradient>

                {/* Subtle starry grid */}
                <pattern id="memory-stars" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="0.75" fill="#ffffff" opacity="0.07" />
                </pattern>

                {/* Glow filter */}
                <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background Backdrop */}
              <rect width="960" height="540" fill="#0c0e12" />
              <rect width="960" height="540" fill="url(#memory-stars)" />
              <rect width="960" height="540" fill="url(#space-glow)" />

              {/* Concentric Orbit Rings */}
              <circle
                cx={center.x}
                cy={center.y}
                r="305"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.03"
                strokeDasharray="4 8"
              />
              <circle
                cx={center.x}
                cy={center.y}
                r="195"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.04"
                strokeDasharray="2 6"
              />
              <circle
                cx={center.x}
                cy={center.y}
                r="95"
                fill="none"
                stroke="#818cf8"
                strokeOpacity="0.12"
              />

              {/* Connection Beams */}
              {visible.map((node, i) => {
                const angle = (i / visible.length) * Math.PI * 2 - Math.PI / 2;
                const rx = 340;
                const ry = 205;
                const x = center.x + Math.cos(angle) * rx;
                const y = center.y + Math.sin(angle) * ry;
                const color = node.color || categoryColorPalette[i % categoryColorPalette.length];
                const isHovered = hoveredNodeId === node.id;

                const cpx = center.x + (x - center.x) * 0.35;
                const cpy = center.y + (y - center.y) * 0.35;

                return (
                  <g key={`beam-${node.id}`}>
                    {/* Beam background glow */}
                    <path
                      d={`M ${center.x} ${center.y} Q ${cpx} ${cpy} ${x} ${y}`}
                      stroke={color}
                      strokeOpacity={isHovered ? 0.7 : node.count > 0 ? 0.35 : 0.1}
                      strokeWidth={isHovered ? 2.5 : node.count > 0 ? 1.5 : 0.75}
                      strokeDasharray={node.count > 0 ? '4 4' : 'none'}
                      fill="none"
                      className="transition-all duration-300"
                    />
                  </g>
                );
              })}

              {/* Orbiting Category / Task Nodes */}
              {visible.map((node, i) => {
                const angle = (i / visible.length) * Math.PI * 2 - Math.PI / 2;
                const rx = 340;
                const ry = 205;
                const x = center.x + Math.cos(angle) * rx;
                const y = center.y + Math.sin(angle) * ry;
                const color = node.color || categoryColorPalette[i % categoryColorPalette.length];
                const isHovered = hoveredNodeId === node.id;
                const hasTasks = node.count > 0;

                return (
                  <g
                    key={node.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.name}${hasTasks ? `, ${node.count} tasks, explore` : ', view'}`}
                    onClick={() => handleNodeClick(node)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNodeClick(node);
                      }
                    }}
                    className="cursor-pointer group"
                    style={{ outline: 'none' }}
                  >
                    {/* Outer Ambient Aura */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 40 : hasTasks ? 32 : 26}
                      fill={color}
                      fillOpacity={isHovered ? 0.2 : hasTasks ? 0.08 : 0.03}
                      stroke={color}
                      strokeOpacity={isHovered ? 0.8 : hasTasks ? 0.35 : 0.12}
                      strokeWidth={isHovered ? 2 : 1}
                      className="transition-all duration-300"
                    />

                    {/* Core Disk */}
                    <circle
                      cx={x}
                      cy={y}
                      r={hasTasks ? 20 : 16}
                      fill="#111318"
                      stroke={color}
                      strokeOpacity={isHovered ? 1 : hasTasks ? 0.75 : 0.3}
                      strokeWidth={hasTasks ? 1.5 : 1}
                      className="transition-all duration-300 shadow-md"
                    />

                    {/* Node Core Glyph or Count */}
                    {node.task ? (
                      node.task.status === 'DONE' ? (
                        <path
                          d={`M ${x - 5} ${y} l 4 4 l 7 -8`}
                          stroke="#34d399"
                          fill="none"
                          strokeWidth="2"
                        />
                      ) : (
                        <circle cx={x} cy={y} r="5" fill={color} />
                      )
                    ) : hasTasks ? (
                      <text
                        x={x}
                        y={y + 4.5}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="700"
                        fontFamily="inherit"
                      >
                        {node.count}
                      </text>
                    ) : (
                      <circle cx={x} cy={y} r="3" fill={color} fillOpacity="0.5" />
                    )}

                    {/* Node Label Pill Background */}
                    <rect
                      x={x - Math.min(node.name.length * 3.6 + 12, 85)}
                      y={y + (hasTasks ? 28 : 22)}
                      width={Math.min(node.name.length * 7.2 + 24, 170)}
                      height="20"
                      rx="10"
                      fill="#111318"
                      fillOpacity="0.9"
                      stroke={isHovered ? color : '#ffffff'}
                      strokeOpacity={isHovered ? 0.6 : 0.1}
                      strokeWidth="1"
                      className="transition-all duration-200"
                    />

                    {/* Node Label Text */}
                    <text
                      x={x}
                      y={y + (hasTasks ? 42 : 36)}
                      textAnchor="middle"
                      fill={isHovered ? '#ffffff' : hasTasks ? '#f4f4f5' : '#a1a1aa'}
                      fontSize="10.5"
                      fontWeight={hasTasks ? '600' : '400'}
                      fontFamily="inherit"
                    >
                      {node.name.length > 20 ? node.name.slice(0, 18) + '…' : node.name}
                    </text>

                    {/* Subtitle Status */}
                    <text
                      x={x}
                      y={y + (hasTasks ? 58 : 52)}
                      textAnchor="middle"
                      fill={hasTasks ? color : '#71717a'}
                      fontSize="9"
                      fontWeight="500"
                      fontFamily="inherit"
                    >
                      {node.task
                        ? node.task.status.replaceAll('_', ' ')
                        : hasTasks
                        ? `${node.count} task${node.count === 1 ? '' : 's'} · explore`
                        : '0 tasks'}
                    </text>
                  </g>
                );
              })}

              {/* Center Core Node (Memory Core / Selected Category) */}
              <g className="cursor-default select-none">
                {/* Center Ambient Waves */}
                <circle
                  cx={center.x}
                  cy={center.y}
                  r="62"
                  fill="#6366f1"
                  fillOpacity="0.04"
                  stroke="#818cf8"
                  strokeOpacity="0.1"
                  strokeWidth="1"
                />
                <circle
                  cx={center.x}
                  cy={center.y}
                  r="48"
                  fill="#6366f1"
                  fillOpacity="0.09"
                  stroke="#818cf8"
                  strokeOpacity="0.3"
                  strokeWidth="1.5"
                />

                {/* Center Core Solid Disc */}
                <circle
                  cx={center.x}
                  cy={center.y}
                  r="34"
                  fill="#111318"
                  stroke="#818cf8"
                  strokeOpacity="0.8"
                  strokeWidth="2"
                  className="shadow-xl"
                />

                {/* Center Icon / Glyph */}
                <text
                  x={center.x}
                  y={center.y + 6}
                  textAnchor="middle"
                  fill="#c7d2fe"
                  fontSize="17"
                  fontWeight="bold"
                >
                  {group ? '✦' : 'M'}
                </text>

                {/* Center Core Badge */}
                <rect
                  x={center.x - 70}
                  y={center.y + 44}
                  width="140"
                  height="22"
                  rx="11"
                  fill="#111318"
                  fillOpacity="0.95"
                  stroke="#818cf8"
                  strokeOpacity="0.4"
                  strokeWidth="1"
                />
                <text
                  x={center.x}
                  y={center.y + 59}
                  textAnchor="middle"
                  fill="#fafafa"
                  fontSize="11"
                  fontWeight="600"
                >
                  {group ? (group.name.length > 18 ? group.name.slice(0, 16) + '…' : group.name) : 'Memory Core'}
                </text>
              </g>
            </svg>
          </div>
        )
      ) : (
        /* Mode 2: Interactive Cluster Grid Matrix */
        <div className="p-5 max-h-[520px] overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {groups.map((g, i) => {
              const color = categoryColorPalette[i % categoryColorPalette.length];
              const taskCount = g.tasks.length;
              const subCount = g.children.length;
              const isSelected = group?.id === g.id;

              return (
                <div
                  key={g.id}
                  onClick={() => {
                    setPath([g.id]);
                    setPage(0);
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-950/20 border-indigo-500/40 shadow-lg'
                      : 'bg-[#111318] border-white/[.07] hover:border-white/20 hover:bg-white/[.03]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        <h4 className="text-sm font-semibold text-zinc-100 tracking-tight">{g.name}</h4>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          taskCount > 0
                            ? 'bg-white/[.08] text-zinc-100 border border-white/10'
                            : 'bg-transparent text-zinc-600'
                        }`}
                      >
                        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>

                    {/* Subcategories preview */}
                    {subCount > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 mb-3">
                        {g.children.slice(0, 4).map((sub) => (
                          <span
                            key={sub.id}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-[#0c0e12] border border-white/[.05] text-zinc-400"
                          >
                            {sub.name} ({sub.tasks.length})
                          </span>
                        ))}
                        {subCount > 4 && (
                          <span className="text-[10px] px-1.5 py-0.5 text-zinc-500 font-medium">
                            +{subCount - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Top Tasks preview */}
                    {taskCount > 0 ? (
                      <div className="space-y-1.5 mt-2">
                        {g.tasks.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTask(t);
                            }}
                            className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white truncate p-1 rounded hover:bg-white/[.05] transition"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0" />
                            <span className="truncate">{t.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-600 mt-2 italic">No active commitments in this area.</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[.05] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Folder size={12} /> {subCount} subcategories
                    </span>
                    <span className="text-indigo-400 font-medium flex items-center gap-1 hover:underline">
                      Explore Area <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Graph Footer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] px-5 py-3 bg-[#111318]/90">
        <span className="flex items-center gap-2 text-[11px] text-zinc-400">
          <ArrowUpRight size={13} className="text-zinc-500" />
          {nodes.length > PAGE_SIZE
            ? `${currentPage * PAGE_SIZE + 1}–${Math.min(
                (currentPage + 1) * PAGE_SIZE,
                nodes.length
              )} of ${nodes.length} connections`
            : 'Select any node to explore · Filter commitments below'}
        </span>

        {viewMode === 'constellation' && (
          <div className="flex items-center gap-1">
            {nodes.length > PAGE_SIZE && (
              <>
                <button
                  className="map-control"
                  aria-label="Previous connections"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  ‹
                </button>
                <button
                  className="map-control mr-2"
                  aria-label="Next connections"
                  disabled={(currentPage + 1) * PAGE_SIZE >= nodes.length}
                  onClick={() => setPage(currentPage + 1)}
                >
                  ›
                </button>
              </>
            )}
            <button
              className="map-control"
              aria-label="Zoom out"
              disabled={zoom <= 0.75}
              onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
            >
              <Minus size={14} />
            </button>
            <span className="w-10 text-center text-[10px] text-zinc-400 font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="map-control"
              aria-label="Zoom in"
              disabled={zoom >= 2}
              onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
            >
              <Plus size={14} />
            </button>
            <button
              className="map-control ml-2"
              aria-label="Reset map"
              onClick={() => {
                setZoom(1);
                setPath([]);
                setPage(0);
              }}
              title="Reset view"
            >
              <Focus size={14} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
