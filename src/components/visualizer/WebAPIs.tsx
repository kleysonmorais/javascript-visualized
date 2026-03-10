import { motion, AnimatePresence } from "framer-motion";
import { Globe } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { THEME } from "@/constants/theme";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import { useAnimationConfig } from "@/hooks/useAnimationConfig";
import type { WebAPIEntry } from "@/types";

function statusBorderColor(status: WebAPIEntry["status"]): string {
  if (status === "running") return THEME.colors.border.webAPIs;
  if (status === "cancelled") return THEME.colors.status.error;
  return THEME.colors.status.completed;
}

function StatusDot({ status }: { status: WebAPIEntry["status"] }) {
  const color =
    status === "running"
      ? THEME.colors.status.running
      : status === "cancelled"
        ? THEME.colors.status.error
        : THEME.colors.status.completed;

  return (
    <span className="flex items-center gap-1" style={{ fontSize: 11, color }}>
      <span style={{ fontSize: 8 }}>●</span>
      <span
        style={{
          textDecoration: status === "cancelled" ? "line-through" : "none",
        }}
      >
        {status}
      </span>
    </span>
  );
}

export function WebAPIs() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const activeEntries = currentStep?.webAPIs ?? [];
  const { duration, shouldReduceMotion } = useAnimationConfig();

  return (
    <Panel
      title="Web APIs"
      borderColor={THEME.colors.border.webAPIs}
      glowEffect={THEME.glow.webAPIs}
      className="shrink-0"
      scrollable={false}
    >
      {activeEntries.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <span
            className="text-center text-xs"
            style={{
              color: THEME.colors.text.muted,
              fontFamily: THEME.fonts.ui,
            }}
          >
            Web APIs will appear here when the code uses setTimeout, fetch, etc.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {activeEntries.map((entry) => {
              const isCompleted = entry.status === "completed";
              const isCancelled = entry.status === "cancelled";
              const progress =
                entry.delay && entry.elapsed !== undefined
                  ? Math.min(entry.elapsed / entry.delay, 1)
                  : 0;
              const borderColor = statusBorderColor(entry.status);

              const isFetch = entry.type === "fetch";
              const promiseStateColor =
                entry.promiseState === "fulfilled"
                  ? THEME.colors.status.running
                  : entry.promiseState === "rejected"
                    ? THEME.colors.status.error
                    : THEME.colors.status.pending;

              return (
                <motion.div
                  key={entry.id}
                  initial={
                    shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }
                  }
                  animate={{
                    opacity: isCompleted || isCancelled ? 0.5 : 1,
                    scale: 1,
                  }}
                  exit={
                    shouldReduceMotion ? undefined : { opacity: 0, scale: 0.9 }
                  }
                  transition={{ duration: duration.medium }}
                  style={{
                    backgroundColor: THEME.colors.bg.tertiary,
                    border: `1px solid ${borderColor}`,
                    borderRadius: THEME.radius.md,
                    padding: "10px 12px",
                  }}
                >
                  {/* Header */}
                  <div
                    className="flex items-center gap-1 font-bold mb-2"
                    style={{
                      fontFamily: THEME.fonts.code,
                      fontSize: 13,
                      color: THEME.colors.syntax.function,
                    }}
                  >
                    {isFetch && <Globe size={13} style={{ flexShrink: 0 }} />}
                    {entry.type}
                  </div>

                  {/* Detail rows */}
                  <div className="flex flex-col gap-1 mb-2">
                    <div className="flex gap-2">
                      <span
                        style={{
                          fontSize: 11,
                          color: THEME.colors.text.muted,
                          fontFamily: THEME.fonts.code,
                          minWidth: 52,
                          flexShrink: 0,
                        }}
                      >
                        {isFetch ? "url" : "callback"}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: THEME.colors.text.secondary,
                          fontFamily: THEME.fonts.code,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={entry.callback}
                      >
                        {entry.callback.length > 60
                          ? entry.callback.slice(0, 60) + "…"
                          : entry.callback}
                      </span>
                    </div>
                    {entry.delay !== undefined && (
                      <div className="flex gap-2">
                        <span
                          style={{
                            fontSize: 11,
                            color: THEME.colors.text.muted,
                            fontFamily: THEME.fonts.code,
                            minWidth: 52,
                            flexShrink: 0,
                          }}
                        >
                          delay
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: THEME.fonts.code,
                            color: THEME.colors.syntax.number,
                          }}
                        >
                          {entry.delay}ms
                        </span>
                      </div>
                    )}
                    {/* Promise state row for fetch */}
                    {isFetch && entry.promiseState && (
                      <div className="flex gap-2 items-center">
                        <span
                          style={{
                            fontSize: 11,
                            color: THEME.colors.text.muted,
                            fontFamily: THEME.fonts.code,
                            minWidth: 52,
                            flexShrink: 0,
                            fontStyle: "italic",
                          }}
                        >
                          [[Promise]]
                        </span>
                        <span
                          className="flex items-center gap-1"
                          style={{
                            fontSize: 11,
                            fontFamily: THEME.fonts.code,
                            color: promiseStateColor,
                          }}
                        >
                          <span style={{ fontSize: 8 }}>●</span>
                          {entry.promiseState}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  {entry.status === "running" &&
                    entry.delay !== undefined &&
                    entry.delay > 0 && (
                      <div
                        style={{
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: THEME.colors.bg.primary,
                          overflow: "hidden",
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${progress * 100}%`,
                            backgroundColor: isFetch
                              ? THEME.colors.border.webAPIs
                              : THEME.colors.status.running,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    )}

                  {/* Status badge */}
                  <div className="flex justify-between items-center">
                    {entry.elapsed !== undefined &&
                      entry.status === "running" && (
                        <span
                          style={{
                            fontSize: 10,
                            color: THEME.colors.text.muted,
                            fontFamily: THEME.fonts.code,
                          }}
                        >
                          elapsed: {entry.elapsed}ms
                        </span>
                      )}
                    <div className="ml-auto">
                      <StatusDot status={entry.status} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </Panel>
  );
}
