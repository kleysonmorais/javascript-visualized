import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  borderColor: string;
  glowEffect?: string;
  className?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  scrollable?: boolean;
}

export function Panel({
  title,
  borderColor,
  glowEffect,
  className = "",
  headerRight,
  children,
  scrollable = true,
}: PanelProps) {
  return (
    <div
      className={`relative flex flex-col rounded-lg border-2 min-h-0 ${className}`}
      style={{
        backgroundColor: "#12121a",
        borderColor,
        boxShadow: glowEffect,
      }}
    >
      <div
        className="px-3 py-2 text-xs font-semibold uppercase tracking-widest flex items-center justify-between shrink-0"
        style={{
          color: borderColor,
          borderBottom: `1px solid ${borderColor}22`,
        }}
      >
        <span>{title}</span>
        {headerRight}
      </div>
      <div
        className={`flex-1 p-3 min-h-0 ${scrollable ? "overflow-y-auto" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
