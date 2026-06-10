import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ScrollableTabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

interface ScrollableTabBarProps<T extends string> {
  items: ScrollableTabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}

export function ScrollableTabBar<T extends string>({
  items,
  activeId,
  onChange,
  className = ''
}: ScrollableTabBarProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const node = scrollRef.current;
    if (!node) return;

    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    setCanScrollLeft(node.scrollLeft > 4);
    setCanScrollRight(node.scrollLeft < maxScrollLeft - 4);
  };

  useEffect(() => {
    updateScrollState();

    const node = scrollRef.current;
    if (!node) return;

    node.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      node.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [items.length]);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });

    const timeout = window.setTimeout(updateScrollState, 260);
    return () => window.clearTimeout(timeout);
  }, [activeId]);

  const scrollByPage = (direction: -1 | 1) => {
    const node = scrollRef.current;
    if (!node) return;

    node.scrollBy({
      left: direction * Math.max(180, node.clientWidth * 0.65),
      behavior: 'smooth'
    });
  };

  return (
    <div className={`relative max-w-full overflow-hidden rounded-2xl border border-slate-800 bg-brand-navy ${className}`}>
      <div
        ref={scrollRef}
        className="scrollbar-none flex gap-1 overflow-x-auto scroll-smooth snap-x snap-mandatory p-1 md:px-9"
      >
        {items.map(item => {
          const isActive = activeId === item.id;

          return (
            <button
              key={item.id}
              ref={isActive ? activeTabRef : null}
              type="button"
              onClick={() => onChange(item.id)}
              className={`flex shrink-0 snap-center items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                isActive
                  ? 'gold-gradient-bg text-brand-navy shadow-premium-glow'
                  : 'text-slate-400 hover:bg-brand-navy-light/20 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-brand-navy to-transparent transition-opacity ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-brand-navy to-transparent transition-opacity ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <button
        type="button"
        onClick={() => scrollByPage(-1)}
        className={`absolute left-1 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg border border-slate-800 bg-black/85 text-slate-300 shadow-premium transition-all hover:text-brand-gold md:flex ${
          canScrollLeft ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-label="Scroll tabs left"
      >
        <ChevronLeft size={16} />
      </button>

      <button
        type="button"
        onClick={() => scrollByPage(1)}
        className={`absolute right-1 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg border border-slate-800 bg-black/85 text-slate-300 shadow-premium transition-all hover:text-brand-gold md:flex ${
          canScrollRight ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-label="Scroll tabs right"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default ScrollableTabBar;
