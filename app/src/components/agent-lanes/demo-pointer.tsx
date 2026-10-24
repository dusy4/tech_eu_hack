// Copyright (c) 2026 Bruno Delorence. MIT License.

'use client';

import type { CSSProperties, Ref } from 'react';

/*
 * The demo's pointer, and the steps that move it. A demo is a script of awaited steps: wait, or
 * glide the pointer somewhere. Stopping the demo (the reader takes over, or it scrolls away) ends
 * the step in progress at once: its promise rejects, which ends the script right there, and the
 * pointer fades out.
 *
 * Each glide is a curved flight played by the Web Animations API, so nothing runs frame by frame.
 * The points of the flight are handed to whoever wants to move along with it. The arrow and the
 * hand are HTML boxes
 * that swap by their visibility: a change of style inside an SVG would lay the SVG out again.
 */

export type Point = { x: number; y: number };

/** A glide's path and timing, for an animation that plays along with it. */
export type Flight = { points: Point[]; timing: KeyframeAnimationOptions };

export type Demo = {
  /** Resolves after `ms`. */
  wait: (ms: number) => Promise<void>;
  /** Glides the pointer to `to`, in the stage's own px, in `ms`; `along` gets the flight. */
  glide: (to: Point, ms: number, along?: (flight: Flight) => void) => Promise<void>;
  /** Shows the arrow, or the hand a link shows. */
  glyph: (name: 'arrow' | 'hand') => void;
};

/** What a stopped demo's pending step rejects with. */
class Stopped extends Error {}

/** Where the arrow's tip is, as shares of its box: the point the pointer stands on. */
const TIP: Point = { x: 0.15, y: 0.1 };

/** How many points a flight is drawn through. */
const SAMPLES = 24;

/** Plays `script` with the pointer over `stage`; returns the function that stops it. */
export function runDemo(
  stage: HTMLElement,
  pointer: HTMLElement,
  script: (demo: Demo) => Promise<void>,
): () => void {
  let alive = true;
  let flight: Animation | null = null;
  // The stylesheet sizes the pointer from the stage's width; its tip is where it stands.
  const tip = { x: pointer.offsetWidth * TIP.x, y: pointer.offsetHeight * TIP.y };
  const place = ({ x, y }: Point) => `translate(${x - tip.x}px, ${y - tip.y}px)`;
  const timers = new Set<number>();
  const pending = new Set<() => void>();
  // The pointer comes in from the lower right.
  let at: Point = { x: stage.offsetWidth * 0.8, y: stage.offsetHeight * 0.9 };

  /** Settles like `promise`, or rejects as soon as the demo stops. */
  const step = (promise: Promise<unknown>) =>
    new Promise<void>((resolve, reject) => {
      if (!alive) return reject(new Stopped());
      const cancel = () => reject(new Stopped());
      pending.add(cancel);
      promise.then(
        () => {
          pending.delete(cancel);
          if (alive) resolve();
        },
        () => {
          pending.delete(cancel);
          reject(new Stopped());
        },
      );
    });

  const wait = (ms: number) =>
    step(
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          resolve();
        }, ms);
        timers.add(timer);
      }),
    );

  const glide: Demo['glide'] = (to, ms, along) => {
    const from = at;
    at = to;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    // A gentle curve, as a hand moves: the control point sits off the straight line.
    const bend = { x: (from.x + to.x) / 2 - dy * 0.18, y: (from.y + to.y) / 2 + dx * 0.18 };
    const points: Point[] = [];
    for (let i = 0; i <= SAMPLES; i += 1) {
      const t = i / SAMPLES;
      const u = 1 - t;
      points.push({
        x: u * u * from.x + 2 * u * t * bend.x + t * t * to.x,
        y: u * u * from.y + 2 * u * t * bend.y + t * t * to.y,
      });
    }
    const timing: KeyframeAnimationOptions = {
      duration: ms,
      easing: 'cubic-bezier(0.45, 0, 0.25, 1)',
    };
    flight?.cancel();
    // Where it rests once the flight is over.
    pointer.style.transform = place(to);
    flight = pointer.animate(
      points.map((point) => ({ transform: place(point) })),
      timing,
    );
    along?.({ points, timing });
    return step(flight.finished);
  };

  const glyph: Demo['glyph'] = (name) => {
    pointer.dataset.glyph = name;
  };

  pointer.dataset.glyph = 'arrow';
  pointer.style.transform = place(at);
  pointer.style.opacity = '1';
  script({ wait, glide, glyph }).catch((error: unknown) => {
    if (!(error instanceof Stopped)) throw error;
  });

  return () => {
    if (!alive) return;
    alive = false;
    timers.forEach((timer) => window.clearTimeout(timer));
    flight?.cancel();
    pending.forEach((cancel) => cancel());
    pointer.style.opacity = '0';
  };
}

/**
 * The pointer's box: it moves, on a layer of its own. Its size comes from its class, its colours
 * from the stage's tokens (agent-lanes.module.css).
 */
const POINTER: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  zIndex: 2,
  display: 'block',
  pointerEvents: 'none',
  opacity: 0,
  transition: 'opacity 0.3s ease',
  filter: 'drop-shadow(0 1px 1.5px var(--pointer-shadow))',
  willChange: 'transform',
};

/** One glyph over the other, each filling the box. */
const GLYPH: CSSProperties = { position: 'absolute', inset: 0, display: 'block' };
const DRAWING: CSSProperties = {
  display: 'block',
  width: '100%',
  height: '100%',
  overflow: 'visible',
};
/** The arrow is dark on a white edge, the hand white on a dark one, as the system draws them. */
const ARROW: CSSProperties = { fill: 'var(--pointer)', stroke: 'var(--pointer-edge)' };
const HAND: CSSProperties = { fill: 'var(--pointer-edge)', stroke: 'var(--pointer)' };

/**
 * The pointer the demo moves around: an arrow, or a pointing hand over what it can press. It is
 * decorative: what it does shows on the lanes themselves. The stylesheet shows one glyph at a time,
 * from the box's data-glyph.
 */
export function DemoPointer({
  ref,
  className,
  arrowClass,
  handClass,
}: {
  ref: Ref<HTMLSpanElement>;
  className?: string;
  arrowClass?: string;
  handClass?: string;
}) {
  return (
    <span ref={ref} className={className} style={POINTER} aria-hidden="true">
      <span className={arrowClass} style={GLYPH}>
        <svg viewBox="0 0 20 20" style={DRAWING}>
          <path
            d="M3 2v14.5l3.6-3.3 2.6 5.6 2.4-1.1-2.6-5.5h5.2z"
            style={ARROW}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={handClass} style={GLYPH}>
        <svg viewBox="0 0 20 20" style={DRAWING}>
          {/* The tip of the finger sits where the arrow's tip is. */}
          <path
            d="M6.4 3.3c0-.8.6-1.4 1.3-1.4S9 2.5 9 3.3v5.5c.2-.5.6-.8 1.2-.8.7 0 1.2.5 1.2 1.2v.5c.2-.5.6-.8 1.2-.8.7 0 1.2.5 1.2 1.2v.7c.2-.4.6-.7 1.1-.7.7 0 1.2.5 1.2 1.2v3.5c0 2.8-1.9 4.9-4.6 4.9h-1.2c-1.8 0-3.1-.8-4.1-2.3l-2.6-3.9c-.4-.6-.2-1.3.4-1.7.6-.3 1.3-.2 1.7.4l.6.9z"
            style={HAND}
            strokeWidth="1.1"
            strokeLinejoin="round"
            transform="translate(-4.7 0.1)"
          />
        </svg>
      </span>
    </span>
  );
}
