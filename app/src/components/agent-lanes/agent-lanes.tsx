// Copyright (c) 2026 Bruno Delorence. MIT License.

'use client';

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { AGENTS, HANDOFFS, REVIEW_TASK, TASKS, type Agent, type Handoff, type Task } from './data';
import { DemoPointer, runDemo, type Point } from './demo-pointer';
import { AgentGlyph, Sparkle, ToolGlyph, Warning } from './glyphs';
import { useAutoplay } from './use-autoplay';
import styles from './agent-lanes.module.css';

/*
 * Agent lanes: what a team of agents did over the last half hour, one lane per agent on a shared
 * time axis that ends at now. Each task is a bar: grey when done, red when it failed, blue and
 * still growing while it runs, orange while it waits for you. A dashed curve shows one task
 * handing its work to another.
 *
 * - Time is a clock in minutes, from the moment the board mounts. It moves one CSS variable,
 *   --now, on the lanes; --k is the lanes' px per minute, from their width. Each lane's bars sit
 *   on a track that slides left by now × k (a transform), so finished bars drift away; a running
 *   bar's width is (now − start) × k, so its right end stays on now. Nothing else re-renders as
 *   time passes, but a tooltip's minutes, once a minute.
 * - The clock writes --now every frame while that moves a bar by a quarter of a px or more, and
 *   less often when it would not: at real speed, about once a second.
 * - The handoff curves sit on one more track over all the lanes, an SVG path from the end of one
 *   bar to the start of the other. A new one draws itself in through a mask.
 * - Hover, focus or tap a bar for what it did; the "Needs you" chip opens what the agent asks,
 *   with Approve and Reject. Approving runs the task; rejecting ends it as failed.
 * - While on screen and untouched, a demo pointer hovers bars, approves the waiting task and
 *   watches the writer hand its draft to the reviewer, on a clock 30 times faster than real
 *   time. Any real input hands the board to the reader, and time goes back to real speed.
 */

export type { Agent, AgentMark, Handoff, Task, TaskStatus, Tool } from './data';

/** How fast the demo's clock runs: 30 minutes of the board in a minute. */
const DEMO_SPEED = 30;
/** Time the bars move by, at most, between two writes of the clock: in px. */
const STEP_PX = 0.25;

const STATUS_WORD: Record<Task['status'], string> = {
  running: 'Running',
  needs: 'Needs you',
  done: 'Done',
  failed: 'Failed',
};

/** The axis's step, in minutes: about six ticks across the window. */
function tickStep(window: number) {
  return [1, 2, 5, 10, 15, 30, 60, 120, 240].find((step) => window / step <= 6.5) ?? 480;
}

function minutes(value: number) {
  const rounded = Math.round(value);
  return rounded < 1 ? '<1m' : `${rounded}m`;
}

type Tip = { id: string; x: number; y: number; via: 'pointer' | 'focus' | 'tap' | 'demo' };

