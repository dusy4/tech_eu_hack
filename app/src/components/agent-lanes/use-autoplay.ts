// Copyright (c) 2026 Bruno Delorence. MIT License.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * When a demo may play on its own: while part of it is on screen and the tab is visible, never
 * under reduced motion, and not while the reader is using it. `take()` hands it to the reader; it
 * takes back over `idle` ms after their last input.
 */
export function useAutoplay<T extends HTMLElement>(idle = 6000) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [taken, setTaken] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let onScreen = false;
    const update = () => setVisible(onScreen && !document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        update();
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    document.addEventListener('visibilitychange', update);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const readMotion = () => setReduced(motion.matches);
    readMotion();
    motion.addEventListener('change', readMotion);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      motion.removeEventListener('change', readMotion);
    };
  }, []);

  const take = useCallback(() => {
    setTaken(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTaken(false), idle);
  }, [idle]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { ref, take, visible, reduced, playing: visible && !reduced && !taken };
}
