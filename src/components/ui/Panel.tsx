import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  borderColor: string;
  glowEffect?: string;
  className?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function Panel({
  title,
  borderColor,
  glowEffect,
  className = "",
  headerRight,
  children,
}: PanelProps) {
  return (
    <div
      className={`flex flex-col rounded-[12px] overflow-hidden ${className}`}
      style={{
        backgroundColor: "#12121a",
        border: `1.5px solid ${borderColor}`,
        boxShadow: glowEffect,
        position: "relative",
      }}
    >
      <div
        className="px-4 py-2 text-xs font-semibold uppercase tracking-widest flex items-center justify-between"
        style={{
          color: borderColor,
          borderBottom: `1px solid ${borderColor}22`,
        }}
      >
        <span>{title}</span>
        {headerRight}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}