export function AgentLanes({
  agents = AGENTS,
  tasks: initialTasks = TASKS,
  handoffs: initialHandoffs = HANDOFFS,
  window: span = 30,
  speed = 1,
  title = 'Agents',
  onDecision,
  autoplay = true,
  colorScheme,
  defaultOpenTask,
  defaultTooltip,
  className = '',
}: {
  /** The agents, one lane each, in this order. */
  agents?: readonly Agent[];
  /** Their tasks, with times in minutes from mount (negative: before it). */
  tasks?: readonly Task[];
  /** Which task handed its work to which: a dashed curve from one to the other. */
  handoffs?: readonly Handoff[];
  /** How many minutes the axis shows, up to now. */
  window?: number;
  /** How fast time runs on the board: 1 is real time. The demo runs at 30. */
  speed?: number;
  /** The header's title. */
  title?: string;
  /** Called when the reader approves or rejects a task that needs them. */
  onDecision?: (task: Task, decision: 'approve' | 'reject') => void;
  /** While on screen and untouched, a demo pointer shows the board at work. */
  autoplay?: boolean;
  /** Light or dark colours, or the reader's ('system'); without it, the page's color-scheme. */
  colorScheme?: 'light' | 'dark' | 'system';
  /** Opens with the popover of this waiting task showing (its id); turns the demo off. */
  defaultOpenTask?: string;
  /** Opens with the tooltip of this task showing (its id); turns the demo off. */
  defaultTooltip?: string;
  className?: string;
}) {
  const { ref: root, playing, visible, take } = useAutoplay<HTMLDivElement>(6000);
  const demo = autoplay && playing && !defaultOpenTask && !defaultTooltip;
  const uid = useId();

  const [tasks, setTasks] = useState<Task[]>(() => [...initialTasks]);
  const [handoffs, setHandoffs] = useState<Handoff[]>(() => [...initialHandoffs]);
  /** Handoffs added since mount: they draw themselves in. */
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const [tip, setTip] = useState<Tip | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  /** The clock, as the tooltip shows it: updated each tenth of a minute while one shows. */
  const [shown, setShown] = useState(0);
  /** The demo's pointer over the chip, or over Approve. */
  const [demoOver, setDemoOver] = useState<'chip' | 'approve' | null>(null);
  /** The lanes fade out and back while the demo starts over. */
  const [fading, setFading] = useState(false);
  /** Lane geometry, for the handoff curves: px per minute, each lane's middle. */
  const [geo, setGeo] = useState<{ k: number; mids: Record<string, number> }>({
    k: 0,
    mids: {},
  });

  const card = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const axis = useRef<HTMLDivElement>(null);
  const tipBox = useRef<HTMLDivElement>(null);
  const askBox = useRef<HTMLDivElement>(null);
  const pointer = useRef<HTMLSpanElement>(null);
  const bars = useRef(new Map<string, HTMLElement>());
  const chips = useRef(new Map<string, HTMLButtonElement>());
  const approveButton = useRef<HTMLButtonElement>(null);
  const clock = useRef({ now: 0, shown: 0 });
  const kRef = useRef(16);
  const speedRef = useRef(speed);
  const tipOn = useRef(false);
  useEffect(() => {
    speedRef.current = demo ? DEMO_SPEED : speed;
  }, [demo, speed]);
  useEffect(() => {
    tipOn.current = tip !== null;
    if (tip) setShown(clock.current.now);
  }, [tip]);
  /** The reader opened the popover: it takes the focus, and gives it back. */
  const askFocus = useRef(false);

  // New data from the props: start over (set while rendering, so it never shows the old data).
  // Compared by content, so arrays written inline in the caller's JSX do not reset it.
  const givenKey = JSON.stringify([initialTasks, initialHandoffs]);
  const [given, setGiven] = useState(givenKey);
  if (given !== givenKey) {
    setGiven(givenKey);
    setTasks([...initialTasks]);
    setHandoffs([...initialHandoffs]);
    setFresh(new Set());
    setAsking(null);
    setTip(null);
  }

  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const running = tasks.filter((task) => task.status === 'running').length;
  const needing = tasks.filter((task) => task.status === 'needs').length;

  /** Repeats are made to differ, so screen readers announce them again. */
  const announce = (text: string) => setMessage((now) => (now === text ? `${text} ` : text));

  const setNow = useCallback((now: number) => {
    clock.current.now = now;
    body.current?.style.setProperty('--now', now.toFixed(4));
  }, []);

  // The clock: runs while the board is on screen, faster while the demo plays.
  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    let timer = 0;
    let last = performance.now();
    const tick = () => {
      const time = performance.now();
      setNow(clock.current.now + ((time - last) / 60000) * speedRef.current);
      last = time;
      // The tooltip's minutes: a tenth of a minute at a time while one shows.
      const grain = tipOn.current ? 10 : 1;
      const shownNow = Math.floor(clock.current.now * grain) / grain;
      if (shownNow !== clock.current.shown) {
        clock.current.shown = shownNow;
        if (tipOn.current) setShown(shownNow);
      }
      schedule();
    };
    const schedule = () => {
      const pxPerMs = (speedRef.current * kRef.current) / 60000;
      const every = pxPerMs > 0 ? STEP_PX / pxPerMs : 1000;
      if (every <= 20) frame = requestAnimationFrame(tick);
      else timer = window.setTimeout(tick, Math.min(1000, every));
    };
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [visible, demo, setNow]);

  // The lanes' px per minute and each lane's middle, from the layout.
  useLayoutEffect(() => {
    const lanesBox = body.current;
    const ruler = axis.current;
    if (!lanesBox || !ruler) return;
    const measure = () => {
      const k = ruler.clientWidth / span;
      kRef.current = k;
      lanesBox.style.setProperty('--k', `${k}px`);
      const top = lanesBox.getBoundingClientRect().top;
      const mids: Record<string, number> = {};
      lanesBox.querySelectorAll<HTMLElement>('[data-lane]').forEach((lane) => {
        const rect = lane.getBoundingClientRect();
        // In the box's own px, should the board sit in a scaled container.
        const scale = rect.width / lane.offsetWidth || 1;
        mids[lane.dataset.lane!] = (rect.top - top + rect.height / 2) / scale;
      });
      setGeo({ k, mids });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(lanesBox);
    observer.observe(ruler);
    return () => observer.disconnect();
  }, [span, agents]);

  // The tooltip stays inside the card.
  useLayoutEffect(() => {
    const box = tipBox.current;
    const frame = card.current;
    if (!box || !frame || !tip) return;
    const max = frame.offsetWidth - box.offsetWidth - 8;
    box.style.left = `${Math.max(8, Math.min(tip.x, max))}px`;
    // Under its bar, or over it when the card's bottom is too near.
    const below = tip.y + box.offsetHeight < frame.offsetHeight + 48;
    box.style.top = below ? `${tip.y}px` : `${tip.y - box.offsetHeight - 26 - 8}px`;
  });

  // Where the popover goes: above its bar, its right edge on the bar's (below if no room).
  const [askAt, setAskAt] = useState<{ right: number; top?: number; bottom?: number } | null>(null);
  const placeAsk = useCallback((id: string) => {
    const bar = bars.current.get(id);
    const frame = card.current;
    if (!bar || !frame) return;
    const f = frame.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    const scale = f.width / frame.offsetWidth || 1;
    const right = Math.max(8, (f.right - b.right) / scale);
    const above = (b.top - f.top) / scale;
    setAskAt(
      above > 120
        ? { right, bottom: (f.bottom - b.top) / scale + 4 }
        : { right, top: (b.bottom - f.top) / scale + 4 },
    );
  }, []);

  const open = (id: string, byReader: boolean) => {
    setTip(null);
    askFocus.current = byReader;
    placeAsk(id);
    setAsking(id);
  };

  // Opened in a given state: the popover of one task, or the tooltip of one, once laid out.
  // Both are placed from their bar's box, so they can only be set once the lanes are laid out.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (defaultOpenTask) open(defaultOpenTask, false);
    else if (defaultTooltip) showTip(defaultTooltip, 'tap');
    // Only on mount and when the asked task changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOpenTask, defaultTooltip]);

  // The popover: the reader's focus goes in, Escape or a press outside closes it.
  useEffect(() => {
    if (!asking) return;
    if (askFocus.current) approveButton.current?.focus();
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (askBox.current?.contains(target) || chips.current.get(asking)?.contains(target)) return;
      setAsking(null);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [asking]);

  const decide = (id: string, decision: 'approve' | 'reject') => {
    const task = byId.get(id);
    if (!task) return;
    const reader = askFocus.current;
    setAsking(null);
    setTasks((all) =>
      all.map((each) =>
        each.id !== id
          ? each
          : decision === 'approve'
            ? { ...each, status: 'running' }
            : { ...each, status: 'failed', end: clock.current.now },
      ),
    );
    const agent = agents.find((each) => each.id === task.agent)?.name ?? 'The agent';
    announce(
      decision === 'approve'
        ? `${task.label} approved: ${agent} is running it.`
        : `${task.label} rejected: ${agent} stopped it.`,
    );
    onDecision?.(task, decision);
    if (reader) bars.current.get(id)?.focus();
  };

  /** A tooltip for a bar, `x` px from the card's left (or the bar's left, plus a little). */
  const showTip = (id: string, via: Tip['via'], clientX?: number) => {
    const bar = bars.current.get(id);
    const frame = card.current;
    if (!bar || !frame) return;
    const f = frame.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    const scale = f.width / frame.offsetWidth || 1;
    const from = clientX ?? Math.max(b.left, f.left) + 24;
    setTip({ id, via, x: (from - f.left) / scale - 14, y: (b.bottom - f.top) / scale + 4 });
  };

  // Lanes and their tasks: which tasks sit in which lane.
  const lanes = useMemo(
    () => agents.map((agent) => ({ agent, tasks: tasks.filter((t) => t.agent === agent.id) })),
    [agents, tasks],
  );

  // ---- The demo ----------------------------------------------------------------------------

  const demoStep = useEffectEvent((step: DemoStep) => {
    switch (step.kind) {
      case 'tip':
        if (step.id) showTip(step.id, 'demo', step.clientX);
        else setTip((now) => (now?.via === 'demo' ? null : now));
        break;
      case 'over':
        setDemoOver(step.what);
        break;
      case 'open':
        open(step.id, false);
        break;
      case 'approve':
        setDemoOver(null);
        decide(step.id, 'approve');
        break;
      case 'finish': {
        const now = clock.current.now;
        setTasks((all) => [
          ...all.map((task) =>
            task.id === step.from ? { ...task, status: 'done' as const, end: now } : task,
          ),
          { ...REVIEW_TASK, start: now },
        ]);
        setHandoffs((all) => [...all, { from: step.from, to: REVIEW_TASK.id }]);
        setFresh((all) => new Set(all).add(`${step.from}>${REVIEW_TASK.id}`));
        announce(`Writer finished; Reviewer started ${REVIEW_TASK.label}.`);
        break;
      }
      case 'fade':
        setFading(step.on);
        break;
      case 'reset':
        setTasks([...initialTasks]);
        setHandoffs([...initialHandoffs]);
        setFresh(new Set());
        setAsking(null);
        setTip(null);
        setNow(0);
        break;
    }
  });

  /** Whether the board has moved on from where the demo starts. */
  const dirty = useEffectEvent(
    () =>
      clock.current.now > 0.5 ||
      tasks.length !== initialTasks.length ||
      tasks.some((task, i) => task.status !== initialTasks[i]?.status),
  );

  useEffect(() => {
    const stage = root.current;
    const arrow = pointer.current;
    if (!demo || !stage || !arrow) return;

    /** A point on an element, in the stage's px: `fx`, `fy` are shares of its box. */
    const on = (
      element: Element | null | undefined,
      fx = 0.5,
      fy = 0.5,
    ): Point & { cx: number } => {
      const frame = stage.getBoundingClientRect();
      const scale = frame.width / stage.offsetWidth || 1;
      const rect = element?.getBoundingClientRect() ?? frame;
      const cx = rect.left + rect.width * fx;
      return {
        x: (cx - frame.left) / scale,
        y: (rect.top + rect.height * fy - frame.top) / scale,
        cx,
      };
    };
    const barOf = (id: string) => bars.current.get(id);
    /** A visible share along a bar: never under the lanes' faded left edge. */
    const along = (id: string, share: number) => {
      const bar = barOf(id);
      const lane = bar?.closest('[data-lane]');
      if (!bar || !lane) return 0.5;
      const b = bar.getBoundingClientRect();
      const l = lane.getBoundingClientRect();
      const left = Math.max(b.left, l.left + 30);
      const x = left + (Math.min(b.right, l.right) - left) * share;
      return (x - b.left) / (b.width || 1);
    };

    const stop = runDemo(stage, arrow, async ({ wait, glide, glyph }) => {
      const hover = async (id: string, share: number, ms: number, hold: number) => {
        demoStep({ kind: 'tip', id: null });
        glyph('arrow');
        const point = on(barOf(id), along(id, share), 0.55);
        await glide(point, ms);
        glyph('hand');
        demoStep({ kind: 'tip', id, clientX: on(barOf(id), along(id, share), 0.55).cx });
        await wait(hold);
      };
      for (;;) {
        if (dirty()) {
          demoStep({ kind: 'fade', on: true });
          await wait(320);
          demoStep({ kind: 'reset' });
          await wait(60);
          demoStep({ kind: 'fade', on: false });
        }
        await wait(500);
        await hover('draft', 0.32, 560, 950);
        await hover('interviews', 0.62, 480, 1000);
        // The chip, then Approve.
        demoStep({ kind: 'tip', id: null });
        glyph('arrow');
        await glide(on(chips.current.get('keys'), 0.55, 0.6), 600);
        glyph('hand');
        demoStep({ kind: 'over', what: 'chip' });
        await wait(320);
        demoStep({ kind: 'open', id: 'keys' });
        demoStep({ kind: 'over', what: null });
        await wait(520);
        glyph('arrow');
        await glide(on(approveButton.current, 0.45, 0.5), 560);
        glyph('hand');
        demoStep({ kind: 'over', what: 'approve' });
        await wait(380);
        demoStep({ kind: 'approve', id: 'keys' });
        await wait(420);
        await hover('interviews', 0.7, 640, 900);
        // The writer hands its draft over.
        demoStep({ kind: 'tip', id: null });
        glyph('arrow');
        await glide(on(barOf('draft'), 0.5, 2.2), 520);
        await wait(200);
        demoStep({ kind: 'finish', from: 'draft' });
        await wait(500);
        await hover('draft', 0.62, 420, 1000);
        await hover('interviews', 0.5, 600, 1100);
        demoStep({ kind: 'tip', id: null });
        glyph('arrow');
        await glide(on(card.current, 0.8, 1.15), 700);
        await wait(1600);
      }
    });
    return () => {
      stop();
      setDemoOver(null);
      setFading(false);
      setTip((now) => (now?.via === 'demo' ? null : now));
    };
  }, [demo, root]);

  // ---- Drawing -----------------------------------------------------------------------------

  const step = tickStep(span);
  const ticks: number[] = [];
  for (let at = step; at < span - step * 0.25; at += step) ticks.push(at);

  const tipTask = tip ? byId.get(tip.id) : undefined;
  const tipAgent = tipTask ? agents.find((agent) => agent.id === tipTask.agent) : undefined;
  const askTask = asking ? byId.get(asking) : undefined;

  const maskBase = `lanes${uid.replace(/[^\w-]/g, '')}`;
  const curves = handoffs.flatMap((handoff) => {
    const from = byId.get(handoff.from);
    const to = byId.get(handoff.to);
    if (!from || !to || from.end === undefined || !geo.k) return [];
    const y1 = geo.mids[from.agent];
    const y2 = geo.mids[to.agent];
    if (y1 === undefined || y2 === undefined) return [];
    const x1 = (from.end + span) * geo.k;
    const x2 = (to.start + span) * geo.k;
    const bend = Math.max(9, Math.min(14, Math.abs(x2 - x1) * 0.6));
    const d = `M${x1.toFixed(1)} ${y1.toFixed(1)}C${(x1 + bend).toFixed(1)} ${y1.toFixed(1)} ${(x2 - bend).toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    const key = `${handoff.from}>${handoff.to}`;
    const mask = `${maskBase}-${key.replace(/[^\w-]/g, '-')}`;
    return [{ key, d, mask, fresh: fresh.has(key) }];
  });

  const onBarEnter = (id: string) => (event: ReactPointerEvent) => {
    if (event.pointerType === 'touch') return;
    showTip(id, 'pointer', event.clientX);
  };
  const onBarLeave = (event: ReactPointerEvent) => {
    if (event.pointerType === 'touch') return;
    setTip((now) => (now?.via === 'pointer' ? null : now));
  };

  return (
    <div
      ref={root}
      className={`${styles.root} ${className}`}
      data-part="stage"
      data-color-scheme={colorScheme}
      onPointerDownCapture={take}
      onKeyDownCapture={(event) => {
        take();
        if (event.key === 'Escape') {
          if (asking) {
            const id = asking;
            setAsking(null);
            chips.current.get(id)?.focus();
          } else setTip(null);
        }
      }}
      onPointerMove={(event) => {
        // The reader's own pointer on the board takes over from the demo's.
        if (event.pointerType !== 'touch') take();
      }}
    >
      <section
        ref={card}
        className={styles.card}
        data-part="card"
        aria-labelledby={`${uid}-title`}
        style={{ '--window': span } as CSSProperties}
      >
        <header className={styles.header} data-part="header">
          <Sparkle className={styles.sparkle} />
          <h2 id={`${uid}-title`} className={styles.title}>
            {title}
          </h2>
          <p className={styles.counts} data-part="counts">
            {running > 0 && (
              <span className={styles.count} data-tone="running">
                <span className={styles.dot} aria-hidden="true" />
                {running} running
              </span>
            )}
            {needing > 0 && (
              <span className={styles.count} data-tone="needs">
                <span className={styles.dot} aria-hidden="true" />
                {needing} need you
              </span>
            )}
          </p>
          <span className={styles.range} data-part="range">
            Last {span}m
          </span>
        </header>

        <div ref={body} className={styles.body} data-part="lanes" data-fading={fading || undefined}>
          <div className={styles.axisRow} aria-hidden="true">
            <div ref={axis} className={styles.axis} data-part="axis">
              {ticks.map((at) => (
                <span
                  key={at}
                  className={styles.tick}
                  style={{ left: `${((span - at) / span) * 100}%` }}
                >
                  −{at}m
                </span>
              ))}
              <span className={styles.now} data-part="now">
                now
              </span>
            </div>
          </div>

          <ul className={styles.rows} aria-label="Agents and their tasks">
            {lanes.map(({ agent, tasks: own }) => {
              const needs = own.some((task) => task.status === 'needs');
              const idle = !needs && !own.some((task) => task.status === 'running');
              return (
                <li key={agent.id} className={styles.row} data-part="row">
                  <div className={styles.agent} data-part="agent">
                    <span className={styles.tile} data-part="tile">
                      <AgentGlyph mark={agent.mark} className={styles.mark} />
                    </span>
                    <span className={styles.who}>
                      <span className={styles.nameLine}>
                        <span className={styles.name}>{agent.name}</span>
                        {(needs || idle) && (
                          <span
                            key={needs ? 'needs' : 'idle'}
                            className={styles.badge}
                            data-part="badge"
                            data-tone={needs ? 'needs' : 'idle'}
                          >
                            {needs ? 'Needs you' : 'Idle'}
                          </span>
                        )}
                      </span>
                      <span className={styles.model}>{agent.model}</span>
                    </span>
                  </div>
                  <div className={styles.lane} data-lane={agent.id} data-part="lane">
                    {ticks.map((at) => (
                      <span
                        key={at}
                        className={styles.grid}
                        aria-hidden="true"
                        style={{ left: `${((span - at) / span) * 100}%` }}
                      />
                    ))}
                    <ul className={styles.track} aria-label={`${agent.name}’s tasks`}>
                      {own.map((task, index) => (
                        <li
                          key={task.id}
                          className={styles.slot}
                          data-status={task.status}
                          style={
                            {
                              '--start': task.start,
                              '--end': task.end ?? 0,
                              '--delay': `${-index * 0.7}s`,
                            } as CSSProperties
                          }
                        >
                          <button
                            type="button"
                            ref={(element) => {
                              if (element) bars.current.set(task.id, element);
                              else bars.current.delete(task.id);
                            }}
                            className={styles.bar}
                            data-part="bar"
                            data-status={task.status}
                            aria-label={`${task.label}, ${STATUS_WORD[task.status].toLowerCase()}`}
                            aria-describedby={tip?.id === task.id ? `${uid}-tip` : undefined}
                            onPointerEnter={onBarEnter(task.id)}
                            onPointerLeave={onBarLeave}
                            onFocus={(event) => {
                              if (event.currentTarget.matches(':focus-visible'))
                                showTip(task.id, 'focus');
                            }}
                            onBlur={() => setTip((now) => (now?.via === 'focus' ? null : now))}
                            onClick={(event) => {
                              // A tap or a click shows it too, and a second one hides it.
                              if (tip?.id === task.id && tip.via !== 'pointer') setTip(null);
                              else showTip(task.id, 'tap', event.clientX || undefined);
                            }}
                          >
                            <span className={styles.tools} aria-hidden="true">
                              {task.tools.map((tool) => (
                                <ToolGlyph key={tool} tool={tool} className={styles.tool} />
                              ))}
                            </span>
                            <span className={styles.label}>{task.label}</span>
                          </button>
                          {task.status === 'needs' && (
                            <button
                              type="button"
                              ref={(element) => {
                                if (element) chips.current.set(task.id, element);
                                else chips.current.delete(task.id);
                              }}
                              className={styles.chip}
                              data-part="needs-chip"
                              data-over={demoOver === 'chip' || undefined}
                              aria-haspopup="dialog"
                              aria-expanded={asking === task.id}
                              aria-label={`${task.label} needs you: review`}
                              onClick={() =>
                                asking === task.id ? setAsking(null) : open(task.id, true)
                              }
                            >
                              <span
                                className={styles.chipFace}
                                data-part="chip-face"
                                aria-hidden="true"
                              >
                                <Warning className={styles.warning} />
                                Needs you
                              </span>
                              <span className={styles.chipGlow} aria-hidden="true">
                                <Warning className={styles.warning} />
                                Needs you
                              </span>
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className={styles.links} aria-hidden="true" data-part="handoffs">
            <svg className={styles.linkTrack} focusable="false">
              {curves.map((curve) => (
                <g key={curve.key}>
                  {curve.fresh && (
                    <mask id={curve.mask} maskUnits="userSpaceOnUse">
                      <path
                        d={curve.d}
                        pathLength={1}
                        className={styles.reveal}
                        fill="none"
                        stroke="#fff"
                        strokeWidth="6"
                      />
                    </mask>
                  )}
                  <path
                    d={curve.d}
                    className={styles.link}
                    mask={curve.fresh ? `url(#${curve.mask})` : undefined}
                  />
                </g>
              ))}
            </svg>
          </div>
        </div>

        {tipTask && tipAgent && tip && (
          <div
            key={tip.id}
            ref={tipBox}
            id={`${uid}-tip`}
            role="tooltip"
            className={styles.tip}
            data-part="tooltip"
          >
            <p className={styles.tipHead}>
              {tipAgent.name} · {STATUS_WORD[tipTask.status]} ·{' '}
              {minutes((tipTask.end ?? shown) - tipTask.start)}
            </p>
            {tipTask.notes && (
              <ul className={styles.notes}>
                {tipTask.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {askTask?.ask && askAt && (
          <div
            ref={askBox}
            role="dialog"
            aria-labelledby={`${uid}-ask`}
            aria-describedby={`${uid}-ask-body`}
            className={styles.ask}
            data-part="popover"
            style={{ right: askAt.right, top: askAt.top, bottom: askAt.bottom }}
          >
            <h3 id={`${uid}-ask`} className={styles.askTitle}>
              {askTask.ask.title}
            </h3>
            <p id={`${uid}-ask-body`} className={styles.askBody}>
              {askTask.ask.body}
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.reject}
                data-part="reject"
                onClick={() => decide(askTask.id, 'reject')}
              >
                Reject
              </button>
              <button
                ref={approveButton}
                type="button"
                className={styles.approve}
                data-part="approve"
                data-over={demoOver === 'approve' || undefined}
                onClick={() => decide(askTask.id, 'approve')}
              >
                Approve
              </button>
            </div>
          </div>
        )}
      </section>

      <div className={styles.pointerLayer} aria-hidden="true">
        <DemoPointer
          ref={pointer}
          className={styles.pointer}
          arrowClass={styles.arrow}
          handClass={styles.hand}
        />
      </div>
      <p className={styles.hidden} role="status">
        {message}
      </p>
    </div>
  );
}

type DemoStep =
  | { kind: 'tip'; id: string | null; clientX?: number }
  | { kind: 'over'; what: 'chip' | 'approve' | null }
  | { kind: 'open'; id: string }
  | { kind: 'approve'; id: string }
  | { kind: 'finish'; from: string }
  | { kind: 'fade'; on: boolean }
  | { kind: 'reset' };
