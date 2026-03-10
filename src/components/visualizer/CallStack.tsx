import { motion, AnimatePresence } from "framer-motion";
import { Pause } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { THEME } from "@/constants/theme";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import { useAnimationConfig } from "@/hooks/useAnimationConfig";
import type { CallStackFrame } from "@/types";

const TYPE_LABELS: Record<CallStackFrame["type"], string> = {
  global: "global",
  function: "fn",
  method: "method",
  async: "async",
  generator: "gen",
};

export function CallStack() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const hoveredFrameId = useVisualizerStore((s) => s.hoveredFrameId);
  const setHoveredFrameId = useVisualizerStore((s) => s.setHoveredFrameId);
  const { duration, shouldReduceMotion } = useAnimationConfig();

  const frames = currentStep?.callStack ?? [];
  // Stack is displayed top-to-bottom with most recent (top of stack) first
  const reversed = [...frames].reverse();

  return (
    <Panel
      title="Call Stack"
      borderColor={THEME.colors.border.callStack}
      glowEffect={THEME.glow.callStack}
      className="flex-1 min-h-0"
    >
      {reversed.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <span
            className="text-center text-xs"
            style={{
              color: THEME.colors.text.muted,
              fontFamily: THEME.fonts.ui,
            }}
          >
            Run code to see the Call Stack
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {reversed.map((frame) => {
              const color = frame.color ?? THEME.colors.border.callStack;
              const isHovered = hoveredFrameId === frame.id;
              const isSuspended = frame.status === "suspended";
              const suspendedColor = THEME.colors.status.pending; // amber
              return (
                <motion.div
                  key={frame.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, x: -20 }}
                  animate={{
                    opacity: isSuspended ? 0.5 : 1,
                    x: 0,
                    boxShadow: isHovered
                      ? `0 0 12px ${color}50`
                      : "0 0 0px transparent",
                    borderColor: isHovered ? color : `${color}44`,
                  }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, x: 20 }}
                  transition={{ duration: duration.normal, ease: "easeOut" }}
                  className="px-3 py-2 rounded"
                  style={{
                    backgroundColor: THEME.colors.bg.elevated,
                    border: `1px solid ${isHovered ? color : `${color}44`}`,
                    borderLeftWidth: 3,
                    borderLeftColor: isSuspended ? suspendedColor : color,
                    borderLeftStyle: isSuspended ? "dashed" : "solid",
                    color: THEME.colors.text.primary,
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setHoveredFrameId(frame.id)}
                  onMouseLeave={() => setHoveredFrameId(null)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span style={{ color, fontSize: 10, lineHeight: 1 }}>
                        ●
                      </span>
                      <span
                        style={{
                          fontFamily: THEME.fonts.code,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {frame.name}
                      </span>
                      {isSuspended && (
                        <>
                          <Pause
                            size={12}
                            style={{ color: suspendedColor, flexShrink: 0 }}
                          />
                          <span
                            style={{
                              fontSize: 9,
                              fontFamily: THEME.fonts.code,
                              color: suspendedColor,
                              backgroundColor: `${suspendedColor}22`,
                              padding: "1px 5px",
                              borderRadius: 4,
                              flexShrink: 0,
                            }}
                          >
                            suspended
                          </span>
                        </>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: THEME.fonts.code,
                        color,
                        backgroundColor: `${color}22`,
                        padding: "1px 5px",
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                    >
                      {TYPE_LABELS[frame.type]}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: THEME.colors.text.muted,
                      marginTop: 2,
                      fontFamily: THEME.fonts.code,
                    }}
                  >
                    line {frame.line}, col {frame.column}
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
