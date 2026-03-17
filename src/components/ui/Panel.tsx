import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { THEME } from "@/constants/theme";

interface PanelProps {
  title?: string;
  className?: string;
  headerRight?: ReactNode;
  headerLeft?: ReactNode;
  children: ReactNode;
  scrollable?: boolean;
}

export function Panel({
  title,
  className = "",
  headerRight,
  headerLeft,
  children,
  scrollable = true,
}: PanelProps) {
  return (
    <div
      className={`relative flex flex-col rounded-lg border-2 min-h-0 ${className}`}
      style={{
        backgroundColor: "#12121a",
        borderColor: THEME.colors.border.primary,
      }}
    >
      <div
        className={`px-3 py-2 text-xs font-semibold uppercase tracking-widest flex items-center justify-between shrink-0`}
        style={{
          color: "white",
          borderBottom: `1px solid ${THEME.colors.border.primary}`,
        }}
      >
        <span className="flex items-center gap-3">
          {title}

          {headerLeft && (
            <div
              style={{
                textTransform: "none",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {headerLeft}
            </div>
          )}
        </span>

        {headerRight && (
          <div onClick={(e) => e.stopPropagation()}>{headerRight}</div>
        )}
      </div>

      <AnimatePresence initial={false}>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="overflow-hidden flex-1 min-h-0"
        >
          <div className={`p-3 h-full ${scrollable ? "overflow-y-auto" : ""}`}>
            {children}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
