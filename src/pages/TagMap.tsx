import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";

import { Loading, PageHeader } from "../components/GameUI";
import LevelBadge from "../components/LevelBadge";
import SpeakButton from "../components/SpeakButton";
import { useWordProgress, wordStatus } from "../lib/progress";
import {
  GROUP_INFO,
  LEVELS,
  TAG_GROUP,
  prettyTag,
  type TagGroup,
} from "../lib/tags";
import { useVocabulary, withArticle, type Word } from "../lib/vocab";

// ── DANE GRAFU ───────────────────────────────────────────────────────────

type TagNode = {
  id: string;
  group: TagGroup;
  count: number;
  r: number;
  words: Word[];
};

type TagLink = { source: string; target: string; weight: number };

type Point = { x: number; y: number };
type View = { x: number; y: number; k: number };

const MIN_K = 0.25;
const MAX_K = 4;
const LEVEL_ORDER = { A1: 0, A2: 1, B1: 2, B2: 3 } as const;

// promień rośnie z pierwiastkiem liczby słów - pole koła ~ liczba słów
const radiusFor = (count: number) => 6 + Math.sqrt(count) * 2.4;

function buildGraph(words: Word[]) {
  const byTag = new Map<string, Word[]>();
  const pairs = new Map<string, number>();

  for (const w of words) {
    for (const t of w.tags) byTag.set(t, [...(byTag.get(t) ?? []), w]);
    // każda para tagów tego samego słowa to krawędź
    const tags = [...w.tags].sort();
    for (let i = 0; i < tags.length; i++)
      for (let j = i + 1; j < tags.length; j++) {
        const key = `${tags[i]}|${tags[j]}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
  }

  const nodes: TagNode[] = [...byTag.entries()].map(([id, ws]) => ({
    id,
    group: TAG_GROUP[id] ?? "topic",
    count: ws.length,
    r: radiusFor(ws.length),
    words: ws,
  }));

  const links: TagLink[] = [...pairs.entries()].map(([key, weight]) => {
    const [source, target] = key.split("|");
    return { source, target, weight };
  });

  return { nodes, links };
}

type SimNode = SimulationNodeDatum & { id: string; r: number };
type SimLink = SimulationLinkDatum<SimNode> & { weight: number };

// układ siłowy liczony raz - powiązane tagi przyciągają się, wszystkie się odpychają
function computeLayout(nodes: TagNode[], links: TagLink[]) {
  const simNodes: SimNode[] = nodes.map((n) => ({ id: n.id, r: n.r }));
  const count = new Map(nodes.map((n) => [n.id, n.count]));

  // siła powiązania względem wielkości obu tagów (podobieństwo kosinusowe),
  // żeby ogólne tagi typu "description" nie ściągały wszystkiego do środka
  const assoc = (l: TagLink) =>
    l.weight /
    Math.sqrt((count.get(l.source) ?? 1) * (count.get(l.target) ?? 1));

  // do układu bierzemy tylko 3 najsilniejsze powiązania każdego tagu
  const strongest = new Set<TagLink>();
  for (const n of nodes) {
    links
      .filter((l) => l.weight >= 2 && (l.source === n.id || l.target === n.id))
      .sort((a, b) => assoc(b) - assoc(a))
      .slice(0, 3)
      .forEach((l) => strongest.add(l));
  }
  const simLinks: SimLink[] = [...strongest].map((l) => ({
    source: l.source,
    target: l.target,
    weight: assoc(l),
  }));
  const maxA = Math.max(...simLinks.map((l) => l.weight), 0.01);

  const sim = forceSimulation(simNodes)
    .force(
      "link",
      forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance((l) => 70 + 110 * (1 - l.weight / maxA))
        .strength((l) => 0.25 + 0.6 * (l.weight / maxA)),
    )
    .force(
      "charge",
      forceManyBody<SimNode>()
        .strength((d) => -320 - d.r * 10)
        .distanceMax(900),
    )
    .force("collide", forceCollide<SimNode>((d) => d.r + 30).strength(1))
    .force("x", forceX(0).strength(0.015))
    .force("y", forceY(0).strength(0.015))
    .stop();

  for (let i = 0; i < 500; i++) sim.tick();

  const out: Record<string, Point> = {};
  for (const n of simNodes) out[n.id] = { x: n.x ?? 0, y: n.y ?? 0 };
  return out;
}

function fitView(
  nodes: TagNode[],
  pos: Record<string, Point>,
  w: number,
  h: number,
): View {
  if (!nodes.length || !w || !h) return { x: w / 2, y: h / 2, k: 1 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of nodes) {
    const p = pos[n.id];
    minX = Math.min(minX, p.x - n.r);
    maxX = Math.max(maxX, p.x + n.r);
    minY = Math.min(minY, p.y - n.r);
    maxY = Math.max(maxY, p.y + n.r + 18);
  }
  const pad = 32;
  const k = Math.min(
    MAX_K,
    Math.max(
      MIN_K,
      Math.min((w - pad) / (maxX - minX), (h - pad) / (maxY - minY)),
    ),
  );
  return {
    k,
    x: w / 2 - ((minX + maxX) / 2) * k,
    y: h / 2 - ((minY + maxY) / 2) * k,
  };
}

function zoomAt(v: View, factor: number, cx: number, cy: number): View {
  const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
  const f = k / v.k;
  return { k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f };
}

// ── KSZTAŁT WĘZŁA (drugi sposób rozróżnienia grup obok koloru) ──────────

function NodeShape({
  group,
  r,
  selected,
}: {
  group: TagGroup;
  r: number;
  selected: boolean;
}) {
  const common = {
    fill: GROUP_INFO[group].color,
    fillOpacity: 0.88,
    stroke: selected ? "var(--text-h)" : "var(--surface)",
    strokeWidth: selected ? 3 : 2,
    vectorEffect: "non-scaling-stroke" as const,
  };
  if (group === "usage") {
    const s = r * 1.65;
    return (
      <rect
        x={-s / 2}
        y={-s / 2}
        width={s}
        height={s}
        rx={r * 0.35}
        {...common}
      />
    );
  }
  return (
    <>
      <circle r={r} {...common} />
      {group === "meaning" && (
        <circle
          r={r * 0.62}
          fill="none"
          stroke="var(--surface)"
          strokeWidth={2}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
          opacity={0.9}
        />
      )}
    </>
  );
}

function LegendSwatch({ group }: { group: TagGroup }) {
  return (
    <svg
      viewBox="-12 -12 24 24"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <NodeShape group={group} r={9} selected={false} />
    </svg>
  );
}

// ── STRONA ───────────────────────────────────────────────────────────────

function TagMap() {
  const { words, loading, error } = useVocabulary();
  const progress = useWordProgress();

  const graph = useMemo(() => buildGraph(words), [words]);
  const layout = useMemo(
    () => computeLayout(graph.nodes, graph.links),
    [graph],
  );

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
  const [moved, setMoved] = useState<Record<string, Point>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  // ile linii do najbliższych powiązanych tagów pokazujemy przy każdym węźle
  const [perNode, setPerNode] = useState(1);
  const [hidden, setHidden] = useState<TagGroup[]>([]);
  const [showAllWords, setShowAllWords] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const drag = useRef<
    | { type: "pan"; start: Point; view: View; moved: boolean }
    | { type: "node"; id: string; start: Point; origin: Point; moved: boolean }
    | { type: "pinch"; dist: number; view: View; mid: Point }
    | null
  >(null);

  // rozmiar kontenera (mapa skaluje się do szerokości ekranu)
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  // szkielet mapy: każdy tag łączy się tylko z najbliższymi (na mapie) powiązanymi tagami
  const backbone = useMemo(() => {
    const adj = new Map<string, TagLink[]>();
    for (const l of graph.links) {
      if (l.weight < 2) continue;
      adj.set(l.source, [...(adj.get(l.source) ?? []), l]);
      adj.set(l.target, [...(adj.get(l.target) ?? []), l]);
    }
    const keep = new Set<TagLink>();
    for (const [id, ls] of adj) {
      const p = layout[id];
      const dist = (l: TagLink) => {
        const o = layout[l.source === id ? l.target : l.source];
        return Math.hypot(o.x - p.x, o.y - p.y);
      };
      [...ls]
        .sort((a, b) => dist(a) - dist(b))
        .slice(0, perNode)
        .forEach((l) => keep.add(l));
    }
    return [...keep];
  }, [graph, layout, perNode]);

  const pos = (id: string) => moved[id] ?? layout[id];
  const visibleNodes = graph.nodes.filter((n) => !hidden.includes(n.group));
  const fit = fitView(visibleNodes, layout, size.w, size.h);
  const v = view ?? fit;

  // przybliżanie kółkiem myszy w miejscu kursora (listener nie-pasywny)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0015);
      setView((prev) =>
        zoomAt(
          prev ?? fit,
          factor,
          e.clientX - rect.left,
          e.clientY - rect.top,
        ),
      );
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [fit]);

  const local = (e: { clientX: number; clientY: number }): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // ── GESTY ───────────────────────────────────────────────────────────

  const onPointerDown = (e: ReactPointerEvent, nodeId?: string) => {
    const p = local(e);
    setHover(null);
    pointers.current.set(e.pointerId, p);
    svgRef.current?.setPointerCapture(e.pointerId);

    if (pointers.current.size === 2) {
      // dwa palce = przybliżanie
      const [a, b] = [...pointers.current.values()];
      drag.current = {
        type: "pinch",
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        view: v,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    } else if (nodeId) {
      drag.current = {
        type: "node",
        id: nodeId,
        start: p,
        origin: pos(nodeId),
        moved: false,
      };
    } else {
      drag.current = { type: "pan", start: p, view: v, moved: false };
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const d = drag.current;
    if (!d) return;

    if (d.type === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      setView(zoomAt(d.view, dist / d.dist, d.mid.x, d.mid.y));
    } else if (d.type === "pan") {
      const dx = p.x - d.start.x;
      const dy = p.y - d.start.y;
      if (Math.hypot(dx, dy) > 3) d.moved = true;
      setView({ ...d.view, x: d.view.x + dx, y: d.view.y + dy });
    } else if (d.type === "node") {
      const dx = (p.x - d.start.x) / v.k;
      const dy = (p.y - d.start.y) / v.k;
      if (Math.hypot(dx, dy) * v.k > 4) d.moved = true;
      if (d.moved)
        setMoved((m) => ({
          ...m,
          [d.id]: { x: d.origin.x + dx, y: d.origin.y + dy },
        }));
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (pointers.current.size > 0) return;
    drag.current = null;

    // krótkie kliknięcie bez przesunięcia = wybór / odznaczenie
    if (d?.type === "node" && !d.moved) selectTag(d.id);
    if (d?.type === "pan" && !d.moved) setSelected(null);
  };

  const selectTag = (id: string | null) => {
    setSelected((cur) => (cur === id ? null : id));
    setShowAllWords(false);
  };

  if (loading || error) return <Loading error={error} />;

  // ── SĄSIEDZTWO WYBRANEGO TAGU ──────────────────────────────────────

  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  const isVisible = (l: TagLink) =>
    visibleIds.has(l.source) && visibleIds.has(l.target);
  const touchesSelected = (l: TagLink) =>
    !!selected && (l.source === selected || l.target === selected);
  // po kliknięciu: wszystkie krawędzie wybranego tagu (rysowane na wierzchu)
  const selectedLinks = selected
    ? graph.links.filter((l) => touchesSelected(l) && isVisible(l))
    : [];
  const visibleLinks = [
    ...backbone.filter((l) => isVisible(l) && !touchesSelected(l)),
    ...selectedLinks,
  ];
  const neighbors = new Map<string, number>();
  if (selected) {
    for (const l of graph.links) {
      if (l.source === selected) neighbors.set(l.target, l.weight);
      if (l.target === selected) neighbors.set(l.source, l.weight);
    }
  }
  const node = selected
    ? (graph.nodes.find((n) => n.id === selected) ?? null)
    : null;
  const maxWeight = Math.max(1, ...graph.links.map((l) => l.weight));
  const ranked = [...graph.nodes].sort((a, b) => b.count - a.count);

  const isActive = (id: string) =>
    !selected || id === selected || neighbors.has(id);
  const fontSize = 12 / v.k;
  // na wąskim ekranie podpisy tylko przy większych węzłach (reszta po przybliżeniu)
  const labelMin = size.w < 640 ? 15 : 13;

  return (
    <section>
      <PageHeader
        icon="🕸️"
        title="Tag Map"
        description="Every bubble is a tag — the bigger it is, the more words it has. Lines connect tags that describe the same words. Click a tag to see its words."
      />

      {/* LEGENDA I USTAWIENIA */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-sm">
        {(Object.keys(GROUP_INFO) as TagGroup[]).map((g) => {
          const on = !hidden.includes(g);
          return (
            <button
              key={g}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setHidden((h) => (on ? [...h, g] : h.filter((x) => x !== g)))
              }
              title={
                on
                  ? `Hide ${GROUP_INFO[g].label.toLowerCase()} tags`
                  : `Show ${GROUP_INFO[g].label.toLowerCase()} tags`
              }
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
                on
                  ? "border-line bg-surface text-heading"
                  : "border-dashed border-line bg-transparent text-body line-through opacity-60"
              }`}
            >
              <LegendSwatch group={g} />
              <span className="font-semibold">{GROUP_INFO[g].label}</span>
              <span className="hidden text-xs sm:inline">
                — {GROUP_INFO[g].description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* MAPA */}
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
          <div
            ref={boxRef}
            className="h-[min(65svh,560px)] min-h-[360px] w-full lg:h-[620px]"
          >
            <svg
              ref={svgRef}
              width={size.w}
              height={size.h}
              role="img"
              aria-label={`Map of ${graph.nodes.length} tags and their connections`}
              className="block cursor-grab touch-none select-none active:cursor-grabbing"
              onPointerDown={(e) => onPointerDown(e)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <g transform={`translate(${v.x} ${v.y}) scale(${v.k})`}>
                {/* KRAWĘDZIE */}
                {visibleLinks.map((l) => {
                  const a = pos(l.source);
                  const b = pos(l.target);
                  const touches = touchesSelected(l);
                  return (
                    <line
                      key={`${l.source}|${l.target}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={touches ? "var(--accent)" : "var(--text)"}
                      strokeOpacity={
                        selected
                          ? touches
                            ? 0.85
                            : 0.05
                          : 0.16 + 0.3 * (l.weight / maxWeight)
                      }
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}

                {/* WĘZŁY */}
                {visibleNodes.map((n) => {
                  const p = pos(n.id);
                  const active = isActive(n.id);
                  const showLabel =
                    n.r * v.k > labelMin ||
                    (selected && active) ||
                    hover?.id === n.id;
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${p.x} ${p.y})`}
                      opacity={active ? 1 : 0.18}
                      role="button"
                      tabIndex={0}
                      aria-label={`${prettyTag(n.id)}: ${n.count} words`}
                      aria-pressed={selected === n.id}
                      className="cursor-pointer outline-none [&:focus-visible>*:first-child]:stroke-[var(--accent)]"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onPointerDown(e, n.id);
                      }}
                      onPointerEnter={(e) =>
                        setHover({ id: n.id, ...local(e) })
                      }
                      onPointerLeave={() =>
                        setHover((h) => (h?.id === n.id ? null : h))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectTag(n.id);
                        }
                      }}
                    >
                      {/* większy obszar kliknięcia niż sam znak */}
                      <circle r={Math.max(n.r, 16 / v.k)} fill="transparent" />
                      <NodeShape
                        group={n.group}
                        r={n.r}
                        selected={selected === n.id}
                      />
                      {showLabel && (
                        <text
                          y={n.r + fontSize * 1.15}
                          textAnchor="middle"
                          fontSize={fontSize}
                          fontWeight={selected === n.id ? 700 : 600}
                          fill="var(--text-h)"
                          stroke="var(--surface)"
                          strokeWidth={3 / v.k}
                          paintOrder="stroke"
                          pointerEvents="none"
                        >
                          {n.id}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* DYMEK */}
          {hover &&
            (() => {
              const h = graph.nodes.find((n) => n.id === hover.id);
              if (!h) return null;
              return (
                <div
                  className="pointer-events-none absolute z-10 rounded-xl border border-line bg-surface px-3 py-2 text-left text-xs shadow-card"
                  style={{
                    left: Math.min(hover.x + 14, size.w - 170),
                    top: Math.max(8, hover.y - 52),
                  }}
                >
                  <div className="font-semibold text-heading">#{h.id}</div>
                  <div>
                    {h.count} words · {GROUP_INFO[h.group].label}
                  </div>
                </div>
              );
            })()}

          {/* PRZYCISKI ZOOM */}
          <div className="absolute right-3 top-3 flex flex-col gap-1.5">
            {[
              {
                label: "Zoom in",
                text: "+",
                run: () => setView(zoomAt(v, 1.3, size.w / 2, size.h / 2)),
              },
              {
                label: "Zoom out",
                text: "−",
                run: () => setView(zoomAt(v, 1 / 1.3, size.w / 2, size.h / 2)),
              },
              {
                label: "Reset view",
                text: "⤢",
                run: () => {
                  setView(null);
                  setMoved({});
                },
              },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={b.run}
                aria-label={b.label}
                title={b.label}
                className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-lg font-bold text-heading shadow-card transition hover:border-accent active:scale-90"
              >
                {b.text}
              </button>
            ))}
          </div>

          {/* PRÓG KRAWĘDZI */}
          <label className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/90 px-3 py-2 text-left text-xs backdrop-blur-sm sm:right-auto">
            <span className="font-semibold text-heading">Lines</span>
            <input
              type="range"
              min={1}
              max={4}
              value={perNode}
              onChange={(e) => setPerNode(Number(e.target.value))}
              className="w-24 accent-[var(--accent)]"
              aria-label="Lines to the nearest related tags per tag"
            />
            <span>
              {selected ? (
                <>
                  all <b className="text-heading">{selectedLinks.length}</b>{" "}
                  links of <b className="text-heading">#{selected}</b>
                </>
              ) : (
                <>
                  <b className="text-heading">{perNode}</b> nearest per tag ·
                  click a tag for all its links
                </>
              )}
            </span>
          </label>

          <p className="pointer-events-none absolute left-3 top-3 hidden rounded-full bg-surface/90 px-3 py-1 text-xs backdrop-blur-sm sm:block">
            Scroll or pinch to zoom · drag to move
          </p>
        </div>

        {/* PANEL */}
        <aside className="rounded-3xl border border-line bg-surface p-4 text-left shadow-card sm:p-5 lg:max-h-[620px] lg:overflow-y-auto">
          <label className="mb-4 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide">
              Find a tag
            </span>
            <select
              value={selected ?? ""}
              onChange={(e) => selectTag(e.target.value || null)}
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-heading focus:border-accent focus:outline-none"
            >
              <option value="">— choose a tag —</option>
              {[...graph.nodes]
                .sort((a, b) => a.id.localeCompare(b.id))
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    #{n.id} ({n.count})
                  </option>
                ))}
            </select>
          </label>

          {node ? (
            <TagDetails
              key={node.id}
              node={node}
              neighbors={[...neighbors.entries()].sort((a, b) => b[1] - a[1])}
              onSelect={selectTag}
              showAll={showAllWords}
              onShowAll={() => setShowAllWords(true)}
              learnIds={node.words
                .filter((w) => wordStatus(progress[w.id]) !== "mastered")
                .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
                .slice(0, 10)
                .map((w) => w.id)}
            />
          ) : (
            <>
              <h2 className="mb-1 text-lg">Biggest tags</h2>
              <p className="mb-3 text-sm">
                Click a bubble on the map or a tag below.
              </p>
              <ol className="flex flex-col gap-1">
                {ranked.slice(0, 12).map((n, i) => (
                  <li
                    key={n.id}
                    style={{ "--i": i } as CSSProperties}
                    className="animate-rise"
                  >
                    <button
                      type="button"
                      onClick={() => selectTag(n.id)}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition hover:bg-surface-2"
                    >
                      <LegendSwatch group={n.group} />
                      <span className="flex-1 text-left font-medium text-heading">
                        #{n.id}
                      </span>
                      <span className="tabular-nums">{n.count}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

// ── SZCZEGÓŁY TAGU ───────────────────────────────────────────────────────

function TagDetails({
  node,
  neighbors,
  onSelect,
  showAll,
  onShowAll,
  learnIds,
}: {
  node: TagNode;
  neighbors: [string, number][];
  onSelect: (id: string) => void;
  showAll: boolean;
  onShowAll: () => void;
  learnIds: string[];
}) {
  const words = [...node.words].sort(
    (a, b) =>
      LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] ||
      a.word.localeCompare(b.word, "es"),
  );
  const shown = showAll ? words : words.slice(0, 25);

  return (
    <div className="animate-pop">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <LegendSwatch group={node.group} />
          <h2 className="text-xl">#{node.id}</h2>
        </div>
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          aria-label="Close"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-sm transition hover:border-accent"
        >
          ✕
        </button>
      </div>
      <p className="mt-1 text-sm">
        {GROUP_INFO[node.group].label} tag ·{" "}
        <b className="text-heading">{node.count}</b> words
      </p>

      {/* POZIOMY */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {LEVELS.map((l) => (
          <div
            key={l}
            className="flex flex-col items-center gap-1 rounded-xl bg-surface-2 py-2"
          >
            <LevelBadge level={l} />
            <span className="text-sm font-semibold tabular-nums text-heading">
              {node.words.filter((w) => w.level === l).length}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to={`/?tag=${encodeURIComponent(node.id)}#dictionary`}
          className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-heading transition hover:border-accent"
        >
          📚 Dictionary
        </Link>
        {learnIds.length > 0 && (
          <Link
            to={`/learn?words=${learnIds.join(",")}`}
            className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-black shadow-card transition hover:brightness-110"
          >
            📖 Learn {learnIds.length} words
          </Link>
        )}
      </div>

      {/* POWIĄZANE TAGI */}
      {neighbors.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide">
            Connected tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {neighbors.slice(0, 14).map(([id, weight]) => (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                title={`${weight} words share #${node.id} and #${id}`}
                className="flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs transition hover:bg-accent-soft hover:text-heading"
              >
                #{id}
                <span className="tabular-nums opacity-70">{weight}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* SŁOWA */}
      <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide">
        Words
      </h3>
      <ul className="flex flex-col gap-1">
        {shown.map((w) => (
          <li
            key={w.id}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-2"
          >
            <LevelBadge level={w.level} />
            <span className="min-w-0 flex-1">
              <span
                className="block truncate text-sm font-semibold text-heading"
                lang="es"
              >
                {withArticle(w)}
              </span>
              <span className="block truncate text-xs">
                {w.translation_pl} · {w.translation_en}
              </span>
            </span>
            <SpeakButton text={withArticle(w)} size="sm" />
          </li>
        ))}
      </ul>
      {!showAll && words.length > shown.length && (
        <button
          type="button"
          onClick={onShowAll}
          className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold text-heading transition hover:border-accent"
        >
          Show all {words.length} words
        </button>
      )}
    </div>
  );
}

export default TagMap;
