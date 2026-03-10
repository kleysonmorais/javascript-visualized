import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { THEME } from "@/constants/theme";

interface PanelProps {
  title: string;
  className?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  scrollable?: boolean;
  /** Enables the collapse/expand feature */
  collapsible?: boolean;
  /** Start collapsed (useful for mobile) */
  defaultCollapsed?: boolean;
}

export function Panel({
  title,
  className = "",
  headerRight,
  children,
  scrollable = true,
  collapsible = false,
  defaultCollapsed = false,
}: PanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const handleHeaderClick = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div
      className={`relative flex flex-col rounded-lg border-2 ${isCollapsed ? "" : "min-h-0"} ${className}`}
      style={{
        backgroundColor: "#12121a",
        borderColor: THEME.colors.border.primary,
      }}
    >
      <div
        className={`px-3 py-2 text-xs font-semibold uppercase tracking-widest flex items-center justify-between shrink-0 ${collapsible ? "cursor-pointer select-none" : ""}`}
        style={{
          color: "white",
          borderBottom: isCollapsed
            ? "none"
            : `1px solid ${THEME.colors.border.primary}`,
        }}
        onClick={handleHeaderClick}
        onTouchStart={collapsible ? handleHeaderClick : undefined}
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleHeaderClick();
                }
              }
            : undefined
        }
      >
        <span className="flex items-center gap-2">
          {collapsible && (
            <motion.span
              animate={{ rotate: isCollapsed ? -90 : 0 }}
              transition={{ duration: 0.2 }}
              className="inline-flex"
            >
              <ChevronDown size={14} />
            </motion.span>
          )}
          {title}
        </span>
        {headerRight && (
          <div onClick={(e) => e.stopPropagation()}>{headerRight}</div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden flex-1 min-h-0"
          >
            <div
              className={`p-3 h-full ${scrollable ? "overflow-y-auto" : ""}`}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
