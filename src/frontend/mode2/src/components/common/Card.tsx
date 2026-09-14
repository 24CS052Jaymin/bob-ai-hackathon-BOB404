import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border/80 bg-card shadow-soft ${className}`}>{children}</section>
  );
}
