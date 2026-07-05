'use client';

import { useTheme } from '@/lib/theme-context';

export function Skeleton({ h = 14, w = '100%', r = 8, style = {} }: { h?: number | string; w?: number | string; r?: number; style?: React.CSSProperties }) {
  const { c } = useTheme();
  return <div style={{ height: h, width: w, borderRadius: r, background: c.border, opacity: 0.5, animation: 'skel-pulse 1.4s ease-in-out infinite', ...style }} />;
}

/** Placeholder de lista (várias linhas em cards) enquanto carrega. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  const { c } = useTheme();
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <style>{`@keyframes skel-pulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }`}</style>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12 }}>
          <Skeleton h={38} w={38} r={10} />
          <div style={{ flex: 1 }}>
            <Skeleton h={13} w="55%" style={{ marginBottom: 7 }} />
            <Skeleton h={10} w="30%" />
          </div>
          <Skeleton h={16} w={70} />
        </div>
      ))}
    </div>
  );
}
